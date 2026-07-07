import { create } from 'zustand'
import { io } from 'socket.io-client'
import { getIdToken } from '../lib/cognito'

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  connect: async () => {
    if (get().socket?.connected) return
    const token = await getIdToken().catch(() => null)
    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    })
    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    set({ socket })
    return socket
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))

export default useSocketStore
