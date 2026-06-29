import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
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
      original._retry = true
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') })
          .then(({ data }) => {
            localStorage.setItem('accessToken', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)
            refreshing = null
          })
          .catch(() => {
            localStorage.clear()
            window.location.href = '/login'
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
