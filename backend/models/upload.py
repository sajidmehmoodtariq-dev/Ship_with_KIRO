"""
models/upload.py — Pydantic request/response schemas for the upload endpoint.
"""

from pydantic import BaseModel, Field


class TextUploadRequest(BaseModel):
    """JSON body for plain-text upload requests."""

    content: str = Field(
        ...,
        min_length=50,
        max_length=500_000,
        description="Raw student notes (50–500 000 characters)",
    )


class ConceptScore(BaseModel):
    """Gap score for a single concept."""

    concept: str = Field(..., description="Concept name from the concept graph")
    score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity between student text and concept (0 = no coverage, 1 = full coverage)",
    )
    is_gap: bool = Field(
        ...,
        description="True when score < 0.35, indicating a knowledge gap",
    )


class UploadResponse(BaseModel):
    """Response body returned by POST /api/v1/upload."""

    concepts: list[ConceptScore] = Field(
        ...,
        description="Gap scores for all 20 concepts in the concept graph",
    )
