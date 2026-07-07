import api from './axios'

export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me').then((r) => r.data)
