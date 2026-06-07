# AI Study Companion — Project Steering Guide

## Overview

An AI-powered web application that helps students identify knowledge gaps and reinforces learning through targeted quizzes. Students upload PDF notes or paste text; the system compares content against a built-in concept graph using TF-IDF + cosine similarity, then generates quiz questions focused on weak areas.

---

## Tech Stack

### Frontend
| Tool | Version | Notes |
|------|---------|-------|
| React | 19 | Functional components + hooks only |
| Vite | 8 | Build tool; dev server on `frontend/` |
| Tailwind CSS | v4 | Uses `@tailwindcss/vite` plugin (no `tailwind.config.js` needed) |
| Framer Motion | 12 | Animations and transitions |
| axios | 1.x | HTTP client for API calls |
| lucide-react | latest | Icon library |
| react-dropzone | 15 | File upload drag-and-drop |
| react-hot-toast | 2 | Toast notifications |

### Backend
| Tool | Notes |
|------|-------|
| FastAPI | REST API; runs in `backend/` |
| scikit-learn | TF-IDF vectorisation, cosine similarity |
| PyMuPDF or pdfplumber | PDF text extraction |
| Python 3.11+ | Runtime |

---

## Project Structure

```
/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── App.jsx         # Root component (currently empty)
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Global styles (Tailwind imports)
│   ├── public/
│   ├── vite.config.js      # Tailwind + React plugins
│   └── package.json
├── backend/                # FastAPI app
│   └── .env                # Environment variables (do not commit secrets)
└── .kiro/
    ├── specs/              # Feature specs
    └── steering/           # Project-level guidance
```

---

## Conventions

### Frontend
- Components: PascalCase `.jsx` files, one component per file
- Hooks: camelCase in `src/hooks/`
- API calls: centralised in `src/api/` using axios instances
- Styling: Tailwind utility classes only — no custom CSS unless unavoidable
- Animations: Framer Motion `motion.*` components for page transitions and micro-interactions
- Notifications: `react-hot-toast` for success/error feedback
- File upload: `react-dropzone` for drag-and-drop; also allow click-to-browse
- No class components; no `PropTypes` (use JSDoc or TypeScript if types are needed later)

### Backend
- Router modules per feature area (e.g. `routers/upload.py`, `routers/quiz.py`)
- Pydantic models for all request/response schemas
- CORS enabled for local development (`http://localhost:5173`)
- Environment variables loaded via `python-dotenv` from `.env`
- All endpoints return JSON; HTTP errors use FastAPI `HTTPException`

### API Design
- Base URL: `/api/v1`
- Upload endpoint: `POST /api/v1/upload` — accepts `multipart/form-data` (PDF) or JSON text
- Analysis endpoint: `POST /api/v1/analyze` — returns gap scores per concept
- Quiz endpoint: `POST /api/v1/quiz` — returns generated questions for identified gaps

---

## Constraints

- PDF parsing runs server-side; the frontend never processes raw PDF bytes
- TF-IDF and cosine similarity are computed with scikit-learn — do not introduce other ML frameworks
- The concept graph is a built-in static structure (not user-configurable in v1)
- No authentication in v1; the app is single-user / session-based
- Keep bundle size lean: avoid adding new frontend dependencies without justification
- Tailwind v4 uses a CSS-first config (`@theme` in CSS, not `tailwind.config.js`) — follow v4 patterns
- Do not create standalone markdown files outside `.kiro/`

---

## Development Commands

```bash
# Frontend
cd frontend && npm run dev       # dev server → http://localhost:5173
cd frontend && npm run build     # production build
cd frontend && npm run lint      # ESLint

# Backend (once set up)
cd backend && uvicorn main:app --reload  # dev server → http://localhost:8000
```
