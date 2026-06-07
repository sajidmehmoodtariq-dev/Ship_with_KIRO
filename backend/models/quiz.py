"""
models/quiz.py — Pydantic schemas for POST /quiz.
"""

from pydantic import BaseModel, Field


class QuizRequest(BaseModel):
    subject: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Subject name — gives the LLM context for generating questions",
    )
    concepts: list[str] = Field(
        ...,
        min_length=1,
        description="List of weak concept names to generate quiz items for (at least one required)",
    )


class QuizItem(BaseModel):
    concept: str = Field(..., description="The concept this item targets")
    explanation: str = Field(
        ...,
        description="~150-word plain-English explanation of the concept",
    )
    question: str = Field(..., description="The quiz question")
    options: list[str] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Exactly four distinct answer choices",
    )
    correct_answer: str = Field(
        ...,
        description="The correct answer string — must match one of the options exactly",
    )


class QuizResponse(BaseModel):
    subject: str
    items: list[QuizItem] = Field(
        ...,
        description="One quiz item per concept",
    )
