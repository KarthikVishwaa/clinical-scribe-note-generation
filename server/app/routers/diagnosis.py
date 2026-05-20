from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import DiffDiagnosisRequest
from ..auth import get_current_user
from ..services.diagnosis_service import generate_differential_diagnosis
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai

router = APIRouter(prefix="/api/ai", tags=["ai-tools"])


@router.post("/differential-diagnosis")
async def differential_diagnosis(
    data: DiffDiagnosisRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not data.symptoms or len(data.symptoms.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please provide symptom details.")
    if len(data.symptoms) > 2000:
        raise HTTPException(status_code=400, detail="Symptom text too long (max 2000 characters).")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)

    result = await generate_differential_diagnosis(
        symptoms=data.symptoms,
        history=data.history or "",
        vitals=data.vitals or "",
        db=db,
        user_id=user.id,
    )
    return result
