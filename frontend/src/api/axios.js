import axios from 'axios'

const isCognitoEnabled = !!(
  import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
)

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (isDev ? '/api' : 'https://syncquiz-backend.onrender.com/api'),
  timeout: 30_000,
  withCredentials: true,
})

// Cache Amplify module to avoid repeated dynamic imports
let cachedAmplifyAuth = null
let amplifyImportPromise = null

async function getAmplifyAuth() {
  if (cachedAmplifyAuth) return cachedAmplifyAuth
  if (amplifyImportPromise) return amplifyImportPromise

  amplifyImportPromise = import('aws-amplify/auth')
    .then((module) => {
      cachedAmplifyAuth = module
      return module
    })
    .catch(() => null)

  return amplifyImportPromise
}

// Attach access token
api.interceptors.request.use(async (config) => {
  let token = null

  if (isCognitoEnabled) {
    try {
      const { fetchAuthSession } = await getAmplifyAuth()
      if (fetchAuthSession) {
        const session = await fetchAuthSession()
        token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString()
        if (token) localStorage.setItem('accessToken', token)
      }
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

// Guard against multiple simultaneous redirects
let _authRedirecting = false

api.interceptors.response.use(
  (res) => {
    res.data = mapIds(res.data)
    return res
  },
  async (err) => {
    const status = err.response?.status
    const original = err.config

    // Network errors (no response) — propagate, don't redirect
    if (!status) return Promise.reject(err)

    // Skip auth redirect for login/register/refresh endpoints
    const isAuthEndpoint =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh')

    // Only redirect on 401/403 for protected endpoints
    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      if (_authRedirecting) return Promise.reject(err)
      _authRedirecting = true

      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('auth')

      await new Promise((r) => setTimeout(r, 100))

      window.location.href = '/login'
      return Promise.reject(err)
    }

    return Promise.reject(err)
  },
)

export default api
