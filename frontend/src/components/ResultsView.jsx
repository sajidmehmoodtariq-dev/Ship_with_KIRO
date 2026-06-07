import { motion } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { generateQuiz } from '../api/client'

const GAP_THRESHOLD = 0.35

function ScoreBar({ score, isGap }) {
  const pct = Math.round(score * 100)
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{
          background: isGap
            ? 'linear-gradient(90deg, #ef4444, #f97316)'
            : 'linear-gradient(90deg, #22d3ee, #34d399)',
        }}
      />
    </div>
  )
}

export default function ResultsView({ concepts, onBack, onQuiz }) {
  const [loading, setLoading] = useState(false)

  const gaps = concepts.filter((c) => c.is_gap)
  const covered = concepts.filter((c) => !c.is_gap)
  const sorted = [...gaps, ...covered]

  async function handleGenerateQuiz() {
    if (loading) return
    if (gaps.length === 0) {
      toast('No gaps detected — nothing to quiz!', { icon: '🎉' })
      return
    }
    setLoading(true)
    try {
      const gapNames = gaps.map((c) => c.concept)
      const result = await generateQuiz(gapNames)
      onQuiz(result.questions)
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        'Could not generate quiz. Is the backend running?'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative min-h-screen flex flex-col items-center px-6 py-16"
    >
      {/* Ambient */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* Back */}
      <motion.button
        onClick={onBack}
        disabled={loading}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -3 }}
        className="self-start mb-8 flex items-center gap-2 text-sm font-medium cursor-pointer disabled:opacity-40"
        style={{ color: '#94a3b8' }}
      >
        <ArrowLeft size={16} />
        Upload new notes
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 w-full max-w-2xl mb-6"
      >
        <h2 className="text-3xl font-bold text-slate-100">Knowledge Analysis</h2>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          {gaps.length === 0
            ? 'Great work — your notes cover everything well.'
            : `${gaps.length} gap${gaps.length !== 1 ? 's' : ''} found across ${concepts.length} concepts.`}
        </p>
      </motion.div>

      {/* Summary pills */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 flex gap-3 mb-6 w-full max-w-2xl"
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
        >
          <AlertTriangle size={14} />
          {gaps.length} gaps
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}
        >
          <CheckCircle2 size={14} />
          {covered.length} covered
        </div>
      </motion.div>

      {/* Concept list */}
      <div className="relative z-10 w-full max-w-2xl space-y-2 mb-10">
        {sorted.map((c, i) => (
          <motion.div
            key={c.concept}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.04, duration: 0.35 }}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
            style={{
              background: c.is_gap ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
              borderColor: c.is_gap ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.12)',
            }}
          >
            {/* Concept name */}
            <div className="w-36 shrink-0">
              <p className="text-sm font-medium capitalize text-slate-200">{c.concept}</p>
            </div>

            {/* Score bar */}
            <div className="flex-1">
              <ScoreBar score={c.score} isGap={c.is_gap} />
            </div>

            {/* Percentage */}
            <div className="w-12 text-right">
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: c.is_gap ? '#f87171' : '#34d399' }}
              >
                {Math.round(c.score * 100)}%
              </span>
            </div>

            {/* Badge */}
            <div className="w-20 text-right">
              {c.is_gap ? (
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                >
                  Gap
                </span>
              ) : (
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}
                >
                  OK
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Generate quiz CTA */}
      {gaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <motion.button
            onClick={handleGenerateQuiz}
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="glow-pulse w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating Quiz…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Quiz for {gaps.length} Gap{gaps.length !== 1 ? 's' : ''}
                <ChevronRight size={18} />
              </>
            )}
          </motion.button>
          <p className="mt-3 text-center text-xs" style={{ color: '#475569' }}>
            3 targeted questions per weak concept · powered by Gemini
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
