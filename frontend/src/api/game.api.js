import api from './axios'

export const createSession = (data) => api.post('/sessions', data).then((r) => r.data)
export const getSessionByPin = (pin) => api.get(`/sessions/pin/${pin}`).then((r) => r.data)
export const getMyHistory = () => api.get('/sessions/history').then((r) => r.data)
export const getSessionResult = (id) => api.get(`/sessions/${id}/result`).then((r) => r.data)

export const presignUpload = (data) => api.post('/upload/presign', data).then((r) => r.data)
export const getAnalytics = () => api.get('/analytics/dashboard').then((r) => r.data)
export const getCategories = () => api.get('/categories').then((r) => r.data)
