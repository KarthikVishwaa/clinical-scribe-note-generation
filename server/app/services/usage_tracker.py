from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from ..models import APIUsage, User

PRICING = {
    "openai_gpt": {
        "input_per_token":  0.15  / 1_000_000,
        "output_per_token": 0.60  / 1_000_000,
    },
    "openai_whisper": {
        "per_minute": 0.006,
    },
    "anthropic_claude": {
        "input_per_token":  0.25  / 1_000_000,
        "output_per_token": 1.25  / 1_000_000,
    },
}

SERVICE_LABELS = {
    "openai_gpt":       "GPT-4o-mini (SOAP notes)",
    "openai_whisper":   "Whisper (Transcription)",
    "anthropic_claude": "Claude Haiku (AI features)",
}

DEFAULT_DAILY_BUDGET   = 1.0
DEFAULT_MONTHLY_BUDGET = 5.0


def calculate_cost(
    service: str,
    tokens_input: int = 0,
    tokens_output: int = 0,
    audio_minutes: float = 0.0,
) -> float:
    p = PRICING.get(service, {})
    if service == "openai_whisper":
        cost = audio_minutes * p.get("per_minute", 0.006)
    else:
        cost = (tokens_input * p.get("input_per_token", 0)) + \
               (tokens_output * p.get("output_per_token", 0))
    return round(cost, 6)


def log_usage(
    db: Session,
    user_id: int,
    service: str,
    endpoint: str,
    tokens_input: int = 0,
    tokens_output: int = 0,
    audio_minutes: float = 0.0,
) -> float:
    cost = calculate_cost(service, tokens_input, tokens_output, audio_minutes)
    record = APIUsage(
        user_id=user_id,
        service=service,
        endpoint=endpoint,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        audio_minutes=audio_minutes,
        estimated_cost_usd=cost,
    )
    db.add(record)
    db.commit()
    return cost


def check_budget(db: Session, user_id: int, estimated_new_cost: float = 0.02) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    daily_limit   = user.daily_budget_usd   or DEFAULT_DAILY_BUDGET
    monthly_limit = user.monthly_budget_usd or DEFAULT_MONTHLY_BUDGET

    now = datetime.utcnow()
    day_start   = now.replace(hour=0,  minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1,   hour=0,  minute=0, second=0, microsecond=0)

    daily_spent = db.query(func.sum(APIUsage.estimated_cost_usd)).filter(
        APIUsage.user_id == user_id,
        APIUsage.created_at >= day_start,
    ).scalar() or 0.0

    monthly_spent = db.query(func.sum(APIUsage.estimated_cost_usd)).filter(
        APIUsage.user_id == user_id,
        APIUsage.created_at >= month_start,
    ).scalar() or 0.0

    if daily_spent + estimated_new_cost > daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI budget of ${daily_limit:.2f} reached "
                   f"(spent: ${daily_spent:.4f}). Resets at midnight UTC.",
        )

    if monthly_spent + estimated_new_cost > monthly_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly AI budget of ${monthly_limit:.2f} reached "
                   f"(spent: ${monthly_spent:.4f}).",
        )


def get_usage_stats(db: Session, user_id: int) -> dict:
    now = datetime.utcnow()
    day_start   = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1,  hour=0,  minute=0, second=0, microsecond=0)

    user = db.query(User).filter(User.id == user_id).first()

    daily_rows = (
        db.query(APIUsage.service, func.count(APIUsage.id), func.sum(APIUsage.estimated_cost_usd))
        .filter(APIUsage.user_id == user_id, APIUsage.created_at >= day_start)
        .group_by(APIUsage.service)
        .all()
    )
    monthly_rows = (
        db.query(APIUsage.service, func.count(APIUsage.id), func.sum(APIUsage.estimated_cost_usd))
        .filter(APIUsage.user_id == user_id, APIUsage.created_at >= month_start)
        .group_by(APIUsage.service)
        .all()
    )

    def to_list(rows):
        return [
            {
                "service":  r[0],
                "label":    SERVICE_LABELS.get(r[0], r[0]),
                "calls":    r[1],
                "cost_usd": round(r[2] or 0, 4),
            }
            for r in rows
        ]

    daily_cost    = sum(r[2] or 0 for r in daily_rows)
    monthly_cost  = sum(r[2] or 0 for r in monthly_rows)
    daily_budget  = user.daily_budget_usd   if user else DEFAULT_DAILY_BUDGET
    monthly_budget= user.monthly_budget_usd if user else DEFAULT_MONTHLY_BUDGET

    return {
        "daily": {
            "cost_usd":        round(daily_cost, 4),
            "calls":           sum(r[1] for r in daily_rows),
            "budget_usd":      daily_budget,
            "budget_used_pct": min(100, round(daily_cost / max(daily_budget, 0.001) * 100, 1)),
            "breakdown":       to_list(daily_rows),
        },
        "monthly": {
            "cost_usd":        round(monthly_cost, 4),
            "calls":           sum(r[1] for r in monthly_rows),
            "budget_usd":      monthly_budget,
            "budget_used_pct": min(100, round(monthly_cost / max(monthly_budget, 0.001) * 100, 1)),
            "breakdown":       to_list(monthly_rows),
        },
    }
