import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isDev ? '/api' : 'https://syncquiz-backend.onrender.com/api'),
  withCredentials: true,
})

// Attach access token
api.interceptors.request.use(async (config) => {
  let token = null
  if (isCognitoEnabled) {
    try {
      const session = await fetchAuthSession()
      token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString()
      if (token) localStorage.setItem('accessToken', token)
    } catch (_) {
      // ignore amplify error, fallback to localStorage
    }
  }

  if (!token) {
    token = localStorage.getItem('accessToken')
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

const mapIds = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(mapIds)
  if (obj._id && !obj.id) {
    obj.id = obj._id
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = mapIds(obj[key])
    }
  }
  return obj
}

// Auto-refresh on 401
let refreshing = null
api.interceptors.response.use(
  (res) => {
    res.data = mapIds(res.data)
    return res
  },
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (isCognitoEnabled) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth')
        window.location.href = '/login'
        return Promise.reject(err)
      }

      original._retry = true
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') })
          .then(({ data }) => {
            localStorage.setItem('accessToken', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)
          })
          .catch(() => {
            localStorage.clear()
            window.location.href = '/login'
          })
          .finally(() => {
            refreshing = null
          })
      }
      await refreshing
      return api(original)
    }
    return Promise.reject(err)
  },
)

export default api
