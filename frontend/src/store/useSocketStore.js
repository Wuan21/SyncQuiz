import { create } from 'zustand'
import { io } from 'socket.io-client'

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    if (get().socket?.connected) return
    const socket = io('/', {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
    })
    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    set({ socket })
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))

export default useSocketStore
