"""
main.py — AI Study Companion FastAPI application.

Endpoints:
  POST /api/v1/analyze      — text notes + subject → 15 LLM concepts + TF-IDF scores
  POST /api/v1/analyze/pdf  — PDF upload + subject → same
  POST /api/v1/quiz         — weak concepts + subject → explanation + quiz question per concept
  GET  /health              — liveness probe
"""

import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers.analyze import router as analyze_router
from routers.quiz import router as quiz_router

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Study Companion",
    description=(
        "Generates subject-specific concepts via Gemini, scores student note "
        "coverage with TF-IDF cosine similarity, and produces targeted quiz questions."
    ),
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_router, prefix="/api/v1", tags=["analyze"])
app.include_router(quiz_router,    prefix="/api/v1", tags=["quiz"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "version": "2.0.0"}
