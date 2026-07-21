import { io } from 'socket.io-client'

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const PRODUCTION_API = 'https://syncquiz-backend.onrender.com/api'
const PRODUCTION_SOCKET = 'https://syncquiz-backend.onrender.com'

/* ── Derive Socket URL ──────────────────────────────────────────────────── */
function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/+$/, '')
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }
  return isDev ? window.location.origin : PRODUCTION_SOCKET
}

const SOCKET_URL = getSocketUrl()

/* ── Singleton socket instance ──────────────────────────────────────────── */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: true,
})

// Update auth token before each connect
socket.on('connect', () => {
  console.log('[SOCKET] Connected. ID:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('[SOCKET] Disconnected:', reason)
})

socket.on('connect_error', (err) => {
  console.error('[SOCKET] Connection error:', err.message)
})

/* ── Connect helper (returns a Promise) ─────────────────────────────────── */
export function connectSocket() {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve(undefined)
      return
    }

    // Set auth token fresh each time
    const token = localStorage.getItem('accessToken')
    if (token) {
      socket.auth = { token }
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(
        Object.assign(new Error('Không thể kết nối realtime'), {
          code: 'SOCKET_CONNECTION_TIMEOUT',
        }),
      )
    }, 20000)

    const handleConnect = () => {
      cleanup()
      resolve(undefined)
    }

    const handleError = (error) => {
      cleanup()
      reject(
        Object.assign(error, {
          code: 'SOCKET_CONNECTION_FAILED',
        }),
      )
    }

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleError)
    }

    socket.once('connect', handleConnect)
    socket.once('connect_error', handleError)

    socket.connect()
  })
}

/* ── Disconnect helper ──────────────────────────────────────────────────── */
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

/* ── Re-attach on reconnect ─────────────────────────────────────────────── */
let _reconnecting = false
socket.io.on('reconnect', () => {
  if (_reconnecting) return
  _reconnecting = true
  console.log('[SOCKET] Reconnected, re-attaching session...')

  const raw = sessionStorage.getItem('syncquiz-player-session')
  if (raw) {
    try {
      const session = JSON.parse(raw)
      socket.emit('player:attach-game', {
        gameId: session.gameId,
        playerId: session.playerId,
        pin: session.pin,
      })
    } catch (_) {}
  }

  setTimeout(() => { _reconnecting = false }, 3000)
})

// Default export for backward compatibility
export default { socket, connectSocket, disconnectSocket }
