import api from './axios'

// ── AI Generation Cache + Rate Limit ──
const AI_CACHE_KEY = 'syncquiz_ai_cache'
const AI_RATE_LIMIT_MS = 3000 // Min 3s between requests
let lastAIRequestTime = 0

function getCacheKey(data) {
  return JSON.stringify({ topic: data.topic, count: data.count, difficulty: data.difficulty, language: data.language })
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
    // Keep only last 10 items to avoid bloat
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

  // Return cached result if available
  if (cache[cacheKey]) {
    console.log('AI Quiz returned from cache')
    return cache[cacheKey].data
  }

  // Rate limit: wait if last request was too recent
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
    // If quota exceeded, suggest alternatives
    if (err.response?.status === 429) {
      throw new Error(
        'API quota exceeded.\n\n✓ Solutions:\n1. Add billing to your Google Cloud project\n2. Wait 24 hours for free tier reset\n3. Use CSV import feature instead'
      )
    }
    if (err.response?.status === 503 || err.response?.data?.message?.includes('Quota')) {
      throw new Error(err.response?.data?.message || 'AI service unavailable')
    }
    throw err
  }
}

export const getMyAchievements = () => api.get('/achievements/my').then((r) => r.data)

export const getStudentHomework = () => api.get('/homework/student').then((r) => r.data)
export const getMyHomework = () => api.get('/homework/my').then((r) => r.data)
export const createHomework = (data) => api.post('/homework', data).then((r) => r.data)
export const submitHomework = (id, data) => api.post(`/homework/${id}/submit`, data).then((r) => r.data)
export const getHomeworkResults = (id) => api.get(`/homework/${id}/results`).then((r) => r.data)

export const downloadCSVTemplate = () => window.open('/api/quizzes/csv-template', '_blank')
export const importCSV = (quizId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/quizzes/${quizId}/import-csv`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
