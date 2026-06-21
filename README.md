# AI Study Companion

An AI-powered study tool that helps students master their subjects by analyzing their notes (text or PDF) and generating targeted quiz questions based on their weak areas.

## 🚀 Features

- **Note Analysis**: Upload your study notes as plain text or PDF.
- **Concept Extraction**: Uses Google's Gemini LLM to extract key concepts from your notes.
- **Coverage Scoring**: Calculates TF-IDF cosine similarity to score how well your notes cover the subject.
- **Targeted Quizzes**: Generates interactive quiz questions focused on the concepts you need to work on the most.
- **Modern UI**: A sleek, responsive, and interactive frontend built with React, Tailwind CSS, and Framer Motion.

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **AI/LLM**: Google Gemini API
- **Document Processing**: `pdfplumber` for PDF parsing
- **NLP & Scoring**: `scikit-learn` for TF-IDF vectorization and cosine similarity
- **Testing**: `pytest`, `pytest-asyncio`

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **File Uploads**: `react-dropzone`
- **HTTP Client**: `axios`

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sajidmehmoodtariq-dev/Ship_with_KIRO.git
   cd Ship_with_KIRO
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```
   Create a `.env` file in the `backend` directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

You will need two terminal windows to run the frontend and backend simultaneously.

1. **Start the Backend Server (Terminal 1):**
   ```bash
   cd backend
   # Make sure your virtual environment is activated
   uvicorn main:app --reload
   ```
   The backend will be available at `http://localhost:8000`. You can view the API documentation at `http://localhost:8000/docs`.

2. **Start the Frontend Server (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## 📡 Core API Endpoints

- `POST /api/v1/analyze`: Analyze plain text notes for a given subject to extract concepts and coverage scores.
- `POST /api/v1/analyze/pdf`: Upload a PDF document for analysis to extract concepts and coverage scores.
- `POST /api/v1/quiz`: Submit weak concepts to receive an explanation and a targeted quiz question.
- `GET /health`: Basic health check endpoint.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.