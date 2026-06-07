import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Loader2, Sparkles,
  BookOpen, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { generateQuiz } from '../api/client'

const QUIZ_THRESHOLD = 0.4

function getTier(score) {
  if (score < 0.3) return 'weak'
  if (score < 0.6) return 'moderate'
  return 'strong'
}

const TIER = {
  weak:     { bar: 'linear-gradient(90deg,#ef4444,#f87171)', color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.28)',  glow: '0 0 18px rgba(239,68,68,0.18),0 0 40px rgba(239,68,68,0.07)', label: 'Weak',     Icon: TrendingDown, cardBg: 'rgba(239,68,68,0.04)' },
  moderate: { bar: 'linear-gradient(90deg,#f59e0b,#fbbf24)', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.22)', glow: 'none',                                                           label: 'Moderate',  Icon: Minus,        cardBg: 'rgba(251,191,36,0.02)' },
  strong:   { bar: 'linear-gradient(90deg,#22d3ee,#34d399)', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)',  glow: 'none',                                                           label: 'Strong',    Icon: TrendingUp,   cardBg: 'rgba(52,211,153,0.02)' },
}

/* ── Skeleton card ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl border"
      style={{ borderColor: 'rgba(99,102,241,0.1)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex justify-between items-start gap-2">
        <div className="skeleton h-4 w-28 rounded-lg" />
        <div className="skeleton h-5 w-16 rounded-md" />
      </div>
      <div className="skeleton h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-14 rounded" />
        <div className="skeleton h-4 w-10 rounded" />
      </div>
    </div>
  )
}

/* ── Score bar ─────────────────────────────────────────────────── */
function ScoreBar({ score, tier }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(score * 100)}%` }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: TIER[tier].bar }}
      />
    </div>
  )
}

/* ── Concept card ──────────────────────────────────────────────── */
function ConceptCard({ concept, score, index }) {
  const tier   = getTier(score)
  const t      = TIER[tier]
  const pct    = Math.round(score * 100)
  const Icon   = t.Icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.05, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="flex flex-col gap-3 p-5 rounded-2xl border relative overflow-hidden cursor-default"
      style={{ background: t.cardBg, borderColor: t.border, boxShadow: t.glow }}
    >
      {/* Weak corner bleed */}
      {tier === 'weak' && (
        <div aria-hidden className="pointer-events-none absolute -top-5 -left-5 w-20 h-20 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(239,68,68,0.2),transparent 70%)' }} />
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-200 capitalize leading-snug flex-1 min-w-0 truncate">
          {concept}
        </p>
        <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
          style={{ background: t.bg, color: t.color }}>
          <Icon size={10} />
          {t.label}
        </span>
      </div>

      <ScoreBar score={score} tier={tier} />

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#475569' }}>Coverage</p>
        <p className="text-sm font-bold tabular-nums" style={{ color: t.color }}>{pct}%</p>
      </div>
    </motion.div>
  )
}

/* ── Stat pill ─────────────────────────────────────────────────── */
function StatPill({ count, label, color, bg }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-default"
      style={{ background: bg, color }}
    >
      <span className="text-sm font-extrabold tabular-nums">{count}</span>
      {label}
    </motion.div>
  )
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function ResultsView({ subject, concepts, onBack, onQuiz }) {
  const [loading, setLoading] = useState(false)

  const sorted = [...concepts].sort((a, b) => {
    const order = { weak: 0, moderate: 1, strong: 2 }
    const ta = getTier(a.score), tb = getTier(b.score)
    if (order[ta] !== order[tb]) return order[ta] - order[tb]
    return ta === 'strong' ? b.score - a.score : a.score - b.score
  })

  const weak     = concepts.filter((c) => getTier(c.score) === 'weak').length
  const moderate = concepts.filter((c) => getTier(c.score) === 'moderate').length
  const strong   = concepts.filter((c) => getTier(c.score) === 'strong').length
  const quizList = concepts.filter((c) => c.score < QUIZ_THRESHOLD).sort((a,b) => a.score - b.score).map((c) => c.concept)

  async function handleQuiz() {
    if (loading || !quizList.length) return
    setLoading(true)
    try {
      onQuiz(await generateQuiz(subject, quizList))
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not generate quiz.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen flex flex-col items-center px-4 pt-20 pb-16 overflow-hidden"
    >
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[320px]"
          style={{ background: 'radial-gradient(ellipse,rgba(139,92,246,0.1),transparent 70%)' }} />
        {weak > 0 && (
          <div className="absolute bottom-0 left-0 w-[500px] h-[280px]"
            style={{ background: 'radial-gradient(ellipse,rgba(239,68,68,0.06),transparent 70%)' }} />
        )}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-overlay" />

      <div className="relative z-10 w-full max-w-4xl">

        {/* Back */}
        <motion.button
          onClick={onBack}
          disabled={loading}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium cursor-pointer disabled:opacity-30 select-none"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft size={14} />
          Back to notes
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={13} className="text-indigo-400" />
            <span className="text-sm font-medium" style={{ color: '#a5b4fc' }}>{subject}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Knowledge Analysis</h2>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
            {quizList.length === 0
              ? 'Your notes cover every concept well.'
              : `${quizList.length} concept${quizList.length !== 1 ? 's' : ''} below 40% — ready to quiz.`}
          </p>
        </motion.div>

        {/* Stat pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex flex-wrap items-center gap-2 mb-6"
        >
          <StatPill count={weak}     label="weak"     color="#f87171" bg="rgba(239,68,68,0.1)" />
          <StatPill count={moderate} label="moderate" color="#fbbf24" bg="rgba(251,191,36,0.1)" />
          <StatPill count={strong}   label="strong"   color="#34d399" bg="rgba(52,211,153,0.1)" />
          <span className="ml-auto text-xs" style={{ color: '#334155' }}>
            {concepts.length} total
          </span>
        </motion.div>

        {/* Grid — shows skeletons while quiz loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {loading
            ? Array.from({ length: concepts.length }, (_, i) => <SkeletonCard key={i} />)
            : sorted.map((c, i) => (
                <ConceptCard key={c.concept} concept={c.concept} score={c.score} index={i} />
              ))
          }
        </div>

        {/* Quiz CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 + sorted.length * 0.05 }}
        >
          {quizList.length > 0 ? (
            <>
              <motion.button
                onClick={handleQuiz}
                disabled={loading}
                whileHover={!loading ? { scale: 1.018, y: -2 } : {}}
                whileTap={!loading ? { scale: 0.975 } : {}}
                className="btn-glow w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                aria-busy={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" /> Generating Quiz…
                    </motion.span>
                  ) : (
                    <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <Sparkles size={17} /> Quiz Me on Weak Topics
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <p className="mt-2.5 text-center text-xs" style={{ color: '#475569' }}>
                {quizList.length} concept{quizList.length !== 1 ? 's' : ''} · 1 question + explanation each · Gemini
              </p>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold"
              style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
              🎉 All concepts covered — no quiz needed!
            </div>
          )}
        </motion.div>

      </div>
    </motion.div>
  )
}
