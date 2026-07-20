import api from './axios'

export const updateProfile = (data) => api.patch('/users/me', data).then((r) => r.data)
export const changePassword = (data) => api.patch('/users/me/password', data).then((r) => r.data)
