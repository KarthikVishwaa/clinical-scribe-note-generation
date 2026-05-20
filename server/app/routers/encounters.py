from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Encounter, Transcript, SOAPNote, MedicalEntity
from ..schemas import (
    EncounterCreate, EncounterUpdate, EncounterOut, EncounterSummary,
    SOAPNoteUpdate, SOAPNoteOut, MedicalEntityOut, TranscriptOut
)
from ..auth import get_current_user
from ..services.whisper_service import transcribe_audio
from ..services.gpt_service import generate_soap_note
from ..services.claude_service import extract_medical_entities
from ..services.usage_tracker import check_budget
from ..rate_limiter import rate_limit_ai, rate_limit_general

router = APIRouter(prefix="/api/encounters", tags=["encounters"])


DEMO_ENCOUNTER_LIMIT = 2  # LinkedIn showcase — keep infra costs low

@router.post("", response_model=EncounterOut, status_code=201)
def create_encounter(
    data: EncounterCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rate_limit_general(user.id)

    # Enforce per-user demo limit
    existing_count = db.query(Encounter).filter(Encounter.user_id == user.id).count()
    if existing_count >= DEMO_ENCOUNTER_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"Demo limit reached: each account may create up to {DEMO_ENCOUNTER_LIMIT} encounters. "
                   "This is a showcase deployment — please register a new account to try again.",
        )

    encounter = Encounter(
        user_id=user.id,
        patient_name=data.patient_name,
        patient_id=data.patient_id,
        chief_complaint=data.chief_complaint,
        status="recording",
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    return encounter


@router.get("", response_model=List[EncounterSummary])
def list_encounters(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Encounter)
        .filter(Encounter.user_id == user.id)
        .order_by(Encounter.created_at.desc())
        .all()
    )


@router.get("/{encounter_id}", response_model=EncounterOut)
def get_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return encounter


@router.patch("/{encounter_id}", response_model=EncounterOut)
def update_encounter(
    encounter_id: int,
    data: EncounterUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(encounter, field, value)
    db.commit()
    db.refresh(encounter)
    return encounter


@router.post("/{encounter_id}/transcribe")
async def transcribe_encounter_audio(
    encounter_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.006)  # ~1 min of Whisper

    audio_bytes = await audio.read()
    result = await transcribe_audio(
        audio_bytes,
        filename=audio.filename or "audio.webm",
        db=db,
        user_id=user.id,
    )

    transcript = Transcript(
        encounter_id=encounter_id,
        text=result["text"],
        confidence=result.get("confidence", "high"),
    )
    db.add(transcript)
    encounter.status = "processing"
    db.commit()
    db.refresh(transcript)

    return {"transcript": result["text"], "transcript_id": transcript.id}


@router.post("/{encounter_id}/generate-soap", response_model=SOAPNoteOut)
async def generate_soap(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    full_transcript = " ".join(t.text for t in encounter.transcripts)
    if not full_transcript.strip():
        raise HTTPException(status_code=400, detail="No transcript available")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)  # ~2000 tokens GPT-4o-mini

    soap_data = await generate_soap_note(
        full_transcript,
        encounter.chief_complaint or "",
        db=db,
        user_id=user.id,
    )

    existing = db.query(SOAPNote).filter(SOAPNote.encounter_id == encounter_id).first()
    if existing:
        for k, v in soap_data.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    soap = SOAPNote(encounter_id=encounter_id, **soap_data)
    db.add(soap)
    encounter.status = "completed"
    db.commit()
    db.refresh(soap)
    return soap


@router.patch("/{encounter_id}/soap", response_model=SOAPNoteOut)
def update_soap(
    encounter_id: int,
    data: SOAPNoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    soap = db.query(SOAPNote).filter(SOAPNote.encounter_id == encounter_id).first()
    if not soap:
        raise HTTPException(status_code=404, detail="SOAP note not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(soap, field, value)
    db.commit()
    db.refresh(soap)
    return soap


@router.post("/{encounter_id}/extract-entities", response_model=List[MedicalEntityOut])
async def extract_entities(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.user_id == user.id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")

    full_transcript = " ".join(t.text for t in encounter.transcripts)
    if not full_transcript.strip():
        raise HTTPException(status_code=400, detail="No transcript available")

    rate_limit_ai(user.id)
    check_budget(db, user.id, estimated_new_cost=0.001)

    entities_data = await extract_medical_entities(full_transcript)

    db.query(MedicalEntity).filter(MedicalEntity.encounter_id == encounter_id).delete()
    entities = []
    for e in entities_data:
        entity = MedicalEntity(
            encounter_id=encounter_id,
            entity_text=e.get("entity_text", ""),
            entity_type=e.get("entity_type"),
            normalized_term=e.get("normalized_term"),
            icd_code=e.get("icd_code"),
            snomed_code=e.get("snomed_code"),
            context=e.get("context"),
        )
        db.add(entity)
        entities.append(entity)

    db.commit()
    for entity in entities:
        db.refresh(entity)
    return entities
