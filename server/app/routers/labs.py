from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import LabInterpretRequest
from ..auth import get_current_user
from ..services.lab_service import interpret_lab_results
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai

router = APIRouter(prefix="/api/ai", tags=["ai-tools"])


@router.post("/lab-interpretation")
async def lab_interpretation(
    data: LabInterpretRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not data.lab_text or len(data.lab_text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide lab result text.")
    if len(data.lab_text) > 3000:
        raise HTTPException(status_code=400, detail="Lab text too long (max 3000 characters).")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)

    result = await interpret_lab_results(
        lab_text=data.lab_text,
        patient_context=data.patient_context or "",
        db=db,
        user_id=user.id,
    )
    return result
