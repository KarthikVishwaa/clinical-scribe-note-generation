import httpx
import json
import anthropic
from ..config import settings


async def check_drug_interactions_openfda(drugs: list[str]) -> dict:
    """Check drug interactions using OpenFDA API (free, no key needed)."""
    results = []

    # Query OpenFDA for each drug pair
    if len(drugs) < 2:
        return {"interactions": [], "summary": "Need at least 2 drugs to check interactions.", "drugs": drugs}

    found_interactions = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        for drug in drugs:
            try:
                # Search drug label for interaction info
                url = f"https://api.fda.gov/drug/label.json?search=drug_interactions:{drug}&limit=1"
                r = await client.get(url)
                if r.status_code == 200:
                    data = r.json()
                    results_list = data.get("results", [])
                    if results_list:
                        interactions_text = results_list[0].get("drug_interactions", [""])[0] if results_list[0].get("drug_interactions") else ""
                        if interactions_text:
                            # Check if any other drug is mentioned
                            for other_drug in drugs:
                                if other_drug.lower() != drug.lower() and other_drug.lower() in interactions_text.lower():
                                    found_interactions.append({
                                        "drug1": drug,
                                        "drug2": other_drug,
                                        "severity": "moderate",
                                        "description": f"Interaction found in FDA label for {drug}",
                                        "source": "OpenFDA"
                                    })
            except Exception:
                pass

    # Use Claude to provide detailed interaction analysis
    interaction_analysis = await analyze_interactions_with_claude(drugs, found_interactions)

    return {
        "drugs": drugs,
        "interactions": interaction_analysis.get("interactions", found_interactions),
        "summary": interaction_analysis.get("summary", "Analysis complete."),
        "recommendations": interaction_analysis.get("recommendations", []),
        "overall_risk": interaction_analysis.get("overall_risk", "unknown")
    }


async def analyze_interactions_with_claude(drugs: list[str], found_interactions: list) -> dict:
    """Use Claude to provide comprehensive drug interaction analysis."""
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    drug_list = ", ".join(drugs)
    fda_findings = json.dumps(found_interactions) if found_interactions else "No FDA label interactions found"

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        system="""You are a clinical pharmacist specializing in drug interactions. Analyze the provided drug combination and return a structured JSON response.

Return JSON with this structure:
{
  "overall_risk": "none|low|moderate|high|contraindicated",
  "interactions": [
    {
      "drug1": "drug name",
      "drug2": "drug name",
      "severity": "minor|moderate|major|contraindicated",
      "mechanism": "pharmacological mechanism",
      "description": "clinical significance",
      "management": "what to do clinically"
    }
  ],
  "summary": "brief overall summary",
  "recommendations": ["recommendation 1", "recommendation 2"]
}""",
        messages=[
            {
                "role": "user",
                "content": f"""Analyze drug interactions for this combination: {drug_list}

FDA findings: {fda_findings}

Provide a comprehensive clinical drug interaction analysis."""
            }
        ],
    )

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
            "overall_risk": "unknown",
            "interactions": [],
            "summary": "Unable to analyze interactions.",
            "recommendations": ["Consult a clinical pharmacist for detailed interaction checking."]
        }
