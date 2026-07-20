import api from './axios'

export const presignUpload = (data) =>
  api.post('/upload/presign', data).then((r) => r.data)

export const getAnalytics = () =>
  api.get('/analytics/dashboard').then((r) => r.data)

export const getQuizAnalytics = (quizId) =>
  api.get(`/analytics/quiz/${quizId}`).then((r) => r.data)

export const getCategories = () =>
  api.get('/categories').then((r) => r.data)