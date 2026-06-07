"""
routers/quiz.py

Two endpoints:

  POST /quiz/start   { subject, concepts[] }
    → Server-Sent Events stream.
      Emits one JSON item per concept, sequentially (no parallelism).
      Each event: data: <QuizItem JSON>\n\n
      Final event: data: {"done": true}\n\n
      Error event: data: {"error": "..."}\n\n

  The frontend consumes the stream and renders each question as it arrives,
  so the user can start answering question 1 while question 2 is still generating.
  This also naturally serialises Gemini calls → no rate-limit spikes.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from gemini import call_gemini_json
from models.quiz import QuizItem, QuizRequest

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Prompt ────────────────────────────────────────────────────────────────────

def _prompt(subject: str, concept: str) -> str:
    return (
        f'Subject: "{subject}"\n'
        f'Concept: "{concept}"\n\n'
        "Return a single JSON object with EXACTLY these five fields:\n"
        '  "concept"       : the concept name as given above\n'
        '  "explanation"   : ~150-word plain-English explanation, flowing prose, no bullets\n'
        '  "question"      : one challenging multiple-choice question\n'
        '  "options"       : array of exactly 4 distinct non-empty strings\n'
        '  "correct_answer": one of the 4 options verbatim\n\n'
        "Return ONLY the raw JSON object — no markdown, no fences, no extra text.\n\n"
        "Example:\n"
        '{\n'
        f'  "concept": "{concept}",\n'
        '  "explanation": "...",\n'
        '  "question": "Which best describes X?",\n'
        '  "options": ["A", "B", "C", "D"],\n'
        '  "correct_answer": "A"\n'
        '}'
    )


# ── Validation ────────────────────────────────────────────────────────────────

def _validate(raw: object, concept: str) -> QuizItem:
    # Unwrap single-element array (Gemini quirk)
    if isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], dict):
        raw = raw[0]

    if not isinstance(raw, dict):
        raise ValueError(f"Expected JSON object, got {type(raw).__name__}")

    raw["concept"] = concept  # always match what was requested

    options = [str(o).strip() for o in raw.get("options", [])[:4]]
    if len(options) < 4:
        raise ValueError(f"Need 4 options, got {len(options)}")
    if len({o.lower() for o in options}) < 4:
        raise ValueError(f"Duplicate options: {options}")
    raw["options"] = options

    correct = str(raw.get("correct_answer", "")).strip()
    lower_map = {o.lower(): o for o in options}
    if correct not in options:
        if correct.lower() in lower_map:
            correct = lower_map[correct.lower()]
        else:
            logger.warning("correct_answer %r not in options for '%s' — using first", correct, concept)
            correct = options[0]
    raw["correct_answer"] = correct

    return QuizItem(**raw)


# ── SSE stream generator ──────────────────────────────────────────────────────

async def _stream_quiz(subject: str, concepts: list[str]):
    """
    Async generator that yields SSE-formatted strings.
    Calls Gemini once per concept, sequentially.
    """
    for concept in concepts:
        try:
            raw = await call_gemini_json(_prompt(subject, concept))
            item = _validate(raw, concept)
            payload = item.model_dump()
        except Exception as exc:
            err_msg = str(exc)
            logger.error("Quiz generation failed for '%s': %s", concept, err_msg)
            # Send an error event for this concept so the frontend can skip it
            yield f"data: {json.dumps({'error': err_msg, 'concept': concept})}\n\n"
            continue

        yield f"data: {json.dumps(payload)}\n\n"

        # Small breath between calls — avoids hammering the rate limit
        await asyncio.sleep(0.3)

    yield 'data: {"done": true}\n\n'


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/quiz/stream")
async def stream_quiz(body: QuizRequest) -> StreamingResponse:
    """
    Stream quiz items one at a time via Server-Sent Events.
    The client connects once and receives items as they are generated.
    """
    if not body.concepts:
        raise HTTPException(status_code=400, detail="At least one concept is required.")

    return StreamingResponse(
        _stream_quiz(body.subject, body.concepts),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering if proxied
        },
    )
