import { create } from 'zustand'
import { io } from 'socket.io-client'

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.trim()
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/, '')
  }
  return window.location.origin
}

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    const existing = get().socket
    if (existing && existing.connected) {
      return existing
    }

    const targetUrl = getSocketUrl()
    console.log('[SOCKET STORE] Connecting to WebSocket URL:', targetUrl)

    const socket = io(targetUrl, {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log('[SOCKET STORE] Connected successfully. ID:', socket.id)
      set({ connected: true })
    })

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET STORE] Disconnected:', reason)
      set({ connected: false })
    })

    socket.on('connect_error', (err) => {
      console.error('[SOCKET STORE] Connection error:', err.message)
    })

    set({ socket })
    return socket
  },

  reconnect: () => {
    const { socket, connect } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
    return connect()
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false })
  },
}))

export default useSocketStore
