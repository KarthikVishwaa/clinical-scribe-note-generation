from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import User, Encounter, SOAPNote, Prescription
from ..schemas import PrescriptionOut
from ..auth import get_current_user
from ..services.prescription_service import generate_prescription
from ..services.pdf_service import generate_prescription_pdf
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai
import json


class PrescriptionUpdate(BaseModel):
    medications: List[dict]

router = APIRouter(prefix="/api/encounters", tags=["prescriptions"])


@router.post("/{encounter_id}/prescription", response_model=PrescriptionOut)
async def create_prescription(
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
    if not soap:
        raise HTTPException(status_code=400, detail="No SOAP note found. Generate a SOAP note first.")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)

    rx_data = await generate_prescription(
        soap_plan=soap.plan or "",
        soap_assessment=soap.assessment or "",
        patient_name=encounter.patient_name or "Unknown",
        doctor_name=user.full_name or "Doctor",
        db=db,
        user_id=user.id,
    )

    prescription = Prescription(
        encounter_id=encounter_id,
        patient_name=encounter.patient_name,
        doctor_name=user.full_name,
        clinic_name=user.clinic_name,
        medications_json=json.dumps(rx_data.get("medications", [])),
        diagnosis=rx_data.get("diagnosis", ""),
        notes=rx_data.get("special_instructions", ""),
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription


@router.patch("/{encounter_id}/prescription")
def update_prescription_medications(
    encounter_id: int,
    data: PrescriptionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Save doctor-edited medication list back to the database."""
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    prescription = db.query(Prescription).filter(
        Prescription.encounter_id == encounter_id
    ).order_by(Prescription.created_at.desc()).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="No prescription found. Generate one first.")

    prescription.medications_json = json.dumps(data.medications)
    db.commit()
    db.refresh(prescription)
    return {"ok": True, "medications_count": len(data.medications)}


@router.get("/{encounter_id}/prescription", response_model=PrescriptionOut)
def get_prescription(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    prescription = db.query(Prescription).filter(
        Prescription.encounter_id == encounter_id
    ).order_by(Prescription.created_at.desc()).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="No prescription found")
    return prescription


@router.get("/{encounter_id}/prescription/pdf")
def download_prescription_pdf(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    encounter = db.query(Encounter).filter(
        Encounter.id == encounter_id, Encounter.user_id == user.id
    ).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    prescription = db.query(Prescription).filter(
        Prescription.encounter_id == encounter_id
    ).order_by(Prescription.created_at.desc()).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="No prescription found. Generate one first.")

    doctor_info = {
        "full_name": user.full_name or "Doctor",
        "specialty": user.specialty or "",
        "clinic_name": user.clinic_name or "Medical Clinic",
        "clinic_address": user.clinic_address or "",
        "phone": user.phone or "",
        "license_number": user.license_number or "",
    }

    prescription_dict = {
        "patient_name": prescription.patient_name,
        "doctor_name": prescription.doctor_name,
        "clinic_name": prescription.clinic_name,
        "medications_json": prescription.medications_json,
        "diagnosis": prescription.diagnosis,
        "notes": prescription.notes,
    }

    try:
        pdf_bytes = generate_prescription_pdf(prescription_dict, doctor_info)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="prescription_{encounter_id}.pdf"'}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
