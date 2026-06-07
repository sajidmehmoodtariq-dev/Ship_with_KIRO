# Implementation Plan: AI Study Companion — FastAPI Backend

## Overview

Implement the backend as a FastAPI application in the `backend/` directory. The pipeline is: project scaffold → concept graph → text normaliser → TF-IDF engine → Pydantic models → upload router → quiz router → app wiring. Property-based tests (Hypothesis) are placed close to the component they validate.

---

## Tasks

- [x] 1. Scaffold the backend project structure
  - Create `backend/pyproject.toml` (or `requirements.txt`) with pinned dependencies: `fastapi`, `uvicorn[standard]`, `scikit-learn`, `pymupdf`, `httpx`, `python-dotenv`, `pydantic`, `hypothesis`, `pytest`, `pytest-asyncio`
  - Create `backend/.gitignore` entries for `__pycache__`, `.venv`, `*.pyc`, `.env`
  - Confirm `backend/.env` has a `GEMINI_API_KEY` placeholder
  - Create empty package directories: `backend/routers/`, `backend/models/`, `backend/tests/`
  - Add `__init__.py` files to `routers/`, `models/`, and `tests/`
  - _Requirements: 10.1_

- [x] 2. Implement `concept_graph.py`
  - [x] 2.1 Write `backend/concept_graph.py` with the 20 hardcoded concept dicts (name + keywords list) as specified in the design
    - Define `CONCEPT_GRAPH: list[dict]` at module level
    - Implement `_validate()` and call it at module level so a malformed graph raises `RuntimeError` at import time
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.2 Write unit tests for `concept_graph.py` in `backend/tests/test_concept_graph.py`
    - Assert exactly 20 concepts are present
    - Assert every concept has a non-empty `name` string and a non-empty `keywords` list
    - _Requirements: 10.2_

- [x] 3. Implement `normaliser.py`
  - [x] 3.1 Write `backend/normaliser.py` with the `normalise(text: str) -> str` function
    - Lowercase all characters
    - Remove punctuation and special characters using `str.translate` + `str.maketrans`
    - Drop numeric-only tokens
    - Remove English stop words via `sklearn.feature_extraction.text.ENGLISH_STOP_WORDS`
    - Join remaining tokens; raise `ValueError` if result is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.2 Write unit tests for `normaliser.py` in `backend/tests/test_normaliser.py`
    - Test lowercase conversion, punctuation removal, stop-word removal, numeric token removal
    - Test that a valid non-trivial string returns a non-empty result
    - Test that a stop-word-only string raises `ValueError`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.3 Write property test — PBT 1: normalisation idempotence
    - **Property 1: `normalise(normalise(text)) == normalise(text)` for any valid input**
    - Use `@given(text=st.text(min_size=1))`, filter inputs where `normalise` does not raise
    - Place in `backend/tests/test_normaliser.py`
    - **Validates: Requirements 3.5**

  - [ ]* 3.4 Write property test — PBT 6: whitespace/empty text is rejected
    - **Property 6: any string composed entirely of whitespace raises `ValueError`**
    - Use `@given(text=st.text(alphabet=" \t\n\r", min_size=0))`
    - Place in `backend/tests/test_normaliser.py`
    - **Validates: Requirements 3.4**

- [x] 4. Implement `tfidf_engine.py`
  - [x] 4.1 Write `backend/tfidf_engine.py`
    - Import `CONCEPT_GRAPH` from `concept_graph`
    - Build `_corpus` (joined keyword strings) and fit a `TfidfVectorizer(norm="l2")` at module level
    - Implement `get_concept_vectors() -> dict[str, np.ndarray]` returning name → unit-normalised 1-D array
    - Implement `transform(text: str) -> np.ndarray` that transforms a pre-normalised string and returns a 1-D unit-normalised array
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write unit tests for `tfidf_engine.py` in `backend/tests/test_tfidf_engine.py`
    - Assert vocabulary size matches the fitted vectoriser's feature count
    - Assert `get_concept_vectors()` returns exactly 20 entries
    - Assert a known in-vocabulary word produces a vector with L2 norm ≈ 1.0
    - Assert an entirely out-of-vocabulary string does not raise and returns a zero vector (L2 norm 0.0) with correct dimensionality
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.3 Write property test — PBT 2: vector dimensionality and unit norm
    - **Property 2: `transform(text)` always returns a vector of fixed vocabulary length; if non-zero its L2 norm is 1.0**
    - Use `@given(text=st.text(alphabet=st.characters(whitelist_categories=("Ll","Lu")), min_size=1))`
    - Place in `backend/tests/test_tfidf_engine.py`
    - **Validates: Requirements 4.3, 4.4**

- [ ] 5. Checkpoint — core pipeline components
  - Ensure all tests written so far pass: `cd backend && pytest tests/test_concept_graph.py tests/test_normaliser.py tests/test_tfidf_engine.py -v`
  - Ask the user if any questions arise before proceeding to HTTP layer.

- [x] 6. Implement Pydantic models
  - [x] 6.1 Write `backend/models/upload.py`
    - Define `TextUploadRequest(BaseModel)` with `content: str = Field(..., min_length=50, max_length=500_000)`
    - Define `ConceptScore(BaseModel)` with `concept: str`, `score: float = Field(..., ge=0.0, le=1.0)`, `is_gap: bool`
    - Define `UploadResponse(BaseModel)` with `concepts: list[ConceptScore]`
    - _Requirements: 2.4, 2.5, 5.3_

  - [x] 6.2 Write `backend/models/quiz.py`
    - Define `QuizRequest(BaseModel)` with `concepts: list[str] = Field(..., min_length=1)`
    - Define `QuizQuestion(BaseModel)` with `prompt: str`, `options: list[str] = Field(..., min_length=4, max_length=4)`, `correct_index: int = Field(..., ge=0, le=3)`, `concept: str`
    - Define `QuizResponse(BaseModel)` with `questions: list[QuizQuestion]`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Implement `routers/upload.py`
  - [x] 7.1 Write `backend/routers/upload.py` with `POST /upload`
    - PDF path: accept `UploadFile`, enforce 20 MB limit (HTTP 413), reject non-PDF MIME (HTTP 415), extract text with PyMuPDF (`fitz`), raise HTTP 422 if no text extracted
    - Text path: accept `TextUploadRequest` JSON body (Pydantic handles min/max length → HTTP 422/413)
    - For both paths: call `normalise()`, catch `ValueError` → HTTP 422; call `transform()`; compute cosine similarity against each vector from `get_concept_vectors()`; set `is_gap = score < 0.35`; return `UploadResponse`
    - Log all HTTP 5xx errors to stdout using Python `logging` at `ERROR` level with timestamp, path, detail
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 2.4, 2.5, 3.4, 5.1, 5.2, 5.3, 5.4, 9.4_

  - [ ]* 7.2 Write unit tests for the upload router in `backend/tests/test_upload.py`
    - Mock `normalise` and `transform` to isolate router logic
    - Test file-size-exceeded → 413
    - Test non-PDF MIME → 415
    - Test empty-text normalisation error → 422
    - Test valid JSON text payload → 200 with 20 `ConceptScore` entries
    - _Requirements: 1.5, 1.6, 1.8, 2.5, 5.3_

  - [ ]* 7.3 Write property test — PBT 3: gap score range and `is_gap` consistency
    - **Property 3: every `ConceptScore` has `score` in [0, 1] and `is_gap == (score < 0.35)`**
    - Drive the gap-analysis logic directly (not via HTTP); use `@given(text=st.text(min_size=50))`; filter inputs where `normalise` raises
    - Place in `backend/tests/test_gap_analysis.py`
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 8. Implement `routers/quiz.py`
  - [x] 8.1 Write `backend/routers/quiz.py` with `POST /quiz`
    - Accept `QuizRequest` JSON body; return HTTP 400 if `concepts` list is empty
    - Load `GEMINI_API_KEY` from environment via `python-dotenv`
    - For each concept, build a Gemini prompt requesting exactly 3 multiple-choice questions as a JSON array; each element: `prompt`, `options` (4 distinct strings), `correct_index` (0–3), `concept`
    - Use `httpx` with a 10-second timeout; catch HTTP errors → 502, timeout → 504
    - Parse the LLM JSON response; catch parse errors → 422 with truncated raw response in `detail`
    - Validate parsed questions with the `QuizQuestion` Pydantic model
    - Return `QuizResponse`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 8.2 Write unit tests for the quiz router in `backend/tests/test_quiz.py`
    - Test empty concept list → 400
    - Test Gemini HTTP error → 502
    - Test unparseable LLM response → 422
    - Test valid mocked Gemini response → 200 with correct question structure
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 8.3 Write property test — PBT 4: quiz question structure completeness
    - **Property 4: every `QuizQuestion` has non-empty `prompt`, exactly 4 distinct non-empty `options`, `correct_index` in [0, 3], and `concept` matching a requested concept**
    - Mock the Gemini HTTP call; use `@given(concepts=st.lists(st.sampled_from([c["name"] for c in CONCEPT_GRAPH]), min_size=1, max_size=5))`
    - Place in `backend/tests/test_quiz.py`
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 8.4 Write property test — PBT 5: exactly 3 questions per concept
    - **Property 5: for N distinct concept names the response contains exactly 3 × N questions with exactly 3 per concept**
    - Mock the Gemini HTTP call; use `@given(concepts=st.lists(..., unique=True, min_size=1, max_size=5))`
    - Place in `backend/tests/test_quiz.py`
    - **Validates: Requirements 6.2**

- [x] 9. Implement `main.py` and wire everything together
  - [x] 9.1 Write `backend/main.py`
    - Create the `FastAPI` app instance with `title="AI Study Companion"`
    - Add `CORSMiddleware` allowing origin `http://localhost:5173`, all methods, all headers
    - Import and register `upload_router` with prefix `/api/v1` and `quiz_router` with prefix `/api/v1`
    - Import `tfidf_engine` at module level so the vectoriser is fitted at startup before any request is served
    - _Requirements: 1.4, 6.1, 8.4 (CORS)_

  - [ ]* 9.2 Write integration tests in `backend/tests/test_integration.py`
    - Use `httpx.AsyncClient` with the FastAPI `app` as ASGI transport (no real server)
    - Test: POST `/api/v1/upload` with a real 1-page PDF → 200, 20 concept scores
    - Test: POST `/api/v1/upload` with valid JSON text → 200, 20 concept scores
    - Test: POST `/api/v1/upload` with oversized mock payload → 413
    - Test: POST `/api/v1/quiz` with valid concepts (Gemini mocked) → 200
    - Test: POST `/api/v1/quiz` with empty list → 400
    - _Requirements: 1.5, 2.5, 5.3, 6.5_

- [ ] 10. Final checkpoint — full test suite
  - Run the complete test suite: `cd backend && pytest tests/ -v`
  - Ensure all non-optional tests pass and no import errors occur at startup
  - Ask the user if any questions arise before considering the backend complete.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements from `requirements.md` for traceability
- PBT tasks reference the property number from `design.md` Correctness Properties section
- Checkpoints (tasks 5 and 10) are manual verification gates; run pytest commands shown there
- The Gemini API key must be set in `backend/.env` as `GEMINI_API_KEY=...` before running the quiz router
- All implementation uses Python 3.11+; pin dependency versions in `pyproject.toml`
