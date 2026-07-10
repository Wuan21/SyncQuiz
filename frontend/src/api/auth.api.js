import api from './axios'

export const login = (data) => api.post('/auth/login', data).then((r) => r.data)
export const register = (data) => api.post('/auth/register', data).then((r) => r.data)
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me').then((r) => r.data)
export const syncUser = () => api.post('/auth/sync').then((r) => r.data)
export const refreshTokens = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then((r) => r.data)
