import anthropic
import json
from ..config import settings
from datetime import datetime

REFERRAL_PROMPT = """You are an expert medical writer. Generate a formal specialist referral letter based on the encounter information.

The letter should be professional, concise, and include:
1. Patient details
2. Reason for referral
3. Relevant clinical history
4. Examination findings
5. Current medications
6. Specific clinical question for the specialist
7. Urgency

Return a JSON object:
{
  "letter_text": "full formal referral letter text",
  "urgency": "routine|urgent|emergent",
  "key_points": ["key point 1", "key point 2"],
  "clinical_question": "specific question for the specialist"
}"""


async def generate_referral_letter(
    specialist_type: str,
    specialist_name: str,
    soap_note: dict,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    additional_notes: str = "",
    db=None,
    user_id: int = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    today = datetime.now().strftime("%B %d, %Y")

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=REFERRAL_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Generate a referral letter with this information:

DATE: {today}
REFERRING DOCTOR: Dr. {doctor_name}
CLINIC: {clinic_name}
PATIENT: {patient_name}
SPECIALIST TYPE: {specialist_type}
SPECIALIST NAME: {specialist_name or 'To be assigned'}

SOAP NOTE:
Subjective: {soap_note.get('subjective', 'Not provided')}
Objective: {soap_note.get('objective', 'Not provided')}
Assessment: {soap_note.get('assessment', 'Not provided')}
Plan: {soap_note.get('plan', 'Not provided')}

ADDITIONAL NOTES: {additional_notes or 'None'}

Write a formal referral letter.""",
            }
        ],
    )

    # Track usage
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="anthropic_claude", endpoint="referral_letter",
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
            "letter_text": text,
            "urgency": "routine",
            "key_points": [],
            "clinical_question": ""
        }


async def generate_followup_reminders(
    soap_plan: str,
    patient_name: str,
    db=None,
    user_id: int = None,
) -> list:
    """Parse SOAP plan and extract follow-up reminders."""
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        system="""Extract follow-up reminders from the clinical plan. Return a JSON array:
[
  {
    "reminder_text": "specific reminder",
    "due_date": "YYYY-MM-DD or null if no specific date",
    "priority": "urgent|normal|low",
    "category": "follow-up|medication|test|referral|lifestyle"
  }
]
Parse dates relative to today. If the plan says "in 2 weeks", calculate the actual date.""",
        messages=[
            {
                "role": "user",
                "content": f"""Extract follow-up reminders from this plan for patient {patient_name}:

PLAN: {soap_plan}

Today's date: {datetime.now().strftime('%Y-%m-%d')}

Extract all actionable follow-up items.""",
            }
        ],
    )

    # Track usage
    if db and user_id:
        try:
            from .usage_tracker import log_usage
            log_usage(
                db=db, user_id=user_id,
                service="anthropic_claude", endpoint="followup_reminders",
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
        return []
