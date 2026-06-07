import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, ScanSearch, Sparkles } from 'lucide-react'

const FEATURES = [
  {
    icon: ScanSearch,
    title: 'Gap Detection',
    body: 'TF-IDF cosine similarity maps exactly where your knowledge trails off.',
  },
  {
    icon: BrainCircuit,
    title: 'Dynamic Concepts',
    body: 'Gemini reads your notes and generates the 15 concepts that matter most.',
  },
  {
    icon: Sparkles,
    title: 'Targeted Quizzes',
    body: 'Every question hits a real weak spot — no filler, no wasted time.',
  },
]

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.9 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function LandingView({ onStart }) {
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45 }}
      /* pt-14 clears the 56px fixed navbar */
      className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-14 pb-16 overflow-hidden"
    >
      {/* ── Background layers ──────────────────────────────── */}
      {/* Dot pattern — hero only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 dot-pattern opacity-40" />

      {/* Radial colour orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[300px]"
          style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.05), transparent 65%)' }} />
      </div>

      {/* ── Badge ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide"
        style={{
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#a5b4fc',
        }}
      >
        <Sparkles size={11} />
        Powered by Gemini AI + scikit-learn
      </motion.div>

      {/* ── Hero heading ───────────────────────────────────── */}
      <motion.h1
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center font-extrabold leading-[1.06] tracking-tight"
        style={{ fontSize: 'clamp(2.4rem, 7vw, 5.5rem)' }}
      >
        <span className="gradient-text">Study Smarter,</span>
        <br />
        <span className="gradient-text">Not Harder</span>
      </motion.h1>

      {/* ── Subtitle ───────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44, duration: 0.5 }}
        className="relative z-10 mt-5 max-w-sm text-center leading-relaxed"
        style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', color: '#94a3b8' }}
      >
        AI finds exactly what you don&apos;t know
      </motion.p>

      {/* ── CTA ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58, duration: 0.5 }}
        className="relative z-10 mt-9"
      >
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="btn-glow flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base text-white cursor-pointer select-none"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          aria-label="Get started with Study Companion"
        >
          Get Started
          <ArrowRight size={18} />
        </motion.button>
      </motion.div>

      {/* ── Feature cards ──────────────────────────────────── */}
      <div className="relative z-10 mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="glass flex flex-col gap-3 p-5 rounded-2xl cursor-default"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.14)' }}
            >
              <Icon size={16} className="text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">{title}</p>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{body}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
