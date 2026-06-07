import { motion } from 'framer-motion'
import { ArrowRight, Brain, Sparkles, Zap } from 'lucide-react'

const floatVariants = {
  animate: {
    y: [0, -12, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
}

const features = [
  { icon: Brain, label: 'Gap Detection', desc: 'TF-IDF cosine similarity maps exactly where your knowledge ends' },
  { icon: Sparkles, label: 'AI Questions', desc: 'Gemini generates targeted questions for every weak concept' },
  { icon: Zap, label: 'Instant Results', desc: 'Upload your notes and get a full analysis in seconds' },
]

export default function LandingView({ onStart }) {
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
    >
      {/* Background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-5"
          style={{ background: 'radial-gradient(ellipse, #22d3ee 0%, transparent 60%)' }} />
      </div>

      {/* Grid lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative z-10 mb-8 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium"
        style={{
          borderColor: 'rgba(99,102,241,0.4)',
          background: 'rgba(99,102,241,0.08)',
          color: '#a5b4fc',
        }}
      >
        <Sparkles size={14} className="text-indigo-400" />
        <span>Powered by TF-IDF &amp; Gemini AI</span>
      </motion.div>

      {/* Hero heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 text-center font-bold leading-none tracking-tight"
        style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)' }}
      >
        <span className="gradient-text">Find What</span>
        <br />
        <span className="gradient-text">You Don&apos;t Know</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="relative z-10 mt-6 max-w-xl text-center text-lg leading-relaxed"
        style={{ color: '#94a3b8' }}
      >
        Upload your notes or paste text. We analyse your knowledge coverage across
        20 core subjects and generate quiz questions that target your exact weak spots.
      </motion.p>

      {/* CTA button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="relative z-10 mt-10"
      >
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="glow-pulse group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-white cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          }}
        >
          Start Analysing
          <motion.span
            className="inline-flex"
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <ArrowRight size={20} />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="relative z-10 mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full"
      >
        {features.map(({ icon: Icon, label, desc }, i) => (
          <motion.div
            key={label}
            variants={floatVariants}
            animate="animate"
            className="flex flex-col gap-3 p-5 rounded-2xl border"
            aria-label={label}
            tabIndex={0}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(99,102,241,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              <Icon size={18} className="text-indigo-400" />
            </div>
            <p className="font-semibold text-slate-200 text-sm">{label}</p>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
