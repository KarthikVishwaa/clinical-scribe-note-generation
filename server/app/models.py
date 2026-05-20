from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    specialty = Column(String)  # e.g., "General Practice", "Cardiology"
    clinic_name = Column(String)
    clinic_address = Column(String)
    phone = Column(String)
    license_number = Column(String)
    is_active = Column(Boolean, default=True)
    # Budget control
    daily_budget_usd = Column(Float, default=1.0)
    monthly_budget_usd = Column(Float, default=5.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    encounters = relationship("Encounter", back_populates="user")
    patients = relationship("Patient", back_populates="user")
    reminders = relationship("FollowUpReminder", back_populates="user")
    api_usage = relationship("APIUsage", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mrn = Column(String, index=True)  # Medical Record Number
    first_name = Column(String, nullable=False)
    last_name = Column(String)
    date_of_birth = Column(String)  # YYYY-MM-DD
    gender = Column(String)  # male / female / other
    phone = Column(String)
    email = Column(String)
    address = Column(Text)
    allergies = Column(Text)        # free-text allergy list
    current_medications = Column(Text)
    medical_history = Column(Text)
    blood_type = Column(String)
    emergency_contact = Column(String)
    insurance_info = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="patients")
    encounters = relationship("Encounter", back_populates="patient")


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_db_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    patient_name = Column(String)
    patient_id = Column(String)
    chief_complaint = Column(String)
    status = Column(String, default="recording")  # recording, processing, completed
    language = Column(String, default="en")  # ISO language code for transcription
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="encounters")
    patient = relationship("Patient", back_populates="encounters")
    transcripts = relationship("Transcript", back_populates="encounter", order_by="Transcript.created_at")
    soap_notes = relationship("SOAPNote", back_populates="encounter")
    medical_entities = relationship("MedicalEntity", back_populates="encounter")
    prescriptions = relationship("Prescription", back_populates="encounter")
    referral_letters = relationship("ReferralLetter", back_populates="encounter")
    reminders = relationship("FollowUpReminder", back_populates="encounter")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    text = Column(Text, nullable=False)
    speaker = Column(String)  # doctor / patient / unknown
    confidence = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="transcripts")


class SOAPNote(Base):
    __tablename__ = "soap_notes"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    subjective = Column(Text)
    objective = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    is_finalized = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    encounter = relationship("Encounter", back_populates="soap_notes")


class MedicalEntity(Base):
    __tablename__ = "medical_entities"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    entity_text = Column(String, nullable=False)
    entity_type = Column(String)  # medication, symptom, diagnosis, procedure, anatomy
    normalized_term = Column(String)
    icd_code = Column(String)
    snomed_code = Column(String)
    context = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="medical_entities")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    patient_name = Column(String)
    doctor_name = Column(String)
    clinic_name = Column(String)
    medications_json = Column(Text)  # JSON array of medication objects
    diagnosis = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="prescriptions")


class ReferralLetter(Base):
    __tablename__ = "referral_letters"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    referring_doctor = Column(String)
    specialist_type = Column(String)
    specialist_name = Column(String)
    reason = Column(Text)
    letter_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="referral_letters")


class FollowUpReminder(Base):
    __tablename__ = "follow_up_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    patient_name = Column(String)
    reminder_text = Column(Text, nullable=False)
    due_date = Column(String)  # YYYY-MM-DD
    priority = Column(String, default="normal")  # urgent / normal / low
    is_done = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reminders")
    encounter = relationship("Encounter", back_populates="reminders")


class APIUsage(Base):
    """Tracks every AI API call for cost monitoring and budget enforcement."""
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service = Column(String, nullable=False)   # openai_whisper | openai_gpt | anthropic_claude
    endpoint = Column(String, nullable=False)  # soap_note | prescription | diagnosis | etc.
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    audio_minutes = Column(Float, default=0.0)
    estimated_cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_usage")
