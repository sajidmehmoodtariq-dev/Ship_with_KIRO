import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Trophy, BookOpen } from 'lucide-react'

function OptionButton({ label, index, selectedIndex, correctIndex, onSelect, disabled }) {
  const isSelected = selectedIndex === index
  const isCorrect = correctIndex === index
  const isWrong = isSelected && !isCorrect
  const showCorrect = disabled && isCorrect

  let borderColor = 'rgba(99,102,241,0.2)'
  let bg = 'rgba(255,255,255,0.02)'
  let textColor = '#94a3b8'
  let icon = null

  if (showCorrect) {
    borderColor = 'rgba(52,211,153,0.5)'
    bg = 'rgba(52,211,153,0.08)'
    textColor = '#34d399'
    icon = <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
  } else if (isWrong) {
    borderColor = 'rgba(239,68,68,0.5)'
    bg = 'rgba(239,68,68,0.08)'
    textColor = '#f87171'
    icon = <XCircle size={16} className="text-red-400 shrink-0" />
  } else if (isSelected) {
    borderColor = 'rgba(99,102,241,0.5)'
    bg = 'rgba(99,102,241,0.1)'
    textColor = '#a5b4fc'
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => !disabled && onSelect(index)}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-150"
      style={{
        borderColor,
        background: bg,
        color: textColor,
        cursor: disabled ? 'default' : 'pointer',
      }}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      aria-pressed={isSelected}
    >
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {String.fromCharCode(65 + index)}
      </span>
      <span className="flex-1">{label}</span>
      {icon}
    </motion.button>
  )
}

function ScoreSummary({ correct, total, onRestart }) {
  const pct = Math.round((correct / total) * 100)

  const grade =
    pct >= 80 ? { label: 'Excellent', color: '#34d399', icon: '🏆' }
    : pct >= 60 ? { label: 'Good job', color: '#a5b4fc', icon: '🎯' }
    : { label: 'Keep studying', color: '#f87171', icon: '📚' }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-6xl"
        aria-hidden="true"
      >
        {grade.icon}
      </motion.div>

      <div>
        <p className="text-4xl font-bold tabular-nums" style={{ color: grade.color }}>
          {correct} / {total}
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-200">{grade.label}</p>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          {pct}% correct
        </p>
      </div>

      {/* Score ring */}
      <svg width="120" height="120" className="-mt-2" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke={grade.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50}`}
          strokeDashoffset={2 * Math.PI * 50}
          animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - pct / 100) }}
          transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="65" textAnchor="middle" fill={grade.color} fontSize="18" fontWeight="700">
          {pct}%
        </text>
      </svg>

      <motion.button
        onClick={onRestart}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
        }}
      >
        <RotateCcw size={15} />
        Start Over
      </motion.button>
    </motion.div>
  )
}

export default function QuizView({ questions, onRestart }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)   // index of selected option for current Q
  const [answers, setAnswers] = useState([])        // {selected, correct} per question
  const [done, setDone] = useState(false)

  const q = questions[current]
  const isAnswered = selected !== null

  function handleSelect(idx) {
    if (isAnswered) return
    setSelected(idx)
  }

  function handleNext() {
    const newAnswers = [...answers, { selected, correct: q.correct_index }]
    setAnswers(newAnswers)

    if (current + 1 >= questions.length) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
    }
  }

  const correctCount = answers.filter((a) => a.selected === a.correct).length

  return (
    <motion.div
      key="quiz"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      {/* Ambient */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {done ? (
          <ScoreSummary
            correct={correctCount}
            total={questions.length}
            onRestart={onRestart}
          />
        ) : (
          <>
            {/* Progress header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
                <BookOpen size={14} />
                <span className="capitalize">{q.concept}</span>
              </div>
              <span className="text-sm font-medium tabular-nums" style={{ color: '#64748b' }}>
                {current + 1} / {questions.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                animate={{ width: `${((current + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border p-6 mb-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(99,102,241,0.18)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <p className="text-lg font-semibold leading-snug text-slate-100 mb-5">
                  {q.prompt}
                </p>

                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => (
                    <OptionButton
                      key={idx}
                      label={opt}
                      index={idx}
                      selectedIndex={selected}
                      correctIndex={q.correct_index}
                      onSelect={handleSelect}
                      disabled={isAnswered}
                    />
                  ))}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center gap-2 text-sm font-medium"
                      style={{
                        color: selected === q.correct_index ? '#34d399' : '#f87171',
                      }}
                    >
                      {selected === q.correct_index ? (
                        <><CheckCircle2 size={15} /> Correct!</>
                      ) : (
                        <><XCircle size={15} /> The correct answer was "{q.options[q.correct_index]}"</>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            <AnimatePresence>
              {isAnswered && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#fff',
                  }}
                >
                  {current + 1 >= questions.length ? (
                    <><Trophy size={15} /> See Results</>
                  ) : (
                    <>Next Question <ChevronRight size={15} /></>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  )
}
