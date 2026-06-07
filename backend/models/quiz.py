"""
models/quiz.py — Pydantic request/response schemas for the quiz endpoint.
"""

from pydantic import BaseModel, Field


class QuizRequest(BaseModel):
    """JSON body for quiz generation requests."""

    concepts: list[str] = Field(
        ...,
        min_length=1,
        description="List of gap concept names to generate questions for (at least one required)",
    )


class QuizQuestion(BaseModel):
    """A single multiple-choice quiz question."""

    prompt: str = Field(..., description="The question text")
    options: list[str] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Exactly four distinct answer choices",
    )
    correct_index: int = Field(
        ...,
        ge=0,
        le=3,
        description="Zero-based index of the correct answer in `options`",
    )
    concept: str = Field(
        ...,
        description="The concept name this question targets",
    )


class QuizResponse(BaseModel):
    """Response body returned by POST /api/v1/quiz."""

    questions: list[QuizQuestion] = Field(
        ...,
        description="All generated quiz questions across all requested concepts",
    )
