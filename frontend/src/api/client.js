/**
 * api/client.js — axios instance for the Study Companion API.
 *
 * Backend shapes:
 *   POST /api/v1/analyze       { subject, content }
 *     → { subject, concepts: [{ concept, score }] }
 *
 *   POST /api/v1/analyze/pdf   FormData: subject (string) + file (PDF)
 *     → { subject, concepts: [{ concept, score }] }
 *
 *   POST /api/v1/quiz          { subject, concepts: string[] }
 *     → { subject, items: [{ concept, explanation, question, options, correct_answer }] }
 */
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 45_000,
})

/**
 * Analyse plain-text notes for a given subject.
 * @param {string} subject
 * @param {string} content
 */
export async function analyzeText(subject, content) {
  const { data } = await api.post('/analyze', { subject, content })
  return data
}

/**
 * Analyse a PDF file for a given subject.
 * @param {string} subject
 * @param {File}   file
 */
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
 * Generate quiz items for a list of weak concepts.
 * @param {string}   subject
 * @param {string[]} concepts
 */
export async function generateQuiz(subject, concepts) {
  const { data } = await api.post('/quiz', { subject, concepts })
  return data
}
