import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { ArrowLeft, FileText, Upload, X, Loader2, ChevronRight } from 'lucide-react'
import { uploadPDF, uploadText } from '../api/client'

const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

export default function UploadView({ onBack, onResults }) {
  const [tab, setTab] = useState('pdf') // 'pdf' | 'text'
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  /* ── Dropzone ─────────────────────────────────────────────────── */
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Only PDF files are accepted.')
      return
    }
    const f = accepted[0]
    if (f.size > MAX_PDF_BYTES) {
      toast.error('File exceeds the 20 MB limit.')
      return
    }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: loading,
  })

  /* ── Submit ───────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (loading) return

    setLoading(true)
    try {
      let result
      if (tab === 'pdf') {
        if (!file) { toast.error('Please select a PDF file.'); return }
        result = await uploadPDF(file)
      } else {
        if (text.trim().length < 50) { toast.error('Please enter at least 50 characters.'); return }
        result = await uploadText(text)
      }
      onResults(result.concepts)
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (err?.code === 'ECONNABORTED' ? 'Server took too long. Please try again.' : 'Could not reach the server. Is the backend running?')
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !loading && (tab === 'pdf' ? !!file : text.trim().length >= 50)

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />
      </div>

      {/* Back button */}
      <motion.button
        onClick={onBack}
        disabled={loading}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ x: -3 }}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium cursor-pointer disabled:opacity-40"
        style={{ color: '#94a3b8' }}
      >
        <ArrowLeft size={16} />
        Back
      </motion.button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 w-full max-w-lg rounded-3xl border p-8"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(99,102,241,0.2)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Heading */}
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Upload Your Notes</h2>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
          We'll map your knowledge gaps across 20 subjects.
        </p>

        {/* Tab switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.05)' }}
          role="tablist"
          aria-label="Input method"
        >
          {['pdf', 'text'].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              disabled={loading}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-40"
              style={
                tab === t
                  ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }
                  : { color: '#64748b' }
              }
            >
              {t === 'pdf' ? '📄 PDF Upload' : '✏️ Paste Text'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'pdf' ? (
            <motion.div
              key="pdf-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className="relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 focus:outline-none"
                style={{
                  borderColor: isDragActive
                    ? 'rgba(99,102,241,0.7)'
                    : file
                    ? 'rgba(34,211,238,0.4)'
                    : 'rgba(99,102,241,0.25)',
                  background: isDragActive
                    ? 'rgba(99,102,241,0.08)'
                    : 'rgba(255,255,255,0.02)',
                }}
                role="button"
                aria-label="Drop PDF here or click to browse"
              >
                <input {...getInputProps()} />
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 w-full"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(34,211,238,0.1)' }}>
                        <FileText size={18} className="text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                        style={{ color: '#64748b' }}
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="drop-prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <Upload size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-300">
                        {isDragActive ? 'Drop it here' : 'Drag & drop your PDF'}
                      </p>
                      <p className="text-xs" style={{ color: '#475569' }}>
                        or click to browse · max 20 MB
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="text-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loading}
                  placeholder="Paste your study notes here…"
                  rows={8}
                  className="w-full rounded-2xl p-4 text-sm leading-relaxed resize-none focus:outline-none transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: '#e2e8f0',
                    caretColor: '#818cf8',
                  }}
                  aria-label="Paste study notes"
                />
                <div
                  className="absolute bottom-3 right-4 text-xs select-none"
                  style={{ color: text.length >= 50 ? '#34d399' : '#64748b' }}
                  aria-live="polite"
                >
                  {text.length} / 50 min
                </div>
              </div>
              {text.length > 0 && text.length < 50 && (
                <p className="mt-2 text-xs" style={{ color: '#f87171' }}>
                  {50 - text.length} more character{50 - text.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
          style={
            canSubmit
              ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(99,102,241,0.3)',
                }
              : {
                  background: 'rgba(99,102,241,0.1)',
                  color: '#475569',
                  cursor: 'not-allowed',
                }
          }
          aria-disabled={!canSubmit}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              Analyse My Notes
              <ChevronRight size={16} />
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
