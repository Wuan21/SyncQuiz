import api from './axios'

export const getAdminStats = () =>
  api.get('/admin/stats').then((r) => r.data)

export const getAdminUsers = (params) =>
  api.get('/admin/users', { params }).then((r) => r.data)

export const getAdminUser = (id) =>
  api.get('/admin/users/' + id).then((r) => r.data)

export const updateAdminUserRole = (id, data) =>
  api.patch('/admin/users/' + id + '/role', data).then((r) => r.data)

export const toggleAdminUserStatus = (id, data) =>
  api.patch('/admin/users/' + id + '/status', data).then((r) => r.data)

export const deleteAdminUser = (id) =>
  api.delete('/admin/users/' + id)

export const restoreAdminUser = (id) =>
  api.post('/admin/users/' + id + '/restore').then((r) => r.data)

export const getAdminQuizzes = (params) =>
  api.get('/admin/quizzes', { params }).then((r) => r.data)

export const getAdminQuizStats = (id) =>
  api.get('/admin/quizzes/' + id).then((r) => r.data)

export const deleteAdminQuiz = (id) =>
  api.delete('/admin/quizzes/' + id)

export const restoreAdminQuiz = (id) =>
  api.post('/admin/quizzes/' + id + '/restore').then((r) => r.data)

export const getAdminSessions = (params) =>
  api.get('/admin/sessions', { params }).then((r) => r.data)

export const endAdminSession = (id) =>
  api.post('/admin/sessions/' + id + '/end').then((r) => r.data)

export const getAdminHomework = (params) =>
  api.get('/admin/homework', { params }).then((r) => r.data)
