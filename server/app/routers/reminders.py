from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Encounter, SOAPNote, FollowUpReminder
from ..schemas import ReminderOut, ReminderUpdate
from ..auth import get_current_user
from ..services.referral_service import generate_followup_reminders
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai

router = APIRouter(prefix="/api", tags=["reminders"])


@router.post("/encounters/{encounter_id}/reminders", response_model=List[ReminderOut])
async def generate_reminders(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    soap = db.query(SOAPNote).filter(SOAPNote.encounter_id == encounter_id).first()
    if not soap or not soap.plan:
        raise HTTPException(status_code=400, detail="No SOAP plan available to extract reminders from.")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)

    reminders_data = await generate_followup_reminders(
        soap_plan=soap.plan,
        patient_name=encounter.patient_name or "Unknown",
        db=db,
        user_id=user.id,
    )

    # Delete existing reminders for this encounter
    db.query(FollowUpReminder).filter(FollowUpReminder.encounter_id == encounter_id).delete()

    reminders = []
    for r in reminders_data:
        reminder = FollowUpReminder(
            user_id=user.id,
            encounter_id=encounter_id,
            patient_name=encounter.patient_name,
            reminder_text=r.get("reminder_text", ""),
            due_date=r.get("due_date"),
            priority=r.get("priority", "normal"),
        )
        db.add(reminder)
        reminders.append(reminder)

    db.commit()
    for r in reminders:
        db.refresh(r)
    return reminders


@router.get("/encounters/{encounter_id}/reminders", response_model=List[ReminderOut])
def get_reminders(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return db.query(FollowUpReminder).filter(
        FollowUpReminder.encounter_id == encounter_id
    ).order_by(FollowUpReminder.due_date).all()


@router.get("/reminders", response_model=List[ReminderOut])
def list_all_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all reminders for the logged-in doctor."""
    return (
        db.query(FollowUpReminder)
        .filter(FollowUpReminder.user_id == user.id)
        .order_by(FollowUpReminder.is_done, FollowUpReminder.due_date)
        .all()
    )


@router.patch("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    reminder = db.query(FollowUpReminder).filter(
        FollowUpReminder.id == reminder_id,
        FollowUpReminder.user_id == user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder
