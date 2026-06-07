"""
routers/quiz.py — POST /api/v1/quiz

Accepts a list of weak concept names and the subject name.
Calls Gemini once and asks for a pure JSON array — one object per concept —
each containing:
  - concept       : str
  - explanation   : ~150-word plain-English explanation
  - question      : str
  - options       : array of exactly 4 distinct strings
  - correct_answer: str (must match one of the options exactly)

Returns that array wrapped in a QuizResponse envelope.
"""

import logging

from fastapi import HTTPException

from fastapi import APIRouter
from gemini import call_gemini_json
from models.quiz import QuizItem, QuizRequest, QuizResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _build_quiz_prompt(subject: str, concepts: list[str]) -> str:
    concepts_list = "\n".join(f"- {c}" for c in concepts)
    return (
        f'Subject: "{subject}"\n'
        f"Weak concepts to quiz:\n{concepts_list}\n\n"
        "For each concept above, return a JSON object with EXACTLY these fields:\n"
        '  "concept"       : the concept name (string)\n'
        '  "explanation"   : a clear, plain-English explanation of the concept in approximately 150 words (string)\n'
        '  "question"      : a challenging multiple-choice question testing that concept (string)\n'
        '  "options"       : an array of exactly 4 distinct, non-empty answer strings\n'
        '  "correct_answer": the correct answer — must match one of the options exactly (string)\n\n'
        "Return ONLY a pure JSON array containing one object per concept. "
        "No markdown, no code fences, no extra keys, no explanation outside the JSON.\n"
        "Example structure:\n"
        '[\n'
        '  {\n'
        '    "concept": "example concept",\n'
        '    "explanation": "A clear ~150 word explanation...",\n'
        '    "question": "Which of the following best describes X?",\n'
        '    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '    "correct_answer": "Option A"\n'
        '  }\n'
        ']'
    )


def _validate_items(raw: object, subject: str) -> list[QuizItem]:
    """Parse and validate the LLM response into QuizItem objects."""

    if not isinstance(raw, list):
        raise HTTPException(
            status_code=422,
            detail=f"LLM did not return a JSON array for quiz generation. Got: {type(raw).__name__}",
        )

    items: list[QuizItem] = []
    for i, entry in enumerate(raw):
        if not isinstance(entry, dict):
            raise HTTPException(
                status_code=422,
                detail=f"Quiz item {i} is not a JSON object.",
            )

        # Validate options distinctness before Pydantic
        options = entry.get("options", [])
        if not isinstance(options, list) or len(options) < 4:
            raise HTTPException(
                status_code=422,
                detail=f"Quiz item {i} ('{entry.get('concept', '?')}') does not have 4 options.",
            )
        if len(set(str(o) for o in options)) < 4:
            raise HTTPException(
                status_code=422,
                detail=f"Quiz item {i} has duplicate options: {options}",
            )

        # Ensure correct_answer is one of the options
        correct = entry.get("correct_answer", "")
        if correct not in options:
            # Try case-insensitive match and fix in place
            lower_options = [str(o).lower() for o in options]
            if correct.lower() in lower_options:
                entry["correct_answer"] = options[lower_options.index(correct.lower())]
            else:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Quiz item {i}: correct_answer '{correct}' "
                        f"does not match any option in {options}."
                    ),
                )

        try:
            items.append(QuizItem(**entry))
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Quiz item {i} failed validation: {exc}",
            ) from exc

    return items


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(body: QuizRequest) -> QuizResponse:
    """
    Generate one quiz item per weak concept.

    Each item contains a ~150-word explanation, a multiple-choice question,
    four answer options, and the correct answer string.
    """
    if not body.concepts:
        raise HTTPException(
            status_code=400,
            detail="At least one concept is required.",
        )

    prompt = _build_quiz_prompt(body.subject, body.concepts)
    raw = await call_gemini_json(prompt)
    items = _validate_items(raw, body.subject)

    return QuizResponse(subject=body.subject, items=items)
