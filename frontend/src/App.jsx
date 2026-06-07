import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import Navbar       from './components/Navbar'
import LandingView  from './components/LandingView'
import InputView    from './components/InputView'
import ResultsView  from './components/ResultsView'
import QuizView     from './components/QuizView'

export default function App() {
  const [view, setView]         = useState('landing')
  const [subject, setSubject]   = useState('')
  const [concepts, setConcepts] = useState([])
  const [quizData, setQuizData] = useState(null)   // { subject, concepts: string[] }

  function handleResults(analyzeResponse) {
    setSubject(analyzeResponse.subject)
    setConcepts(analyzeResponse.concepts)
    setView('results')
  }

  function handleQuiz(quizPayload) {
    // quizPayload = { subject, concepts: string[] }
    setQuizData(quizPayload)
    setView('quiz')
  }

  function handleRestart() {
    setSubject('')
    setConcepts([])
    setQuizData(null)
    setView('landing')
  }

  return (
    <div className="min-h-screen" style={{ background: '#04081a' }}>
      {/* Fixed navbar — always visible */}
      <Navbar view={view} />

      {/* Toast — offset below navbar */}
      <Toaster
        position="top-right"
        containerStyle={{ top: 64 }}
        toastOptions={{
          style: {
            background: '#0d1847',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '12px',
            fontSize: '13px',
            maxWidth: '360px',
          },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0d1847' } },
          success: { iconTheme: { primary: '#34d399', secondary: '#0d1847' } },
        }}
      />

      {/* All views receive pt-14 to clear the 56px navbar */}
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <LandingView
            key="landing"
            onStart={() => setView('input')}
          />
        )}
        {view === 'input' && (
          <InputView
            key="input"
            onBack={() => setView('landing')}
            onResults={handleResults}
          />
        )}
        {view === 'results' && (
          <ResultsView
            key="results"
            subject={subject}
            concepts={concepts}
            onBack={() => setView('input')}
            onQuiz={handleQuiz}
          />
        )}
        {view === 'quiz' && quizData && (
          <QuizView
            key="quiz"
            subject={quizData.subject}
            concepts={quizData.concepts}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
