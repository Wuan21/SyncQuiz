import api from './axios'

export const generateAIQuiz = (data) => api.post('/ai/generate', data).then((r) => r.data)

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
