"""
routers/analyze.py — POST /api/v1/analyze

Flow:
  1. Accept subject name + notes text (or PDF via form upload).
  2. Call Gemini: "Given subject X and these notes, return a JSON array of
     exactly 15 relevant concept strings."
  3. Fit a TF-IDF vectoriser on those 15 concepts (each concept is one document).
  4. Transform the student notes into a TF-IDF vector in the same space.
  5. Compute cosine similarity between the notes vector and every concept vector.
  6. Return the subject, concepts array, and per-concept scores.
"""

import io
import logging
from typing import Annotated

import numpy as np
import pdfplumber
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from gemini import call_gemini_json
from models.analyze import AnalyzeRequest, AnalyzeResponse, ConceptScore
from normaliser import normalise

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_PDF_BYTES = 20 * 1024 * 1024  # 20 MB
_EXPECTED_CONCEPTS = 15


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_pdf_text(data: bytes) -> str:
    """Extract all text from a PDF byte payload using pdfplumber."""
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not read PDF: {exc}",
        ) from exc


def _get_concepts_from_llm_response(raw: object, subject: str) -> list[str]:
    """
    Validate and clean the LLM-returned concept list.

    Accepts either a plain JSON array of strings, or an array of objects
    with a "concept" key (graceful fallback for non-compliant responses).
    """
    if not isinstance(raw, list):
        raise HTTPException(
            status_code=422,
            detail=f"LLM did not return a JSON array for concept generation. Got: {type(raw).__name__}",
        )

    concepts: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            concepts.append(item.strip())
        elif isinstance(item, dict):
            # Graceful fallback: {"concept": "...", ...}
            for key in ("concept", "name", "topic"):
                if isinstance(item.get(key), str) and item[key].strip():
                    concepts.append(item[key].strip())
                    break

    if len(concepts) < 5:
        raise HTTPException(
            status_code=422,
            detail=(
                f"LLM returned too few usable concepts ({len(concepts)}) "
                f"for subject '{subject}'. Try a more specific subject name."
            ),
        )

    # Deduplicate while preserving order, cap at expected count
    seen: set[str] = set()
    unique: list[str] = []
    for c in concepts:
        lc = c.lower()
        if lc not in seen:
            seen.add(lc)
            unique.append(c)

    return unique[:_EXPECTED_CONCEPTS]


def _compute_scores(
    notes_text: str,
    concepts: list[str],
) -> list[ConceptScore]:
    """
    Fit a TF-IDF vectoriser on the concept strings, transform the notes,
    and compute cosine similarity for each concept.

    Each concept becomes a one-document "corpus entry". The student notes
    are transformed in the same vocabulary space.
    """
    # Normalise concepts (simple lowercase; we keep them readable for display)
    concept_docs = [c.lower() for c in concepts]

    # Fit on concept strings AND the student notes together so the vocabulary
    # covers both sides, then we only need transform() after that.
    all_docs = concept_docs + [notes_text]

    vectorizer = TfidfVectorizer(norm="l2", stop_words="english")
    try:
        matrix = vectorizer.fit_transform(all_docs)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"TF-IDF vectorisation failed: {exc}",
        ) from exc

    concept_matrix = matrix[: len(concepts)]      # shape (N, vocab)
    notes_vector   = matrix[len(concepts)]         # shape (1, vocab) sparse row

    # cosine_similarity expects 2-D; reshape notes vector
    sims = cosine_similarity(notes_vector, concept_matrix).flatten()  # shape (N,)

    scores: list[ConceptScore] = []
    for concept, sim in zip(concepts, sims):
        score = float(np.clip(sim, 0.0, 1.0))
        scores.append(ConceptScore(concept=concept, score=round(score, 4)))

    return scores


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(body: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyse plain-text notes against an LLM-generated concept list.

    Request body (JSON):
      - subject: str  — e.g. "Organic Chemistry"
      - content: str  — the student's notes (50–500 000 chars)
    """
    return await _run_analysis(body.subject, body.content)


@router.post("/analyze/pdf", response_model=AnalyzeResponse)
async def analyze_pdf(
    request: Request,
    subject: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
) -> AnalyzeResponse:
    """
    Analyse a PDF upload against an LLM-generated concept list.

    Form fields:
      - subject: str  — e.g. "Organic Chemistry"
      - file:    PDF  — the student's notes as a PDF file
    """
    # MIME / extension guard
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only .pdf files are accepted.")

    contents = await file.read()
    if len(contents) > _MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 20 MB limit.")

    raw_text = _extract_pdf_text(contents)
    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in the PDF. Scanned image PDFs are not supported.",
        )

    return await _run_analysis(subject, raw_text)


async def _run_analysis(subject: str, raw_text: str) -> AnalyzeResponse:
    """Shared pipeline used by both analyze endpoints."""

    # 1. Normalise student notes
    try:
        normalised_notes = normalise(raw_text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # 2. Ask LLM for 15 relevant concepts
    concept_prompt = (
        f'Subject: "{subject}"\n\n'
        f'Student notes (excerpt):\n"""\n{raw_text[:3000]}\n"""\n\n'
        f"Return a JSON array of exactly {_EXPECTED_CONCEPTS} key concepts "
        f"that a student must know for this subject, informed by both the "
        f"subject name and the notes above. "
        f"Return ONLY a pure JSON array of strings — no markdown, no explanation, "
        f"no extra text. Example: [\"concept one\", \"concept two\", ...]"
    )

    raw_concepts = await call_gemini_json(concept_prompt)
    concepts = _get_concepts_from_llm_response(raw_concepts, subject)

    # 3. TF-IDF + cosine similarity
    scores = _compute_scores(normalised_notes, concepts)

    return AnalyzeResponse(subject=subject, concepts=scores)
