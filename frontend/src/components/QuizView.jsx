import { useState, useRef } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import {
  CheckCircle2, XCircle, ChevronRight,
  Trophy, BookOpen, Lightbulb, RotateCcw,
  Frown, Meh, Smile, Star,
} from 'lucide-react'

const LETTERS = ['A', 'B', 'C', 'D']

const GRADES = [
  { min: 90, emoji: '🏆', Icon: Star,  headline: 'Outstanding!',  color: '#fbbf24', glow: 'rgba(251,191,36,0.22)',
    message: "You clearly know this material well. Keep that momentum going." },
  { min: 70, emoji: '🎯', Icon: Smile, headline: 'Great Work!',   color: '#34d399', glow: 'rgba(52,211,153,0.2)',
    message: "Solid performance. A little more revision on the ones you missed and you'll be unstoppable." },
  { min: 50, emoji: '📖', Icon: Meh,   headline: 'Good Effort',   color: '#a5b4fc', glow: 'rgba(165,180,252,0.18)',
    message: "You're getting there. Read through each explanation and come back for another round." },
  { min: 0,  emoji: '💡', Icon: Frown, headline: 'Keep Going',    color: '#f87171', glow: 'rgba(248,113,113,0.2)',
    message: "These are tricky concepts. Read the explanations, take notes, then try again." },
]

const grade = (pct) => GRADES.find((g) => pct >= g.min)

/* ── Progress bar ─────────────────────────────────────────────── */
function ProgressBar({ current, total, answered }) {
  const pct = ((current + (answered ? 1 : 0)) / total) * 100
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg,#6366f1,#a78bfa)' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ── Option card ──────────────────────────────────────────────── */
function OptionCard({ label, index, selectedIdx, correctAnswer, options, answered, onSelect }) {
  const controls   = useAnimation()
  const shook      = useRef(false)
  const isSelected    = selectedIdx === index
  const isCorrect     = options[index] === correctAnswer
  const revealCorrect = answered && isCorrect
  const revealWrong   = answered && isSelected && !isCorrect

  if (revealWrong && !shook.current) {
    shook.current = true
    controls.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.44, ease: 'easeInOut' } })
  }

  let border = 'rgba(99,102,241,0.17)',  bg = 'rgba(255,255,255,0.025)', color = '#94a3b8', shadow = 'none'
  if (revealCorrect) { border = 'rgba(52,211,153,0.55)'; bg = 'rgba(52,211,153,0.08)'; color = '#34d399'; shadow = '0 0 14px rgba(52,211,153,0.14)' }
  else if (revealWrong) { border = 'rgba(239,68,68,0.55)'; bg = 'rgba(239,68,68,0.08)'; color = '#f87171'; shadow = '0 0 14px rgba(239,68,68,0.14)' }
  else if (isSelected)  { border = 'rgba(99,102,241,0.55)'; bg = 'rgba(99,102,241,0.1)'; color = '#a5b4fc' }

  return (
    <motion.div animate={controls}>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 + index * 0.065, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => !answered && onSelect(index)}
        disabled={answered}
        whileHover={!answered ? { scale: 1.015, y: -1 } : {}}
        whileTap={!answered ? { scale: 0.982 } : {}}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-left text-sm font-medium transition-colors duration-200 select-none"
        style={{ borderColor: border, background: bg, color, boxShadow: shadow, cursor: answered ? 'default' : 'pointer', minHeight: '3.25rem' }}
        aria-pressed={isSelected}
        aria-label={`Option ${LETTERS[index]}: ${label}`}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors duration-150"
          style={{ background: revealCorrect ? 'rgba(52,211,153,0.18)' : revealWrong ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)', color }}
        >
          {LETTERS[index]}
        </span>
        <span className="flex-1 leading-snug">{label}</span>
        <AnimatePresence>
          {revealCorrect && (
            <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            </motion.span>
          )}
          {revealWrong && (
            <motion.span key="no" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <XCircle size={16} className="text-red-400 shrink-0" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}

/* ── Explanation panel ────────────────────────────────────────── */
function ExplanationPanel({ text, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="exp"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-4 p-4 rounded-2xl"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={12} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>Concept Explanation</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Score summary ────────────────────────────────────────────── */
function Summary({ correct, total, subject, onRestart }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const g   = grade(pct)
  const R = 52, C = 2 * Math.PI * R

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center gap-6 px-2"
    >
      <motion.span
        initial={{ scale: 0, rotate: -18 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 230, damping: 14 }}
        className="text-6xl select-none" aria-hidden
      >
        {g.emoji}
      </motion.span>

      {/* Ring */}
      <div className="relative">
        <svg width="148" height="148" role="img" aria-label={`Score: ${pct}%`}>
          <defs>
            <filter id="glow-r">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <motion.circle
            cx="74" cy="74" r={R} fill="none" stroke={g.color}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ delay: 0.28, duration: 1.2, ease: 'easeOut' }}
            transform="rotate(-90 74 74)" filter="url(#glow-r)"
          />
          <text x="74" y="70" textAnchor="middle" fill={g.color} fontSize="22" fontWeight="800" fontFamily="inherit">{pct}%</text>
          <text x="74" y="88" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="inherit">{correct} / {total}</text>
        </svg>
        <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 40px ${g.glow}`, borderRadius: '50%' }} />
      </div>

      <div className="max-w-xs">
        <p className="text-2xl font-extrabold" style={{ color: g.color }}>{g.headline}</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>{g.message}</p>
        <p className="mt-1.5 text-xs" style={{ color: '#334155' }}>{subject}</p>
      </div>

      <motion.button
        onClick={onRestart}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-white cursor-pointer select-none"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.28)' }}
      >
        <RotateCcw size={14} /> Try New Notes
      </motion.button>
    </motion.div>
  )
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function QuizView({ subject, items, onRestart }) {
  const [idx, setIdx]                 = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [answers, setAnswers]         = useState([])
  const [done, setDone]               = useState(false)
  const [dir, setDir]                 = useState(1)

  const item     = items[idx]
  const answered = selectedIdx !== null
  const correct  = answered && item.options[selectedIdx] === item.correct_answer

  function handleSelect(i) { if (!answered) setSelectedIdx(i) }

  function handleNext() {
    setAnswers((p) => [...p, item.options[selectedIdx] === item.correct_answer])
    setDir(1)
    if (idx + 1 >= items.length) { setDone(true) }
    else { setIdx((i) => i + 1); setSelectedIdx(null) }
  }

  const slideV = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ?  44 : -44 }),
    center:       ({ opacity: 1, x: 0 }),
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -44 :  44 }),
  }

  return (
    <motion.div
      key="quiz"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12 overflow-hidden"
    >
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[640px] h-[280px]"
          style={{ background: 'radial-gradient(ellipse,rgba(139,92,246,0.1),transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[380px] h-[240px]"
          style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.06),transparent 70%)' }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-overlay" />

      <div className="relative z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="sum" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.38, ease: [0.16,1,0.3,1] }}>
              <Summary correct={answers.filter(Boolean).length} total={items.length} subject={subject} onRestart={onRestart} />
            </motion.div>
          ) : (
            <motion.div key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {/* Header: concept pill + counter */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', color: '#a5b4fc' }}>
                  <BookOpen size={11} />
                  <span className="capitalize">{item.concept}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: '#475569' }}>
                  {idx + 1} <span style={{ color: '#1e293b' }}>/ {items.length}</span>
                </span>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <ProgressBar current={idx} total={items.length} answered={answered} />
              </div>

              {/* Sliding card */}
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={idx}
                  custom={dir}
                  variants={slideV}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="glass rounded-3xl p-5 sm:p-6 mb-4"
                >
                  <p className="text-base font-semibold leading-snug text-slate-100 mb-5">
                    {item.question}
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {item.options.map((opt, i) => (
                      <OptionCard
                        key={`${idx}-${i}`}
                        label={opt} index={i}
                        selectedIdx={selectedIdx}
                        correctAnswer={item.correct_answer}
                        options={item.options}
                        answered={answered}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>

                  {/* Feedback */}
                  <AnimatePresence>
                    {answered && (
                      <motion.div key="fb" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                        className="mt-4 flex items-center gap-2 text-sm font-semibold"
                        style={{ color: correct ? '#34d399' : '#f87171' }}>
                        {correct
                          ? <><CheckCircle2 size={14} /> Correct!</>
                          : <><XCircle size={14} /> Correct: &ldquo;{item.correct_answer}&rdquo;</>}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <ExplanationPanel text={item.explanation} show={answered} />
                </motion.div>
              </AnimatePresence>

              {/* Next / Finish */}
              <AnimatePresence>
                {answered && (
                  <motion.button
                    key="next"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.25 }}
                    onClick={handleNext}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.975 }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white cursor-pointer select-none"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.26)' }}
                  >
                    {idx + 1 >= items.length
                      ? <><Trophy size={15} /> See My Results</>
                      : <>Next Question <ChevronRight size={15} /></>}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
