from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.models.user import User
from app.services.llm_service import generate_query_info, GeminiQueryResponse

router = APIRouter(
    prefix="/assist",
    tags=["Assist"]
)


class AssistRequest(BaseModel):
    question: str
    dialect: str = "postgres"          # postgres | mysql | sqlite | standard SQL
    schema_text: Optional[str] = None  # optional DDL / schema description for context


@router.post("/generate", response_model=GeminiQueryResponse)
def assist_generate(
    data: AssistRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate an optimized SQL query from a natural-language question.

    Unlike /query/generate, this does NOT require a connected database/project.
    Pasting a schema is optional and only improves accuracy.
    """
    question = (data.question or "").strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question is required.")

    try:
        return generate_query_info(
            db_type=data.dialect or "standard SQL",
            schema_summary=data.schema_text or "",
            relationship_summary="",
            question=question,
        )
    except ValueError as e:
        # e.g. missing GEMINI_API_KEY
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        msg = str(e)
        if "API_KEY_INVALID" in msg or "API key not valid" in msg or "API key" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Gemini API key is missing or invalid. Set a valid GEMINI_API_KEY in backend/.env and restart the backend.",
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"SQL generation failed: {msg}")
