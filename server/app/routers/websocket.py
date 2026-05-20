import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..database import SessionLocal
from ..models import User, Encounter, Transcript, SOAPNote, MedicalEntity
from ..config import settings
from ..services.whisper_service import transcribe_audio
from ..services.gpt_service import generate_soap_note
from ..services.claude_service import extract_medical_entities
from jose import JWTError, jwt

router = APIRouter()


def get_user_from_token(token: str, db):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    except JWTError:
        return None


@router.websocket("/ws/encounter/{encounter_id}")
async def encounter_websocket(
    websocket: WebSocket,
    encounter_id: int,
    token: str = Query(...),
):
    await websocket.accept()

    db = SessionLocal()
    try:
        user = get_user_from_token(token, db)
        if not user:
            await websocket.send_json({"type": "error", "message": "Unauthorized"})
            await websocket.close(code=1008)
            return

        encounter = db.query(Encounter).filter(
            Encounter.id == encounter_id,
            Encounter.user_id == user.id
        ).first()

        if not encounter:
            await websocket.send_json({"type": "error", "message": "Encounter not found"})
            await websocket.close(code=1008)
            return

        await websocket.send_json({"type": "connected", "encounter_id": encounter_id})

        audio_chunks: list[bytes] = []

        while True:
            message = await websocket.receive()

            if "bytes" in message:
                audio_chunks.append(message["bytes"])
                await websocket.send_json({"type": "audio_received", "chunks": len(audio_chunks)})

            elif "text" in message:
                data = json.loads(message["text"])
                cmd = data.get("command")

                if cmd == "transcribe":
                    if not audio_chunks:
                        await websocket.send_json({"type": "error", "message": "No audio data received"})
                        continue

                    language = data.get("language", "en")
                    # Use the file extension the client detected from MediaRecorder mimeType
                    file_ext = data.get("file_ext", ".webm")
                    filename  = f"audio{file_ext}"

                    await websocket.send_json({"type": "status", "message": "Transcribing audio..."})
                    combined = b"".join(audio_chunks)
                    audio_chunks.clear()

                    try:
                        result = await transcribe_audio(combined, filename, language=language)
                        transcript_text = result["text"]

                        transcript = Transcript(
                            encounter_id=encounter_id,
                            text=transcript_text,
                            confidence=result.get("confidence", "high"),
                        )
                        db.add(transcript)
                        encounter.status = "processing"
                        db.commit()

                        await websocket.send_json({
                            "type": "transcript",
                            "text": transcript_text,
                            "transcript_id": transcript.id,
                        })

                        # Generate SOAP note
                        await websocket.send_json({"type": "status", "message": "Generating SOAP note..."})
                        db.refresh(encounter)
                        full_text = " ".join(t.text for t in encounter.transcripts)
                        soap_data = await generate_soap_note(full_text, encounter.chief_complaint or "")

                        existing_soap = db.query(SOAPNote).filter(SOAPNote.encounter_id == encounter_id).first()
                        if existing_soap:
                            for k, v in soap_data.items():
                                setattr(existing_soap, k, v)
                            db.commit()
                        else:
                            soap = SOAPNote(encounter_id=encounter_id, **soap_data)
                            db.add(soap)
                            db.commit()

                        await websocket.send_json({"type": "soap_note", **soap_data})

                        # Extract entities
                        await websocket.send_json({"type": "status", "message": "Extracting medical entities..."})
                        entities_data = await extract_medical_entities(full_text)

                        db.query(MedicalEntity).filter(MedicalEntity.encounter_id == encounter_id).delete()
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

                        encounter.status = "completed"
                        db.commit()

                        await websocket.send_json({"type": "entities", "entities": entities_data})
                        await websocket.send_json({"type": "complete", "message": "Processing complete"})

                    except Exception as exc:
                        await websocket.send_json({"type": "error", "message": str(exc)})

                elif cmd == "ping":
                    await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        db.close()
