"""
routers/quiz.py — POST /api/v1/quiz

Accepts a list of gap concept names, calls the Gemini API to generate
exactly 3 multiple-choice questions per concept, and returns structured JSON.
"""

import json
import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from models.quiz import QuizQuestion, QuizRequest, QuizResponse

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

_GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
_TIMEOUT_SECONDS = 10.0
_QUESTIONS_PER_CONCEPT = 3


def _build_prompt(concept: str) -> str:
    """
    Build a Gemini prompt that requests exactly 3 multiple-choice questions
    for the given concept in strict JSON format.
    """
    return (
        f'Generate exactly {_QUESTIONS_PER_CONCEPT} multiple-choice quiz questions '
        f'about the topic: "{concept}".\n\n'
        "Return ONLY a valid JSON array (no markdown, no code fences, no extra text). "
        "Each element must have exactly these fields:\n"
        '  "prompt":        string — the question text\n'
        '  "options":       array of exactly 4 distinct non-empty strings — the answer choices\n'
        '  "correct_index": integer 0-3 — zero-based index of the correct answer in "options"\n'
        f'  "concept":       string — must be exactly "{concept}"\n\n'
        "Example element:\n"
        '{"prompt":"What is X?","options":["A","B","C","D"],"correct_index":2,"concept":"' + concept + '"}\n\n'
        "Output the JSON array now:"
    )


def _parse_questions(raw: str, concept: str) -> list[QuizQuestion]:
    """
    Parse and validate the raw LLM response string into QuizQuestion objects.

    Raises HTTPException 422 if the JSON is unparseable or structurally invalid.
    """
    # Strip markdown code fences that some models insert despite being told not to
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove first and last fence lines
        cleaned = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        ).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        snippet = cleaned[:200]
        raise HTTPException(
            status_code=422,
            detail=f"Quiz response could not be parsed as JSON: {exc}. Raw (truncated): {snippet!r}",
        ) from exc

    if not isinstance(data, list):
        raise HTTPException(
            status_code=422,
            detail=f"Expected a JSON array from LLM, got {type(data).__name__}",
        )

    questions: list[QuizQuestion] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=422,
                detail=f"Question {i} is not a JSON object",
            )

        # Ensure options are distinct
        options = item.get("options", [])
        if len(set(options)) != 4:
            raise HTTPException(
                status_code=422,
                detail=f"Question {i} does not have exactly 4 distinct options: {options}",
            )

        # Enforce concept matches what was requested
        item["concept"] = concept

        try:
            question = QuizQuestion(**item)
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Question {i} failed validation: {exc}",
            ) from exc

        questions.append(question)

    return questions


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(body: QuizRequest) -> QuizResponse:
    """
    Generate 3 multiple-choice quiz questions for each supplied concept name.

    Requires at least one concept. Calls the Gemini API once per concept.
    """
    if not body.concepts:
        raise HTTPException(
            status_code=400,
            detail="At least one gap concept is required.",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    all_questions: list[QuizQuestion] = []

    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        for concept in body.concepts:
            prompt_text = _build_prompt(concept)
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt_text}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024,
                },
            }

            try:
                response = await client.post(
                    f"{_GEMINI_API_URL}?key={api_key}",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
            except httpx.TimeoutException as exc:
                raise HTTPException(
                    status_code=504,
                    detail=f"Quiz generation timed out after {_TIMEOUT_SECONDS}s for concept '{concept}'.",
                ) from exc
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Quiz generation failed for concept '{concept}': "
                        f"Gemini API returned HTTP {exc.response.status_code}."
                    ),
                ) from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Quiz generation failed: could not reach Gemini API. {exc}",
                ) from exc

            # Extract the text part from the Gemini response envelope
            try:
                gemini_data = response.json()
                raw_text: str = (
                    gemini_data["candidates"][0]["content"]["parts"][0]["text"]
                )
            except (KeyError, IndexError, TypeError) as exc:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unexpected Gemini response structure for concept '{concept}': {exc}",
                ) from exc

            questions = _parse_questions(raw_text, concept)
            all_questions.extend(questions)

    return QuizResponse(questions=all_questions)
