import api from './axios'

// ── AI Generation Cache + Rate Limit ──
const AI_CACHE_KEY = 'syncquiz_ai_cache'
const AI_RATE_LIMIT_MS = 3000
let lastAIRequestTime = 0

function getCacheKey(data) {
  return JSON.stringify({
    topic: data.topic,
    count: data.count,
    difficulty: data.difficulty,
    language: data.language,
  })
}

function getAICache() {
  try {
    const cached = localStorage.getItem(AI_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

function setAICache(key, value) {
  try {
    const cache = getAICache()
    cache[key] = { data: value, time: Date.now() }
    const keys = Object.keys(cache)
    if (keys.length > 10) {
      const oldest = keys.sort((a, b) => cache[a].time - cache[b].time)[0]
      delete cache[oldest]
    }
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Failed to save AI cache:', e)
  }
}

export const generateAIQuiz = async (data) => {
  const cacheKey = getCacheKey(data)
  const cache = getAICache()

  if (cache[cacheKey]) {
    console.log('AI Quiz returned from cache')
    return cache[cacheKey].data
  }

  const timeSinceLastRequest = Date.now() - lastAIRequestTime
  if (timeSinceLastRequest < AI_RATE_LIMIT_MS) {
    const waitTime = AI_RATE_LIMIT_MS - timeSinceLastRequest
    await new Promise((r) => setTimeout(r, waitTime))
  }

  lastAIRequestTime = Date.now()
  try {
    const result = await api.post('/ai/generate', data).then((r) => r.data)
    setAICache(cacheKey, result)
    return result
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error(
        'API quota exceeded.\n\n✓ Solutions:\n1. Add billing to your Google Cloud project\n2. Wait 24 hours for free tier reset\n3. Use CSV import feature instead',
      )
    }
    if (
      err.response?.status === 503 ||
      err.response?.data?.message?.includes('Quota')
    ) {
      throw new Error(err.response?.data?.message || 'AI service unavailable')
    }
    throw err
  }
}

export const getMyAchievements = () =>
  api.get('/analytics/achievements/my').then((r) => r.data)

// ── Homework ────────────────────────────────────────────────────────────────
export const getStudentHomework = () =>
  api.get('/homework/student').then((r) => r.data)

export const getMyHomework = () => api.get('/homework/my').then((r) => r.data)

export const createHomework = (data) =>
  api.post('/homework', data).then((r) => r.data)

export const submitHomework = (id, data) =>
  api.post('/homework/' + id + '/submit', data).then((r) => r.data)

export const getHomeworkResults = (id) =>
  api.get('/homework/' + id + '/results').then((r) => r.data)

export const getHomeworkDetails = (id) =>
  api.get('/homework/' + id).then((r) => r.data)

export const saveHomeworkProgress = (id, data) =>
  api.patch('/homework/' + id + '/progress', data).then((r) => r.data)

export const getHomeworkProgress = (id) =>
  api.get('/homework/' + id + '/progress').then((r) => r.data)

// ── CSV import (placeholder — kept for legacy callers) ─────────────────────
export const downloadCSVTemplate = () =>
  window.open('/api/quizzes/csv-template', '_blank')

export const importCSV = (quizId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/quizzes/${quizId}/import-csv`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

// ── Classrooms ──────────────────────────────────────────────────────────────
export const getClassrooms = () =>
  api.get('/classrooms').then((r) => r.data)

export const createClassroom = (data) =>
  api.post('/classrooms', data).then((r) => r.data)

export const joinClassroom = (code) =>
  api.post('/classrooms/join/' + code).then((r) => r.data)

export const deleteClassroom = (id) => api.delete('/classrooms/' + id)