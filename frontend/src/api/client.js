/**
 * api/client.js — Study Companion API
 */
import axios from 'axios'

const BASE = 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE, timeout: 45_000 })

export async function analyzeText(subject, content) {
  const { data } = await api.post('/analyze', { subject, content })
  return data
}

export async function analyzePDF(subject, file) {
  const form = new FormData()
  form.append('subject', subject)
  form.append('file', file)
  const { data } = await api.post('/analyze/pdf', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Stream quiz items one at a time via SSE.
 *
 * Calls onItem(item) for each successfully generated quiz item.
 * Calls onError(msg) for per-concept errors (quiz continues for other concepts).
 * Calls onDone() when all items have been streamed.
 *
 * Returns an AbortController so the caller can cancel the stream.
 *
 * @param {string}   subject
 * @param {string[]} concepts
 * @param {{ onItem, onError, onDone }} callbacks
 * @returns {AbortController}
 */
export function streamQuiz(subject, concepts, { onItem, onError, onDone }) {
  const controller = new AbortController()

  // Fire-and-forget async function — errors bubble to onError
  ;(async () => {
    let resp
    try {
      resp = await fetch(`${BASE}/quiz/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, concepts }),
        signal: controller.signal,
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      onError?.(err.message || 'Could not reach the server.')
      onDone?.()
      return
    }

    if (!resp.ok) {
      let detail = `Server error ${resp.status}`
      try { detail = (await resp.json()).detail || detail } catch (_) {}
      onError?.(detail)
      onDone?.()
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE lines are separated by \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() // last (possibly incomplete) chunk stays in buffer

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue

          let msg
          try { msg = JSON.parse(json) } catch (_) { continue }

          if (msg.done) {
            onDone?.()
            return
          }
          if (msg.error) {
            onError?.(msg.error, msg.concept)
          } else {
            onItem?.(msg)
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err.message)
    }

    onDone?.()
  })()

  return controller
}
