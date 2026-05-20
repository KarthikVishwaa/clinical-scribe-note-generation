import anthropic
import json
from ..config import settings

ENTITY_SYSTEM_PROMPT = """You are a clinical NLP specialist. Extract medical entities from clinical text.

Return a JSON array of entities with this structure:
[
  {
    "entity_text": "exact text from transcript",
    "entity_type": "one of: medication|symptom|diagnosis|procedure|anatomy|lab_value|vital_sign",
    "normalized_term": "standard medical term",
    "icd_code": "ICD-10 code if applicable, else null",
    "snomed_code": "SNOMED CT code if known, else null",
    "context": "brief clinical context (1 sentence)"
  }
]

Focus on clinically significant entities. Do not include common words. Return an empty array if no entities found."""


async def extract_medical_entities(transcript: str) -> list:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=ENTITY_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Extract all medical entities from this clinical transcript:\n\n{transcript}",
            }
        ],
    )

    text = message.content[0].text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return []
