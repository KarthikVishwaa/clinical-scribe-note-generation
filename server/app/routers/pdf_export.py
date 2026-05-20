from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Encounter, SOAPNote, MedicalEntity
from ..auth import get_current_user
from ..services.pdf_service import generate_soap_pdf

router = APIRouter(prefix="/api/encounters", tags=["pdf"])


@router.get("/{encounter_id}/export-pdf")
def export_encounter_pdf(
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
    entities = db.query(MedicalEntity).filter(MedicalEntity.encounter_id == encounter_id).all()

    encounter_dict = {
        "patient_name": encounter.patient_name or "Unknown Patient",
        "patient_id": encounter.patient_id or "—",
        "chief_complaint": encounter.chief_complaint or "—",
    }

    soap_dict = {}
    if soap:
        soap_dict = {
            "subjective": soap.subjective or "",
            "objective": soap.objective or "",
            "assessment": soap.assessment or "",
            "plan": soap.plan or "",
        }

    entities_list = [
        {
            "entity_text": e.entity_text,
            "entity_type": e.entity_type,
            "normalized_term": e.normalized_term,
            "icd_code": e.icd_code,
            "snomed_code": e.snomed_code,
        }
        for e in entities
    ]

    doctor_info = {
        "full_name": user.full_name or "Doctor",
        "specialty": user.specialty or "",
        "clinic_name": user.clinic_name or "Medical Clinic",
        "clinic_address": user.clinic_address or "",
        "phone": user.phone or "",
        "license_number": user.license_number or "",
    }

    try:
        pdf_bytes = generate_soap_pdf(encounter_dict, soap_dict, entities_list, doctor_info)
        patient_name_safe = (encounter.patient_name or "encounter").replace(" ", "_")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="soap_{patient_name_safe}_{encounter_id}.pdf"'}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
