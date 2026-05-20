import anthropic
import json
from ..config import settings

DIFF_DIAGNOSIS_PROMPT = """You are an expert clinician providing differential diagnosis support.
Based on the provided symptoms, history, and vitals, generate a ranked differential diagnosis list.

Return a JSON object with this structure:
{
  "differentials": [
    {
      "rank": 1,
      "diagnosis": "diagnosis name",
      "icd_code": "ICD-10 code",
      "confidence": "high|moderate|low",
      "confidence_percent": 85,
      "supporting_features": ["feature 1", "feature 2"],
      "against_features": ["feature against this diagnosis"],
      "next_steps": ["test or action 1", "test or action 2"],
      "urgency": "emergent|urgent|routine"
    }
  ],
  "red_flags": ["red flag symptom or sign"],
  "recommended_workup": ["test 1", "test 2"],
  "clinical_reasoning": "brief paragraph explaining the reasoning"
}

Provide 3-7 differential diagnoses ordered by likelihood. Be clinically rigorous."""


async def generate_differential_diagnosis(
    symptoms: str,
    history: str = "",
    vitals: str = "",
    db=None,
    user_id: int = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=DIFF_DIAGNOSIS_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Generate differential diagnoses for:

PRESENTING SYMPTOMS: {symptoms}
HISTORY: {history or 'Not provided'}
VITALS/EXAMINATION: {vitals or 'Not provided'}

Provide a comprehensive differential diagnosis ranked by likelihood.""",
            }
        ],
    )

    # Track usage
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="anthropic_claude", endpoint="differential_diagnosis",
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
            "differentials": [],
            "red_flags": [],
            "recommended_workup": [],
            "clinical_reasoning": "Unable to generate differential diagnosis."
        }
