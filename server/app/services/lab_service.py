import anthropic
import json
from ..config import settings

LAB_INTERPRETATION_PROMPT = """You are a clinical pathologist and lab medicine expert.
Interpret the provided laboratory results and explain them in clear clinical terms.

Return a JSON object with this structure:
{
  "results": [
    {
      "test_name": "test name",
      "value": "value with units",
      "reference_range": "normal range",
      "status": "normal|low|high|critical_low|critical_high",
      "interpretation": "clinical interpretation",
      "significance": "minor|moderate|significant|critical"
    }
  ],
  "overall_impression": "overall clinical impression",
  "abnormal_highlights": ["key abnormal finding 1", "key abnormal finding 2"],
  "clinical_correlation": "how these results correlate clinically",
  "recommended_actions": ["action 1", "action 2"],
  "requires_urgent_attention": true/false,
  "urgent_reason": "reason if urgent"
}

Parse the lab results carefully. Identify normal vs abnormal values.
Flag critical values that need immediate attention."""


async def interpret_lab_results(
    lab_text: str,
    patient_context: str = "",
    db=None,
    user_id: int = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=LAB_INTERPRETATION_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Interpret these laboratory results:

LAB RESULTS:
{lab_text}

PATIENT CONTEXT: {patient_context or 'Not provided'}

Provide comprehensive interpretation highlighting abnormal values and clinical significance.""",
            }
        ],
    )

    # Track usage
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="anthropic_claude", endpoint="lab_interpretation",
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
            "results": [],
            "overall_impression": "Unable to interpret lab results.",
            "abnormal_highlights": [],
            "clinical_correlation": "",
            "recommended_actions": ["Please review lab results manually."],
            "requires_urgent_attention": False,
            "urgent_reason": ""
        }
