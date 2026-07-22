import { io } from 'socket.io-client'

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
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
  autoConnect: false, // Only connect when explicitly needed
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10, // Reduced from 20 to prevent long loops
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 15000, // Reduced timeout
  withCredentials: true,
})

/* ── Connection state tracking ──────────────────────────────────────────── */
let _isConnected = false
let _connectionListeners = []

// Update auth token before each connect
socket.on('connect', () => {
  _isConnected = true
  console.log('[SOCKET] Connected. ID:', socket.id)
  // Notify all waiting listeners
  _connectionListeners.forEach((resolve) => resolve(undefined))
  _connectionListeners = []
})

socket.on('disconnect', (reason) => {
  _isConnected = false
  console.log('[SOCKET] Disconnected:', reason)
})

socket.on('connect_error', (err) => {
  _isConnected = false
  console.error('[SOCKET] Connection error:', err.message)
})

/* ── Connect helper (returns a Promise) ───────────────────────────────── */
export function connectSocket() {
  return new Promise((resolve, reject) => {
    // Already connected
    if (socket.connected) {
      resolve(undefined)
      return
    }

    // Already connecting - queue this request
    if (socket.connecting) {
      _connectionListeners.push(resolve)
      // Set up timeout for this listener
      setTimeout(() => {
        _connectionListeners = _connectionListeners.filter((r) => r !== resolve)
        reject(
          Object.assign(new Error('Socket connection timeout'), {
            code: 'SOCKET_CONNECTION_TIMEOUT',
          }),
        )
      }, 15000)
      return
    }

    // Set auth token fresh each time
    const token = localStorage.getItem('accessToken')
    if (token) {
      socket.auth = { token }
    }

    const timeoutId = window.setTimeout(() => {
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleError)
      _connectionListeners = _connectionListeners.filter((r) => r !== resolve)
      reject(
        Object.assign(new Error('Khong the ket noi realtime'), {
          code: 'SOCKET_CONNECTION_TIMEOUT',
        }),
      )
    }, 15000)

    const handleConnect = () => {
      window.clearTimeout(timeoutId)
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleError)
      _connectionListeners = _connectionListeners.filter((r) => r !== resolve)
      resolve(undefined)
    }

    const handleError = (error) => {
      window.clearTimeout(timeoutId)
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleError)
      _connectionListeners = _connectionListeners.filter((r) => r !== resolve)
      reject(
        Object.assign(error, {
          code: 'SOCKET_CONNECTION_FAILED',
        }),
      )
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

/* ── Check connection status ─────────────────────────────────────────────── */
export function isSocketConnected() {
  return socket.connected
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
export default { socket, connectSocket, disconnectSocket, isSocketConnected }
