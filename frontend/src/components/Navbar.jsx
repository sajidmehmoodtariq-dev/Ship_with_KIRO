import { motion } from 'framer-motion'
import { BrainCircuit } from 'lucide-react'

/**
 * Fixed top navbar with blur backdrop.
 * Receives `view` so it can show a subtle current-view breadcrumb on md+.
 */
const VIEW_LABELS = {
  landing:  null,
  input:    'Analyze',
  results:  'Results',
  quiz:     'Quiz',
}

export default function Navbar({ view }) {
  const label = VIEW_LABELS[view] ?? null

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="nav-blur fixed top-0 left-0 right-0 z-50 h-14"
      role="banner"
    >
      <div className="max-w-5xl mx-auto h-full px-5 flex items-center justify-between">

        {/* Logo mark */}
        <div className="flex items-center gap-2.5 select-none">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <BrainCircuit size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-100">
            StudyCompanion
          </span>
        </div>

        {/* Breadcrumb — only on sm+ when not on landing */}
        {label && (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden sm:flex items-center gap-2 text-xs font-medium"
            style={{ color: '#475569' }}
          >
            <span style={{ color: '#1e293b' }}>·</span>
            <span style={{ color: '#64748b' }}>{label}</span>
          </motion.div>
        )}

        {/* Right slot — powered-by badge on landing */}
        <div className="flex items-center gap-2">
          {view === 'landing' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.22)',
                color: '#a5b4fc',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gemini AI
            </motion.span>
          )}
        </div>

      </div>
    </motion.nav>
  )
}
