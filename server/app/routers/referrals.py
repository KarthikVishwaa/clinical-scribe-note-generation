from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Encounter, SOAPNote, ReferralLetter
from ..schemas import ReferralOut, ReferralRequest
from ..auth import get_current_user
from ..services.referral_service import generate_referral_letter
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai

router = APIRouter(prefix="/api/encounters", tags=["referrals"])


@router.post("/{encounter_id}/referral", response_model=ReferralOut)
async def create_referral(
    encounter_id: int,
    data: ReferralRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    soap = db.query(SOAPNote).filter(SOAPNote.encounter_id == encounter_id).first()
    soap_dict = {}
    if soap:
        soap_dict = {
            "subjective": soap.subjective or "",
            "objective": soap.objective or "",
            "assessment": soap.assessment or "",
            "plan": soap.plan or "",
        }

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.002)

    result = await generate_referral_letter(
        specialist_type=data.specialist_type,
        specialist_name=data.specialist_name or "",
        soap_note=soap_dict,
        patient_name=encounter.patient_name or "Unknown",
        doctor_name=user.full_name or "Doctor",
        clinic_name=user.clinic_name or "Medical Clinic",
        additional_notes=data.additional_notes or "",
        db=db,
        user_id=user.id,
    )

    referral = ReferralLetter(
        encounter_id=encounter_id,
        referring_doctor=user.full_name,
        specialist_type=data.specialist_type,
        specialist_name=data.specialist_name,
        reason=data.additional_notes,
        letter_text=result.get("letter_text", ""),
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral


@router.get("/{encounter_id}/referral", response_model=ReferralOut)
def get_referral(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    referral = db.query(ReferralLetter).filter(
        ReferralLetter.encounter_id == encounter_id
    ).order_by(ReferralLetter.created_at.desc()).first()
    if not referral:
        raise HTTPException(status_code=404, detail="No referral letter found")
    return referral
