"""
routers/upload.py — POST /api/v1/upload

Accepts either:
  - multipart/form-data with a `file` field (PDF upload)
  - application/json with a `content` field (plain-text paste)

Pipeline:
  validate → extract text → normalise → TF-IDF transform → cosine similarity → return gaps
"""

import logging
import datetime
from typing import Annotated

import io

import pdfplumber
import numpy as np
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from models.upload import ConceptScore, TextUploadRequest, UploadResponse
from normaliser import normalise
from tfidf_engine import get_concept_vectors, transform

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_PDF_BYTES = 20 * 1024 * 1024  # 20 MB
_GAP_THRESHOLD = 0.35


def _log_server_error(path: str, detail: str) -> None:
    """Log 5xx-level errors to stdout with ISO timestamp."""
    ts = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    logger.error("%s | %s | %s", ts, path, detail)


def _compute_gap_scores(student_vector: np.ndarray) -> list[ConceptScore]:
    """
    Compute cosine similarity between the student vector and every concept
    vector, then return a list of ConceptScore objects.

    Because both the concept vectors and the student vector are L2-normalised,
    cosine similarity == dot product.
    """
    concept_vectors = get_concept_vectors()
    scores: list[ConceptScore] = []
    for concept_name, concept_vec in concept_vectors.items():
        # dot product of two unit vectors == cosine similarity
        score = float(np.dot(student_vector, concept_vec))
        # Clamp to [0, 1] to guard against floating-point drift
        score = max(0.0, min(1.0, score))
        scores.append(
            ConceptScore(
                concept=concept_name,
                score=round(score, 4),
                is_gap=score < _GAP_THRESHOLD,
            )
        )
    return scores


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(request: Request, file: Annotated[UploadFile, File()]) -> UploadResponse:
    """
    Accept a PDF file, extract text, run gap analysis, and return concept scores.

    Validations:
      - MIME type must be application/pdf
      - File size must not exceed 20 MB
      - PDF must contain extractable text
    """
    # MIME type check
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted. Please upload a file with content type application/pdf.",
        )

    # Read file bytes and enforce size limit
    contents = await file.read()
    if len(contents) > _MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 20 MB limit. Please upload a smaller PDF.",
        )

    # Additional filename extension check
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    # Extract text with pdfplumber
    try:
        with pdfplumber.open(io.BytesIO(contents)) as pdf_doc:
            raw_text = "\n".join(
                page.extract_text() or "" for page in pdf_doc.pages
            )
    except Exception as exc:
        detail = f"Could not read PDF: {exc}"
        _log_server_error(str(request.url.path), detail)
        raise HTTPException(status_code=422, detail=detail) from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "No extractable text found in the PDF. "
                "Scanned image PDFs are not supported — please use a text-based PDF."
            ),
        )

    # Normalise
    try:
        normalised = normalise(raw_text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Vectorise and score
    student_vector = transform(normalised)
    scores = _compute_gap_scores(student_vector)
    return UploadResponse(concepts=scores)


@router.post("/upload/text", response_model=UploadResponse)
async def upload_text(body: TextUploadRequest) -> UploadResponse:
    """
    Accept plain text (JSON body with `content` field), run gap analysis,
    and return concept scores.

    Pydantic enforces min_length=50 and max_length=500_000 on the `content`
    field, returning HTTP 422 automatically for out-of-range payloads.
    """
    try:
        normalised = normalise(body.content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    student_vector = transform(normalised)
    scores = _compute_gap_scores(student_vector)
    return UploadResponse(concepts=scores)
