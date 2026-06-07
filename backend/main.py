"""
main.py — AI Study Companion FastAPI application entry point.

Startup sequence:
  1. concept_graph.py is imported → validates the concept graph (raises on malformed data)
  2. tfidf_engine.py is imported → fits the TF-IDF vectoriser on concept keywords
  3. Routers are registered under /api/v1
  4. CORS middleware allows requests from the Vite dev server (http://localhost:5173)
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import tfidf_engine at module level so the vectoriser is fitted before the
# first request arrives. Any startup error surfaces immediately.
import tfidf_engine  # noqa: F401

from routers.upload import router as upload_router
from routers.quiz import router as quiz_router

# ---------------------------------------------------------------------------
# Logging configuration — writes to stdout so uvicorn captures it
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Study Companion",
    description=(
        "Identifies knowledge gaps in student notes via TF-IDF cosine similarity "
        "and generates targeted multiple-choice quiz questions using the Gemini API."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React/Vite dev server and the same-origin production build
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(upload_router, prefix="/api/v1", tags=["upload"])
app.include_router(quiz_router, prefix="/api/v1", tags=["quiz"])


@app.get("/health", tags=["health"])
def health_check() -> dict:
    """Simple liveness probe."""
    return {"status": "ok"}
