import anthropic
import json
from ..config import settings

PRESCRIPTION_PROMPT = """You are a clinical prescription assistant. Based on the SOAP note plan section, generate a structured prescription.

Return a JSON object with this exact structure:
{
  "medications": [
    {
      "name": "medication name",
      "generic_name": "generic name if brand given",
      "dosage": "e.g. 500mg",
      "form": "tablet/capsule/syrup/injection/cream/inhaler",
      "route": "oral/topical/IV/IM/subcutaneous/inhaled",
      "frequency": "e.g. twice daily / every 8 hours",
      "duration": "e.g. 7 days / 1 month / as needed",
      "instructions": "e.g. take with food, avoid alcohol",
      "quantity": "e.g. 14 tablets"
    }
  ],
  "diagnosis": "primary diagnosis for prescription",
  "special_instructions": "any special instructions or warnings",
  "refills": "0 / 1 / 2 / PRN"
}

Extract medications from the plan section. If no medications are explicitly mentioned, infer reasonable ones based on the diagnosis. Return valid JSON only."""


async def generate_prescription(
    soap_plan: str,
    soap_assessment: str,
    patient_name: str,
    doctor_name: str,
    db=None,
    user_id: int = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        system=PRESCRIPTION_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Generate a prescription based on:

ASSESSMENT: {soap_assessment or 'Not provided'}
PLAN: {soap_plan or 'Not provided'}
Patient: {patient_name or 'Unknown'}
Doctor: {doctor_name or 'Dr. Unknown'}

Extract all medications from the plan and structure them as a prescription.""",
            }
        ],
    )

    # Track usage
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="anthropic_claude", endpoint="prescription",
                tokens_input=message.usage.input_tokens,
                tokens_output=message.usage.output_tokens,
            )
        except Exception:
            pass

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "medications": [],
            "diagnosis": soap_assessment or "",
            "special_instructions": "",
            "refills": "0"
        }
