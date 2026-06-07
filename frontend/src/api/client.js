/**
 * api/client.js — centralised axios instance for the Study Companion API.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30_000,
})

/**
 * POST /upload — send a PDF file.
 * @param {File} file
 * @returns {Promise<{concepts: Array<{concept: string, score: number, is_gap: boolean}>}>}
 */
export async function uploadPDF(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * POST /upload/text — send plain text notes.
 * @param {string} content
 * @returns {Promise<{concepts: Array<{concept: string, score: number, is_gap: boolean}>}>}
 */
export async function uploadText(content) {
  const { data } = await api.post('/upload/text', { content })
  return data
}

/**
 * POST /quiz — generate quiz questions for gap concepts.
 * @param {string[]} concepts
 * @returns {Promise<{questions: Array<{prompt: string, options: string[], correct_index: number, concept: string}>}>}
 */
export async function generateQuiz(concepts) {
  const { data } = await api.post('/quiz', { concepts })
  return data
}
