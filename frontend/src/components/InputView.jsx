import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  ArrowLeft, FileText, Upload, X,
  FlaskConical, Cpu, BookOpen, Atom, Globe, Calculator,
} from 'lucide-react'
import { analyzeText, analyzePDF } from '../api/client'

const MAX_PDF_BYTES = 20 * 1024 * 1024

const QUICK_SUBJECTS = [
  { label: 'Mathematics',      icon: Calculator },
  { label: 'Physics',          icon: Atom },
  { label: 'Chemistry',        icon: FlaskConical },
  { label: 'Biology',          icon: BookOpen },
  { label: 'Computer Science', icon: Cpu },
  { label: 'History',          icon: Globe },
]

const LOADING_STEPS = ['Reading your notes', 'Mapping concepts', 'Finding gaps']

/* ── Loading overlay ──────────────────────────────────────────── */
function LoadingOverlay() {
  const [stepIdx, setStepIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setStepIdx((i) => (i + 1) % LOADING_STEPS.length)
        setVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-3xl gap-5"
      style={{ background: 'rgba(4,8,26,0.9)', backdropFilter: 'blur(14px)' }}
      aria-live="polite"
    >
      {/* Spinner ring */}
      <div className="relative w-14 h-14">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="4" />
          <motion.circle
            cx="28" cy="28" r="24"
            fill="none" stroke="url(#lg)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="150.8"
            animate={{ strokeDashoffset: [150.8, 0, 150.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#6366f1" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
      </div>

      {/* Cycling label */}
      <div className="h-5 flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          {visible && (
            <motion.span
              key={stepIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-semibold"
              style={{ color: '#a5b4fc' }}
            >
              {LOADING_STEPS[stepIdx]}…
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i === stepIdx ? 1 : 0.22, scale: i === stepIdx ? 1.4 : 1 }}
            transition={{ duration: 0.25 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#6366f1' }}
          />
        ))}
      </div>
    </motion.div>
  )
}

/* ── Animated SVG dashed border ───────────────────────────────── */
function DropzoneBorder({ active, hasFile }) {
  const stroke = active ? '#6366f1' : hasFile ? '#22d3ee' : '#3730a3'
  const opacity = active ? 0.9 : hasFile ? 0.55 : 0.32

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <motion.rect
        x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
        rx="14" ry="14" fill="none"
        stroke={stroke} strokeOpacity={opacity}
        strokeWidth="1.5" strokeDasharray="8 5"
        animate={
          active
            ? { strokeDashoffset: [0, -26], strokeOpacity: [0.9, 1, 0.9] }
            : { strokeDashoffset: 0, strokeOpacity: opacity }
        }
        transition={
          active
            ? { strokeDashoffset: { duration: 0.55, repeat: Infinity, ease: 'linear' }, strokeOpacity: { duration: 1.4, repeat: Infinity } }
            : { duration: 0.3 }
        }
      />
      {active && (
        <motion.rect
          x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
          rx="14" ry="14" fill="none" stroke="#818cf8" strokeOpacity="0.18" strokeWidth="7"
          animate={{ opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      )}
    </svg>
  )
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function InputView({ onBack, onResults }) {
  const [subject, setSubject] = useState('')
  const [mode, setMode]       = useState('pdf')
  const [file, setFile]       = useState(null)
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef(null)

  const trimmed  = subject.trim()
  const subjectOk = trimmed.length >= 2
  const contentOk = mode === 'pdf' ? !!file : text.trim().length >= 50
  const canSubmit = !loading && subjectOk && contentOk

  /* ── Dropzone ────────────────────────────────────────────── */
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length) { toast.error('Only PDF files are accepted.'); return }
    const f = accepted[0]
    if (f.size > MAX_PDF_BYTES) { toast.error('File exceeds the 20 MB limit.'); return }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: loading,
  })

  /* ── Submit ──────────────────────────────────────────────── */
  async function handleSubmit() {
    if (!canSubmit) {
      if (!subjectOk) { toast.error('Enter a subject name first.'); inputRef.current?.focus(); return }
      toast.error(mode === 'pdf' ? 'Select a PDF first.' : 'At least 50 characters needed.')
      return
    }
    setLoading(true)
    try {
      const result = mode === 'pdf'
        ? await analyzePDF(trimmed, file)
        : await analyzeText(trimmed, text)
      onResults(result)
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
        (err?.code === 'ECONNABORTED' ? 'Request timed out.' : 'Could not reach the server.')
      )
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="input"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      /* pt-14 = navbar clearance; pb-10 = breathing room */
      className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden"
    >
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px]"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.1), transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[380px] h-[280px]"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.07), transparent 70%)' }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-overlay" />

      {/* Back link — inline above card, not absolute */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        className="relative z-10 w-full max-w-lg mb-3"
      >
        <motion.button
          onClick={onBack}
          disabled={loading}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-sm font-medium cursor-pointer disabled:opacity-30 select-none"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft size={14} />
          Back
        </motion.button>
      </motion.div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 glass w-full max-w-lg rounded-3xl overflow-hidden"
      >
        <AnimatePresence>{loading && <LoadingOverlay />}</AnimatePresence>

        <div className="p-6 sm:p-8">

          {/* ── Subject half ──────────────────────────────── */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mb-0.5">
            Analyze My Notes
          </h2>
          <p className="text-sm mb-5" style={{ color: '#64748b' }}>
            Enter your subject, then upload notes or paste text.
          </p>

          <label htmlFor="subj" className="block text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>
            Subject
          </label>
          <input
            id="subj"
            ref={inputRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Organic Chemistry, Computer Architecture…"
            maxLength={200}
            disabled={loading}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${trimmed.length >= 2 ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.2)'}`,
              color: '#e2e8f0',
              caretColor: '#818cf8',
            }}
          />

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Quick subject picks">
            {QUICK_SUBJECTS.map(({ label, icon: Icon }) => {
              const active = subject === label
              return (
                <motion.button
                  key={label}
                  onClick={() => { setSubject(label); inputRef.current?.focus() }}
                  disabled={loading}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.93 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30 select-none"
                  style={
                    active
                      ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.5)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                  aria-pressed={active}
                >
                  <Icon size={11} />
                  {label}
                </motion.button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="my-5" style={{ borderTop: '1px solid rgba(99,102,241,0.11)' }} />

          {/* ── Notes half ────────────────────────────────── */}
          {/* Toggle tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            role="tablist"
          >
            {[{ id: 'pdf', label: '📄 PDF Upload' }, { id: 'text', label: '✏️ Paste Text' }].map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                disabled={loading}
                onClick={() => setMode(id)}
                className="flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-30"
                style={
                  mode === id
                    ? { background: 'rgba(99,102,241,0.22)', color: '#a5b4fc' }
                    : { color: '#475569' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            {mode === 'pdf' ? (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div
                  {...getRootProps()}
                  className="relative flex flex-col items-center justify-center gap-3 p-6 sm:p-8 rounded-2xl transition-colors duration-300 focus:outline-none cursor-pointer select-none"
                  style={{
                    background: isDragActive ? 'rgba(99,102,241,0.08)' : file ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.015)',
                    minHeight: '10rem',
                  }}
                >
                  <input {...getInputProps()} />
                  <DropzoneBorder active={isDragActive} hasFile={!!file} />

                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div
                        key="file"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        className="relative z-10 flex items-center gap-3 w-full"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(34,211,238,0.12)' }}>
                          <FileText size={17} className="text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); setFile(null) }}
                          disabled={loading}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30"
                          style={{ color: '#475569' }}
                          aria-label="Remove file"
                        >
                          <X size={15} />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 flex flex-col items-center gap-2 text-center"
                      >
                        <motion.div
                          animate={isDragActive ? { scale: 1.18, y: -4 } : { scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                          className="w-11 h-11 rounded-2xl flex items-center justify-center"
                          style={{ background: isDragActive ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.1)' }}
                        >
                          <Upload size={18} className="text-indigo-400" />
                        </motion.div>
                        <p className="text-sm font-semibold text-slate-300">
                          {isDragActive ? 'Drop it here' : 'Drag & drop your PDF'}
                        </p>
                        <p className="text-xs" style={{ color: '#475569' }}>
                          or click to browse · PDF only · max 20 MB
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={loading}
                    placeholder="Paste your study notes here…"
                    rows={6}
                    className="w-full rounded-2xl p-4 text-sm leading-relaxed resize-none focus:outline-none transition-all duration-200 disabled:opacity-30"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${text.length >= 50 ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.2)'}`,
                      color: '#e2e8f0',
                      caretColor: '#818cf8',
                    }}
                  />
                  <span
                    className="absolute bottom-3 right-3 text-xs select-none tabular-nums pointer-events-none"
                    style={{ color: text.length >= 50 ? '#34d399' : '#475569' }}
                  >
                    {text.length}{text.length < 50 ? ' / 50' : ''}
                  </span>
                </div>
                <AnimatePresence>
                  {text.length > 0 && text.length < 50 && (
                    <motion.p
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 text-xs"
                      style={{ color: '#f87171' }}
                    >
                      {50 - text.length} more character{50 - text.length !== 1 ? 's' : ''} needed
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit ──────────────────────────────────────── */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.02, y: -1 } : {}}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
            className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 select-none"
            style={
              canSubmit
                ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', boxShadow: '0 0 22px rgba(99,102,241,0.28)' }
                : { background: 'rgba(99,102,241,0.07)', color: '#334155', cursor: 'not-allowed' }
            }
            aria-disabled={!canSubmit}
          >
            Analyze My Notes
          </motion.button>

        </div>
      </motion.div>
    </motion.div>
  )
}
