import openai
import json
from ..config import settings

SOAP_SYSTEM_PROMPT = """You are an expert medical scribe assistant. Given a clinical encounter transcript, generate a structured SOAP note in ENGLISH.

The transcript may be in any language (Tamil, Hindi, English, etc.). Read and understand it fully, then produce the SOAP note in English only.

Format your response as valid JSON with these exact keys:
{
  "subjective": "Patient's chief complaint, history of present illness, past medical history, medications, allergies, review of systems",
  "objective": "Vital signs, physical exam findings, lab results, imaging results",
  "assessment": "Differential diagnoses and primary diagnosis with ICD-10 codes where applicable",
  "plan": "Treatment plan including medications (with dosages), procedures, referrals, follow-up instructions, patient education"
}

Be concise, clinically precise, and use standard medical abbreviations.
Extract only information present in the transcript.
If the transcript is in a non-English language, translate the clinical content into English for the SOAP note."""


async def generate_soap_note(
    transcript: str,
    chief_complaint: str = "",
    db=None,
    user_id: int = None,
) -> dict:
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    context      = f"Chief Complaint: {chief_complaint}\n\n" if chief_complaint else ""
    user_message = f"{context}Transcript:\n{transcript}"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SOAP_SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=2000,
    )

    # Track usage if db session provided
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="openai_gpt", endpoint="soap_note",
                tokens_input=response.usage.prompt_tokens,
                tokens_output=response.usage.completion_tokens,
            )
        except Exception:
            pass

    content = response.choices[0].message.content
    return json.loads(content)
