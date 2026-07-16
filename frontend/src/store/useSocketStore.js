import { create } from 'zustand'
import { io } from 'socket.io-client'

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    if (get().socket?.connected) return
    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
    })
    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    set({ socket })
  },

  // BUG-06 fix: reconnect with updated token (e.g. after token refresh)
  reconnect: () => {
    const { socket, connect } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
    connect()
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))

export default useSocketStore
