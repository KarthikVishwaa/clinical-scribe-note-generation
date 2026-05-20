from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Patient, Encounter
from ..schemas import PatientCreate, PatientUpdate, PatientOut, PatientSummary, EncounterSummary
from ..auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    patient = Patient(user_id=user.id, **data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=List[PatientSummary])
def list_patients(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    q = db.query(Patient).filter(Patient.user_id == user.id)
    if search:
        s = f"%{search}%"
        q = q.filter(
            Patient.first_name.ilike(s) |
            Patient.last_name.ilike(s) |
            Patient.mrn.ilike(s) |
            Patient.phone.ilike(s)
        )
    return q.order_by(Patient.created_at.desc()).all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id, Patient.user_id == user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id, Patient.user_id == user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id, Patient.user_id == user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()


@router.get("/{patient_id}/encounters", response_model=List[EncounterSummary])
def get_patient_encounters(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id, Patient.user_id == user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return (
        db.query(Encounter)
        .filter(Encounter.patient_db_id == patient_id, Encounter.user_id == user.id)
        .order_by(Encounter.created_at.desc())
        .all()
    )
