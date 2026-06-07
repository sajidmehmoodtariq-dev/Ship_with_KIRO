import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import LandingView from './components/LandingView'
import UploadView   from './components/UploadView'
import ResultsView  from './components/ResultsView'
import QuizView     from './components/QuizView'

// Views: 'landing' | 'upload' | 'results' | 'quiz'

export default function App() {
  const [view, setView]           = useState('landing')
  const [concepts, setConcepts]   = useState([])   // ConceptScore[]
  const [questions, setQuestions] = useState([])   // QuizQuestion[]

  function handleResults(conceptScores) {
    setConcepts(conceptScores)
    setView('results')
  }

  function handleQuiz(quizQuestions) {
    setQuestions(quizQuestions)
    setView('quiz')
  }

  function handleRestart() {
    setConcepts([])
    setQuestions([])
    setView('landing')
  }

  return (
    <div className="noise min-h-screen" style={{ background: '#04081a' }}>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1847',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#0d1847' },
          },
          success: {
            iconTheme: { primary: '#34d399', secondary: '#0d1847' },
          },
        }}
      />

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <LandingView
            key="landing"
            onStart={() => setView('upload')}
          />
        )}

        {view === 'upload' && (
          <UploadView
            key="upload"
            onBack={() => setView('landing')}
            onResults={handleResults}
          />
        )}

        {view === 'results' && (
          <ResultsView
            key="results"
            concepts={concepts}
            onBack={() => setView('upload')}
            onQuiz={handleQuiz}
          />
        )}

        {view === 'quiz' && (
          <QuizView
            key="quiz"
            questions={questions}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
