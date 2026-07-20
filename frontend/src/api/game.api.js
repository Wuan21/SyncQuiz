import api from './axios'

export const createSession = (data) =>
  api.post('/game-sessions', data).then((r) => r.data)

export const joinSession = (data) =>
  api.post('/game-sessions/join', data).then((r) => r.data)

export const getSessionByPin = (pin) =>
  api.get(`/game-sessions/pin/${pin}`).then((r) => r.data)

export const getMyHistory = () =>
  api.get('/game-sessions/history').then((r) => r.data)

export const getSessionResult = (id) =>
  api.get(`/game-sessions/${id}/result`).then((r) => r.data)