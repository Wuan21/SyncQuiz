import axios from 'axios'
import { getIdToken, logoutFromCognito } from '../lib/cognito'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach access token
api.interceptors.request.use(async (config) => {
  const token = await getIdToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
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

// Auto-refresh on 401 via Cognito session refresh
let refreshing = null
api.interceptors.response.use(
  (res) => {
    res.data = mapIds(res.data)
    return res
  },
  async (err) => {
    const original = err.config
    const isAuthRoute = original?.url?.includes('/auth/')
    if (err.response?.status === 401 && !original?._retry && !isAuthRoute) {
      original._retry = true
      if (!refreshing) {
        refreshing = getAccessToken({ forceRefresh: true })
          .then(() => getIdToken())
          .then(() => {
            refreshing = null
          })
          .catch(async () => {
            refreshing = null
            try {
              await logoutFromCognito()
            } catch {}
            window.location.href = '/login'
          })
      }
      await refreshing
      return api(original)
    }
    return Promise.reject(err)
  },
)

export default api
