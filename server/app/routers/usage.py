"""
Usage & billing dashboard API.

GET  /api/usage/stats      — daily + monthly totals and breakdown by service
GET  /api/usage/history    — paginated list of individual API calls
PATCH /api/usage/budget    — update daily / monthly budget limits
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import User, APIUsage
from ..auth import get_current_user
from ..services.usage_tracker import get_usage_stats, SERVICE_LABELS

router = APIRouter(prefix="/api/usage", tags=["usage"])


class BudgetUpdate(BaseModel):
    daily_budget_usd: Optional[float] = None
    monthly_budget_usd: Optional[float] = None


@router.get("/stats")
def usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return today + this month aggregated cost and call counts."""
    return get_usage_stats(db, current_user.id)


@router.get("/history")
def usage_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated list of individual API calls, newest first."""
    total = (
        db.query(APIUsage)
        .filter(APIUsage.user_id == current_user.id)
        .count()
    )
    rows = (
        db.query(APIUsage)
        .filter(APIUsage.user_id == current_user.id)
        .order_by(APIUsage.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [
            {
                "id":             r.id,
                "service":        r.service,
                "service_label":  SERVICE_LABELS.get(r.service, r.service),
                "endpoint":       r.endpoint,
                "tokens_input":   r.tokens_input,
                "tokens_output":  r.tokens_output,
                "audio_minutes":  r.audio_minutes,
                "cost_usd":       round(r.estimated_cost_usd, 6),
                "created_at":     r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.patch("/budget")
def update_budget(
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the user's daily and/or monthly AI budget caps."""
    if data.daily_budget_usd is not None:
        current_user.daily_budget_usd = max(0.0, data.daily_budget_usd)
    if data.monthly_budget_usd is not None:
        current_user.monthly_budget_usd = max(0.0, data.monthly_budget_usd)
    db.commit()
    db.refresh(current_user)
    return {
        "daily_budget_usd":   current_user.daily_budget_usd,
        "monthly_budget_usd": current_user.monthly_budget_usd,
    }
