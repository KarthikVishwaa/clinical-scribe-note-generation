import openai
import tempfile
import os
from ..config import settings

# Medical context prompts per language — these dramatically improve Whisper accuracy
# by seeding the vocabulary with common medical terms in that language.
MEDICAL_PROMPTS = {
    "en": (
        "This is a medical consultation between a doctor and patient. "
        "Medical terms, drug names, dosages, symptoms, and diagnoses may be mentioned."
    ),
    "ta": (
        "இது ஒரு மருத்துவர் மற்றும் நோயாளிக்கு இடையேயான மருத்துவ ஆலோசனை. "
        "மருந்துகள், நோய்கள், அறிகுறிகள் மற்றும் மருத்துவ சொற்கள் பயன்படுத்தப்படலாம். "
        "Doctor, patient, blood pressure, diabetes, fever, pain, medicine, tablet, injection."
    ),
    "hi": (
        "यह एक डॉक्टर और मरीज के बीच चिकित्सा परामर्श है। "
        "दवाएं, बीमारियां, लक्षण और चिकित्सा शब्द उपयोग किए जा सकते हैं।"
    ),
    "ar": (
        "هذه استشارة طبية بين الطبيب والمريض. "
        "قد يُذكر أسماء الأدوية والأمراض والأعراض والمصطلحات الطبية."
    ),
    "es": (
        "Esta es una consulta médica entre un médico y un paciente. "
        "Se pueden mencionar medicamentos, diagnósticos, síntomas y términos médicos."
    ),
    "fr": (
        "Ceci est une consultation médicale entre un médecin et un patient. "
        "Des médicaments, diagnostics, symptômes et termes médicaux peuvent être mentionnés."
    ),
    "de": (
        "Dies ist eine ärztliche Konsultation zwischen Arzt und Patient. "
        "Medikamente, Diagnosen, Symptome und medizinische Fachbegriffe können erwähnt werden."
    ),
    "zh": "这是医生和患者之间的医疗咨询，可能涉及药物、疾病、症状和医学术语。",
    "ja": "これは医師と患者の間の医療相談です。薬、病気、症状、医学用語が含まれる場合があります。",
    "pt": (
        "Esta é uma consulta médica entre médico e paciente. "
        "Medicamentos, diagnósticos, sintomas e termos médicos podem ser mencionados."
    ),
}


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "en",
    db=None,
    user_id: int = None,
) -> dict:
    """
    Transcribe audio using OpenAI Whisper.

    language: ISO 639-1 code (en, ta, hi, ar, es, fr, de, zh, ja, pt)
    A language-specific medical context prompt is passed to Whisper so it
    recognises medical vocabulary and proper drug names correctly.
    """
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Detect extension from filename; fallback to .webm
    ext = os.path.splitext(filename)[1] or ".webm"
    if ext not in (".webm", ".ogg", ".mp3", ".mp4", ".wav", ".flac", ".m4a", ".mpeg", ".mpga", ".oga"):
        ext = ".webm"

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            kwargs = {
                "model":           "whisper-1",
                "file":            audio_file,
                "response_format": "verbose_json",
            }

            # Pass language — this forces Whisper to decode in that language
            # instead of wasting tokens trying to auto-detect.
            if language and language != "auto":
                kwargs["language"] = language

            # Seed Whisper with medical vocabulary for better accuracy
            prompt = MEDICAL_PROMPTS.get(language, MEDICAL_PROMPTS["en"])
            kwargs["prompt"] = prompt

            response = await client.audio.transcriptions.create(**kwargs)

        # Estimate duration for cost tracking
        audio_minutes = 0.0
        try:
            duration_secs = getattr(response, "duration", None)
            if duration_secs:
                audio_minutes = float(duration_secs) / 60.0
            else:
                audio_minutes = max(0.1, len(audio_bytes) / (150 * 1024))
        except Exception:
            audio_minutes = 0.5

        # Track usage if db session provided
        if db and user_id:
            try:
                from .usage_tracker import log_usage
                log_usage(
                    db=db, user_id=user_id,
                    service="openai_whisper", endpoint="transcription",
                    audio_minutes=audio_minutes,
                )
            except Exception:
                pass

        return {
            "text":       response.text,
            "language":   getattr(response, "language", language or "en"),
            "confidence": "high",
        }
    finally:
        os.unlink(tmp_path)
