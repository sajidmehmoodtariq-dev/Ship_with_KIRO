# Design Document — AI Study Companion Backend

## Overview

The AI Study Companion backend is a FastAPI application that provides two REST endpoints: `POST /api/v1/upload` and `POST /api/v1/quiz`. The upload endpoint accepts a PDF file (multipart/form-data) or plain text (JSON), extracts and normalises the text, runs TF-IDF vectorisation with scikit-learn, and returns a gap-analysis result by comparing the student vector against a hardcoded concept graph of 20 education topics. The quiz endpoint accepts a list of weak concepts, calls the Gemini LLM API, and returns structured multiple-choice questions.

The backend is intentionally stateless: every request carries all the information needed to produce a response. No database or session store is required in v1.

### Design Goals

- **Correctness first** — TF-IDF fitting happens once at startup on a deterministic vocabulary, so every request uses the same vectoriser.
- **Clear separation of concerns** — normalisation, vectorisation, and gap scoring live in dedicated modules so they can be tested and replaced independently.
- **Fail fast and loudly** — startup validates the concept graph; any structural problem raises immediately with a descriptive log message.
- **Minimal surface area** — two router files, two model files, and three helper modules keep the codebase navigable.

---

## Architecture

The application follows a linear pipeline per request:

```
Client
  │
  ▼
FastAPI (main.py)
  ├── CORS middleware (http://localhost:5173)
  ├── POST /api/v1/upload  ──► routers/upload.py
  │                               │
  │                        ┌──────┴──────────────────────┐
  │                        ▼                             ▼
  │                  PDF path                      JSON text path
  │                  PyMuPDF (fitz)                raw `content` string
  │                        │                             │
  │                        └──────────┬──────────────────┘
  │                                   ▼
  │                            normaliser.py
  │                         (lowercase, strip punct,
  │                          remove stop words)
  │                                   │
  │                                   ▼
  │                           tfidf_engine.py
  │                     (transform with pre-fitted vectoriser)
  │                                   │
  │                                   ▼
  │                       cosine similarity vs each concept
  │                       → ConceptScore list + is_gap flags
  │
  └── POST /api/v1/quiz   ──► routers/quiz.py
                                      │
                                      ▼
                              Gemini LLM API (HTTP)
                                      │
                                      ▼
                              parse & validate response
                              → QuizQuestion list
```

### Startup Sequence

```
uvicorn starts
  → main.py imports concept_graph.py  (raises if malformed)
  → main.py imports tfidf_engine.py   (fits vectoriser on concept keywords)
  → routers registered
  → app ready to serve
```

---

## Components and Interfaces

### `main.py`

Constructs the FastAPI application, attaches CORS middleware, and registers the two routers. Also triggers vectoriser fitting on import so any startup failure surfaces before the server accepts traffic.

```python
app = FastAPI(title="AI Study Companion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api/v1")
app.include_router(quiz_router,   prefix="/api/v1")
```

---

### `concept_graph.py`

Defines the static concept graph as a Python list of dicts. Loaded at import time; the application raises `RuntimeError` on startup if the structure is invalid.

**Interface:**

```python
CONCEPT_GRAPH: list[dict]  # [{"name": str, "keywords": list[str]}, ...]
```

**20 hardcoded concepts:**

| # | name | representative keywords (non-exhaustive) |
|---|------|------------------------------------------|
| 1 | math | arithmetic, number, equation, integer, fraction |
| 2 | algebra | variable, expression, polynomial, linear, coefficient |
| 3 | calculus | derivative, integral, limit, differentiation, continuity |
| 4 | probability | chance, event, distribution, random, likelihood |
| 5 | grammar | sentence, noun, verb, syntax, clause |
| 6 | essay writing | thesis, argument, paragraph, structure, introduction |
| 7 | biology | cell, organism, evolution, species, metabolism |
| 8 | cells | membrane, nucleus, mitosis, organelle, cytoplasm |
| 9 | genetics | gene, dna, allele, chromosome, heredity |
| 10 | chemistry | element, compound, molecule, reaction, bond |
| 11 | atoms | proton, neutron, electron, nucleus, orbital |
| 12 | reactions | reactant, product, catalyst, equilibrium, exothermic |
| 13 | physics | energy, force, mass, velocity, acceleration |
| 14 | motion | displacement, velocity, speed, kinematics, trajectory |
| 15 | forces | newton, tension, friction, gravity, torque |
| 16 | history | civilization, empire, war, revolution, timeline |
| 17 | geography | continent, climate, topography, region, latitude |
| 18 | programming | variable, function, loop, algorithm, syntax |
| 19 | data structures | array, list, tree, graph, hash |
| 20 | algorithms | sort, search, complexity, recursion, iteration |

---

### `normaliser.py`

Pure-function module for text cleaning. No external state.

**Interface:**

```python
def normalise(text: str) -> str:
    """
    1. Lowercase all characters.
    2. Remove punctuation and special characters (keep ASCII letters and spaces).
    3. Tokenise on whitespace.
    4. Remove tokens present in scikit-learn's English stop-word set.
    5. Join remaining tokens back into a single string.
    Raises ValueError if the result is empty.
    """
```

**Implementation notes:**
- Uses `sklearn.feature_extraction.text.ENGLISH_STOP_WORDS` for the stop-word set.
- Uses `str.translate` with `str.maketrans` for punctuation removal (no regex dependency at runtime).
- Numeric-only tokens are dropped.

---

### `tfidf_engine.py`

Holds the fitted `TfidfVectorizer` instance as module-level state, initialised at import time.

**Interface:**

```python
# module-level, fitted once at import
vectorizer: TfidfVectorizer

def get_concept_vectors() -> dict[str, np.ndarray]:
    """Returns a dict mapping concept name → unit-normalised TF-IDF vector."""

def transform(text: str) -> np.ndarray:
    """
    Transforms a pre-normalised text string into a unit-normalised TF-IDF
    vector using the fitted vectorizer. Returns a 1-D numpy array.
    """
```

**Fitting procedure:**

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from concept_graph import CONCEPT_GRAPH

_corpus = [" ".join(c["keywords"]) for c in CONCEPT_GRAPH]
_names  = [c["name"] for c in CONCEPT_GRAPH]

vectorizer = TfidfVectorizer(norm="l2")
_concept_matrix = vectorizer.fit_transform(_corpus)   # shape: (20, vocab_size)
```

The vectoriser is fitted on the concept keyword strings. Student text is transformed (not fitted) using the same instance, ensuring identical vocabulary dimensionality.

---

### `routers/upload.py`

Handles `POST /api/v1/upload`. Accepts either:
- `multipart/form-data` with a `file` field (PDF), or
- `application/json` with a `content` field (plain text)

FastAPI differentiates these via the presence of the `file` field in the form data vs. a JSON body; the router provides two separate path operation functions or a unified handler with optional parameters.

**Processing steps:**
1. Validate file type / size (PDF path) or character count (text path).
2. Extract text (PDF → PyMuPDF; text → direct).
3. Pass to `normalise()`.
4. Pass normalised text to `transform()`.
5. Compute cosine similarity against every concept vector.
6. Build and return `UploadResponse`.

**Error responses:**
| Condition | Status | `detail` |
|-----------|--------|---------|
| File > 20 MB | 413 | "File exceeds the 20 MB limit" |
| Not a PDF | 415 | "Only PDF files are accepted" |
| No text extracted | 422 | "No extractable text found in the PDF" |
| Normalised text empty | 422 | "Text contains no meaningful content after normalisation" |
| Text > 500 000 chars | 413 | "Text payload exceeds the 500 000 character limit" |

---

### `routers/quiz.py`

Handles `POST /api/v1/quiz`. Accepts a JSON body with a list of concept names, calls the Gemini API, and returns structured questions.

**Gemini prompt strategy:**

For each concept, one prompt is constructed requesting exactly 3 multiple-choice questions in a JSON-parseable format. The model is instructed to return a JSON array where each element has `prompt`, `options` (array of 4 distinct strings), `correct_index` (0–3), and `concept` fields.

**Error responses:**
| Condition | Status | `detail` |
|-----------|--------|---------|
| Empty concept list | 400 | "At least one gap concept is required" |
| Gemini API error | 502 | "Quiz generation failed: {upstream detail}" |
| Unparseable LLM response | 422 | "Quiz response could not be parsed" |

---

## Data Models

All request/response schemas are Pydantic models.

### `models/upload.py`

```python
from pydantic import BaseModel, Field
from typing import Literal

class TextUploadRequest(BaseModel):
    content: str = Field(..., min_length=50, max_length=500_000)

class ConceptScore(BaseModel):
    concept: str
    score: float = Field(..., ge=0.0, le=1.0)
    is_gap: bool

class UploadResponse(BaseModel):
    concepts: list[ConceptScore]
```

### `models/quiz.py`

```python
from pydantic import BaseModel, Field

class QuizRequest(BaseModel):
    concepts: list[str] = Field(..., min_length=1)

class QuizQuestion(BaseModel):
    prompt: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    concept: str

class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
```

### Schema Diagram

```
UploadResponse
└── concepts: ConceptScore[]
    ├── concept: str          e.g. "calculus"
    ├── score: float          e.g. 0.12
    └── is_gap: bool          true if score < 0.35

QuizResponse
└── questions: QuizQuestion[]
    ├── prompt: str           "What is the derivative of x²?"
    ├── options: str[4]       ["2x", "x²", "x", "2"]
    ├── correct_index: int    0
    └── concept: str          "calculus"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Normalisation idempotence

*For any* valid input string, applying `normalise()` twice shall produce the same result as applying it once: `normalise(normalise(text)) == normalise(text)`.

**Validates: Requirements 3.5**

---

### Property 2: TF-IDF vector dimensionality invariant

*For any* non-empty normalised text string (including strings with tokens entirely outside the concept vocabulary), `transform(text)` shall return a vector with the same number of dimensions as the concept-graph vocabulary, and that vector's L2 norm shall be 1.0.

**Validates: Requirements 4.3, 4.4**

---

### Property 3: Gap score range invariant

*For any* valid upload (PDF or text), every `ConceptScore` in the response shall have a `score` value in the closed interval [0, 1], and `is_gap` shall be `true` if and only if `score < 0.35`.

**Validates: Requirements 5.1, 5.2, 5.4**

---

### Property 4: Quiz question structure completeness

*For any* non-empty list of concept names sent to `POST /api/v1/quiz`, every `QuizQuestion` in the response shall have a non-empty `prompt`, exactly four distinct non-empty strings in `options`, a `correct_index` in [0, 3], and a `concept` that matches one of the requested concepts.

**Validates: Requirements 6.3, 6.4**

---

### Property 5: Quiz questions per concept

*For any* non-empty list of N distinct concept names, the response shall contain exactly 3 × N questions, with exactly 3 questions per distinct concept.

**Validates: Requirements 6.2**

---

### Property 6: Empty whitespace text is rejected

*For any* string composed entirely of whitespace characters (including the empty string), `normalise()` shall raise a `ValueError` (propagating to an HTTP 422 response from the upload endpoint).

**Validates: Requirements 3.4**

---

## Error Handling

### Upload endpoint

- **File size check** happens before PDF parsing to avoid loading the entire file into memory unnecessarily.
- **PyMuPDF exceptions** (corrupted PDF, password-protected) are caught and re-raised as HTTP 422.
- **Empty normalisation result** raises `ValueError` in `normalise()`, caught in the router and converted to HTTP 422.
- **All 5xx errors** are logged to stdout with `timestamp | path | detail` using Python's standard `logging` module at `ERROR` level.

### Quiz endpoint

- **Gemini HTTP errors** (4xx/5xx from the upstream API) are caught and surfaced as HTTP 502 so the client knows the problem is upstream.
- **JSON parse failures** on the LLM response are caught and returned as HTTP 422 with the raw response truncated to 200 chars in the `detail` for debuggability.
- **Timeout** — `httpx` (or `requests`) client is configured with a 10-second timeout; timeout raises HTTP 504.

### Startup validation

`concept_graph.py` runs a validation function at module level:

```python
def _validate():
    assert isinstance(CONCEPT_GRAPH, list), "CONCEPT_GRAPH must be a list"
    assert len(CONCEPT_GRAPH) >= 20,        "CONCEPT_GRAPH must have at least 20 concepts"
    for c in CONCEPT_GRAPH:
        assert "name" in c and c["name"],          f"concept missing name: {c}"
        assert "keywords" in c and c["keywords"],  f"concept missing keywords: {c}"

_validate()
```

Any assertion failure raises at import time, preventing uvicorn from finishing startup.

---

## Testing Strategy

### Unit Tests

Unit tests cover pure functions with no I/O:

| Module | What to test |
|--------|-------------|
| `normaliser.py` | Lowercase conversion; punctuation removal; stop-word removal; numeric token removal; empty-result `ValueError`; mixed valid/invalid input |
| `concept_graph.py` | All 20 concepts present; every concept has non-empty `name` and `keywords` |
| `tfidf_engine.py` | Vector dimensionality matches vocabulary size; L2 norm ≈ 1.0; OOV tokens do not raise; concept vector dict has 20 entries |
| `routers/upload.py` | File size limit (mock); MIME rejection; empty-text 422; happy-path response shape |
| `routers/quiz.py` | Empty-concept-list 400; Gemini error → 502; happy-path response shape |

### Property-Based Tests

Property-based tests use **Hypothesis** (Python). Each test runs a minimum of 100 iterations.

#### PBT 1 — Normalisation idempotence
```
# Feature: ai-study-companion, Property 1: normalise(normalise(x)) == normalise(x)
@given(text=st.text(min_size=1))
def test_normalise_idempotent(text): ...
```

#### PBT 2 — TF-IDF vector dimensionality and unit norm
```
# Feature: ai-study-companion, Property 2: transform(x) has fixed dim and L2 norm == 1
@given(text=st.text(alphabet=st.characters(whitelist_categories=("Ll","Lu")), min_size=1))
def test_vector_shape_and_norm(text): ...
```

#### PBT 3 — Gap score range and is_gap consistency
```
# Feature: ai-study-companion, Property 3: score in [0,1] and is_gap == (score < 0.35)
@given(text=st.text(min_size=50))
def test_gap_score_invariant(text): ...
```
*Calls the analysis logic directly (bypasses HTTP layer) with a mock normalised text.*

#### PBT 4 — Quiz question structure completeness
```
# Feature: ai-study-companion, Property 4: every question has required fields and 4 distinct options
@given(concepts=st.lists(st.sampled_from([c["name"] for c in CONCEPT_GRAPH]), min_size=1, max_size=5))
def test_quiz_question_structure(concepts): ...
```
*Mocks the Gemini API call; exercises the parsing and validation logic.*

#### PBT 5 — Quiz questions per concept
```
# Feature: ai-study-companion, Property 5: exactly 3 questions per concept
@given(concepts=st.lists(st.sampled_from([c["name"] for c in CONCEPT_GRAPH]), min_size=1, max_size=5, unique=True))
def test_quiz_count_per_concept(concepts): ...
```
*Mocks the Gemini API call.*

#### PBT 6 — Empty/whitespace text rejected
```
# Feature: ai-study-companion, Property 6: whitespace-only input raises ValueError
@given(text=st.text(alphabet=" \t\n\r", min_size=0))
def test_whitespace_raises(text): ...
```

### Integration Tests

A small set of integration tests run against the live FastAPI app (using `httpx.AsyncClient` with `app` as the ASGI transport, no real server needed):

- Upload a real 1-page PDF → expect 200 with 20 concept scores.
- Upload valid JSON text → expect 200 with 20 concept scores.
- Upload oversized mock payload → expect 413.
- POST `/quiz` with valid concepts (Gemini mocked) → expect 200.
- POST `/quiz` with empty list → expect 400.

### Test Layout

```
backend/
└── tests/
    ├── test_normaliser.py       # unit + PBT 1, 6
    ├── test_tfidf_engine.py     # unit + PBT 2
    ├── test_gap_analysis.py     # unit + PBT 3
    ├── test_quiz.py             # unit + PBT 4, 5
    └── test_integration.py     # integration tests
```
