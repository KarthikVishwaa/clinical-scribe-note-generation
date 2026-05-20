from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import DrugInteractionRequest
from ..auth import get_current_user
from ..services.drug_interaction_service import check_drug_interactions_openfda

router = APIRouter(prefix="/api/drugs", tags=["drug-interactions"])


@router.post("/interactions")
async def check_interactions(
    data: DrugInteractionRequest,
    user: User = Depends(get_current_user)
):
    if len(data.drugs) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 drug names to check interactions.")
    if len(data.drugs) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 drugs per request.")

    result = await check_drug_interactions_openfda(data.drugs)
    return result
