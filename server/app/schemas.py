from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ───────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    clinic_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    specialty: Optional[str]
    clinic_name: Optional[str]
    clinic_address: Optional[str]
    phone: Optional[str]
    license_number: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Patient ─────────────────────────────────────────────────────────────────
class PatientCreate(BaseModel):
    mrn: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    insurance_info: Optional[str] = None
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    mrn: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    insurance_info: Optional[str] = None
    notes: Optional[str] = None


class PatientOut(BaseModel):
    id: int
    mrn: Optional[str]
    first_name: str
    last_name: Optional[str]
    date_of_birth: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    allergies: Optional[str]
    current_medications: Optional[str]
    medical_history: Optional[str]
    blood_type: Optional[str]
    emergency_contact: Optional[str]
    insurance_info: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PatientSummary(BaseModel):
    id: int
    mrn: Optional[str]
    first_name: str
    last_name: Optional[str]
    date_of_birth: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Encounter ───────────────────────────────────────────────────────────────
class EncounterCreate(BaseModel):
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    patient_db_id: Optional[int] = None
    chief_complaint: Optional[str] = None
    language: Optional[str] = "en"


class EncounterUpdate(BaseModel):
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    chief_complaint: Optional[str] = None
    status: Optional[str] = None
    language: Optional[str] = None


class TranscriptOut(BaseModel):
    id: int
    text: str
    speaker: Optional[str]
    confidence: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SOAPNoteOut(BaseModel):
    id: int
    subjective: Optional[str]
    objective: Optional[str]
    assessment: Optional[str]
    plan: Optional[str]
    is_finalized: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SOAPNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    is_finalized: Optional[bool] = None


class MedicalEntityOut(BaseModel):
    id: int
    entity_text: str
    entity_type: Optional[str]
    normalized_term: Optional[str]
    icd_code: Optional[str]
    snomed_code: Optional[str]
    context: Optional[str]

    class Config:
        from_attributes = True


class EncounterOut(BaseModel):
    id: int
    patient_name: Optional[str]
    patient_id: Optional[str]
    patient_db_id: Optional[int]
    chief_complaint: Optional[str]
    status: str
    language: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    transcripts: List[TranscriptOut] = []
    soap_notes: List[SOAPNoteOut] = []
    medical_entities: List[MedicalEntityOut] = []

    class Config:
        from_attributes = True


class EncounterSummary(BaseModel):
    id: int
    patient_name: Optional[str]
    patient_id: Optional[str]
    chief_complaint: Optional[str]
    status: str
    language: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Prescription ────────────────────────────────────────────────────────────
class PrescriptionOut(BaseModel):
    id: int
    encounter_id: int
    patient_name: Optional[str]
    doctor_name: Optional[str]
    clinic_name: Optional[str]
    medications_json: Optional[str]
    diagnosis: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Referral Letter ─────────────────────────────────────────────────────────
class ReferralCreate(BaseModel):
    specialist_type: str
    specialist_name: Optional[str] = None
    reason: Optional[str] = None


class ReferralOut(BaseModel):
    id: int
    encounter_id: int
    referring_doctor: Optional[str]
    specialist_type: Optional[str]
    specialist_name: Optional[str]
    reason: Optional[str]
    letter_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Follow-up Reminder ──────────────────────────────────────────────────────
class ReminderOut(BaseModel):
    id: int
    encounter_id: int
    patient_name: Optional[str]
    reminder_text: str
    due_date: Optional[str]
    priority: Optional[str]
    is_done: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderUpdate(BaseModel):
    is_done: Optional[bool] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None


# ─── AI Feature Requests ─────────────────────────────────────────────────────
class DrugInteractionRequest(BaseModel):
    drugs: List[str]


class DiffDiagnosisRequest(BaseModel):
    symptoms: str
    history: Optional[str] = None
    vitals: Optional[str] = None


class LabInterpretRequest(BaseModel):
    lab_text: str
    patient_context: Optional[str] = None


class ReferralRequest(BaseModel):
    specialist_type: str
    specialist_name: Optional[str] = None
    additional_notes: Optional[str] = None
