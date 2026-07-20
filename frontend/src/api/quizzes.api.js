import api from './axios'

export const getQuizzes = (params) => api.get('/quizzes', { params }).then((r) => r.data)
export const getMyQuizzes = (params) => api.get('/quizzes/my', { params }).then((r) => r.data)
export const getQuiz = (id) => api.get(`/quizzes/${id}`).then((r) => r.data)
export const getQuizFull = async (id) => {
  const [quiz, questions] = await Promise.all([
    getQuiz(id),
    getQuestions(id).catch(() => []),
  ])
  return { ...quiz, questions }
}
export const createQuiz = (data) => api.post('/quizzes', data).then((r) => r.data)
export const updateQuiz = (id, data) => api.patch(`/quizzes/${id}`, data).then((r) => r.data)
export const deleteQuiz = (id) => api.delete(`/quizzes/${id}`)
export const cloneQuiz = (id) => api.post('/quizzes/' + id + '/clone').then((r) => r.data)

// Favorites
export const getMyFavorites = () => api.get('/quizzes/favorites').then((r) => r.data)
export const toggleFavorite = (quizId) => api.post('/quizzes/' + quizId + '/favorite').then((r) => r.data)

// Questions
export const getQuestions = (quizId) =>
  api.get('/questions/' + quizId + '/questions').then((r) => r.data)
export const createQuestion = (quizId, data) =>
  api.post('/questions/' + quizId + '/questions', data).then((r) => r.data)
export const updateQuestion = (quizId, id, data) =>
  api.patch('/questions/' + quizId + '/questions/' + id, data).then((r) => r.data)
export const deleteQuestion = (quizId, id) =>
  api.delete('/questions/' + quizId + '/questions/' + id)
export const reorderQuestions = (quizId, ids) =>
  api.put('/questions/' + quizId + '/questions/reorder', { ids })
