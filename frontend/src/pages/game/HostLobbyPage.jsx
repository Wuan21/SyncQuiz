import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, Copy, QrCode, X, Wifi, WifiOff, RefreshCw, ArrowLeft } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createSession } from '../../api/game.api'
import { socket, connectSocket } from '../../store/useSocketStore'

function PlayerCard({ player }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 group sq-bg-surface sq-border"
    >
      <span className="text-2xl">{player.avatar || '😀'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate sq-text-foreground">{player.nickname}</p>
        {player.teamName && <p className="text-xs truncate sq-text-subtle">{player.teamName}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${player.connected ? 'sq-bg-success' : 'sq-bg-subtle opacity-50'}`} />
        <span className="text-xs sq-text-muted">{player.connected ? 'Online' : 'Offline'}</span>
      </div>
    </motion.div>
  )
}

function Centered({ children, onRetry }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sq-bg-background">
      <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4 sq-border-primary sq-text-primary" style={{ borderTopColor: 'var(--primary)' }} />
      <p className="text-sm mb-4 sq-text-muted">{children}</p>
      {onRetry && (
        <button onClick={onRetry} className="sq-btn sq-btn-secondary sq-btn-sm">
          <RefreshCw size={14} /> Thử lại
        </button>
      )}
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sq-bg-background">
      <div className="sq-card text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center sq-bg-danger-soft sq-text-danger">
          <X size={32} />
        </div>
        <h2 className="font-bold text-lg mb-2 sq-text-foreground">Không thể tạo phòng</h2>
        <p className="text-sm mb-6 sq-text-muted">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="sq-btn sq-btn-secondary">
            <ArrowLeft size={14} /> Quay lại
          </button>
          {onRetry && (
            <button onClick={onRetry} className="sq-btn sq-btn-primary">
              <RefreshCw size={14} /> Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HostLobbyPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [gameId, setGameId] = useState(null)
  const [pin, setPin] = useState(null)
  const [players, setPlayers] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [phase, setPhase] = useState('creating')
  const [errorMsg, setErrorMsg] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const hasCreated = useRef(false)
  const quizIdRef = useRef(quizId)
  const abortRef = useRef(null)

  const joinUrl = pin ? `${window.location.origin}/join/${pin}` : ''

  const initGame = async () => {
    if (!quizId) return
    if (hasCreated.current) return
    hasCreated.current = true

    // Cancel any in-flight request from previous mount
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setPhase('creating')
    setErrorMsg('')

    // Helper to safely set state only if still mounted
    const safeSet = (setter) => {
      if (!abortRef.current?.signal.aborted) setter()
    }

    try {
      const response = await createSession({ quizId })
      if (abortRef.current?.signal.aborted) return

      const data = response.data || response
      const newGameId = data.gameId || data.id || data._id
      const newPin = data.pin

      if (!newGameId || !newPin) {
        safeSet(() => { setPhase('error'); setErrorMsg('Phản hồi không hợp lệ từ server') })
        return
      }

      safeSet(() => { setGameId(newGameId); setPin(newPin) })

      try {
        await connectSocket()
      } catch (socketErr) {
        // Socket failure shouldn't block the game entirely
      }

      if (socket.connected) {
        try {
          await new Promise((resolve, reject) => {
            const tid = window.setTimeout(() => reject(new Error('host_attach_timeout')), 15_000)
            socket.emit('host:attach-game', { gameId: newGameId, pin: newPin }, (result) => {
              window.clearTimeout(tid)
              if (!result?.success) { reject(new Error(result?.message || 'host_attach_failed')); return }
              if (result.players) safeSet(() => setPlayers(result.players))
              resolve(result)
            })
          })
          safeSet(() => setIsConnected(true))
        } catch (_) {
          // Attach failure is non-fatal; players can still join
        }
      }

      sessionStorage.setItem('syncquiz-host-session', JSON.stringify({ gameId: newGameId, pin: newPin }))
      safeSet(() => setPhase('lobby'))
    } catch (err) {
      if (abortRef.current?.signal.aborted) return

      const status = err?.response?.status
      const code = err?.response?.data?.code
      const msg = err?.response?.data?.message || err?.message || ''

      // Network error (cold start / no response) — distinguish from game logic errors
      if (!status && !code) {
        safeSet(() => {
          setPhase('error')
          setErrorMsg('Máy chủ đang khởi động, vui lòng chờ trong giây lát...')
        })
        toast.error('Máy chủ đang khởi động, vui lòng thử lại sau vài giây')
        return
      }

      if (status === 401 || status === 403 || code === 'UNAUTHENTICATED' || msg.toLowerCase().includes('unauthorized')) {
        safeSet(() => {
          setPhase('error')
          setErrorMsg('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
        })
        localStorage.removeItem('accessToken')
        localStorage.removeItem('auth')
        setTimeout(() => navigate('/login'), 2000)
      } else if (status === 404 || code === 'QUIZ_NOT_FOUND') {
        safeSet(() => {
          setPhase('error')
          setErrorMsg('Quiz không tồn tại hoặc đã bị xóa.')
        })
      } else {
        safeSet(() => {
          setPhase('error')
          setErrorMsg(msg || 'Đã xảy ra lỗi khi tạo phòng')
        })
        toast.error(msg || 'Đã xảy ra lỗi khi tạo phòng')
      }
    }
  }

  useEffect(() => {
    if (quizId !== quizIdRef.current) {
      hasCreated.current = false
      quizIdRef.current = quizId
    }
    initGame()  // eslint-disable-line
    return () => { abortRef.current?.abort() }
  }, [quizId])

  useEffect(() => {
    const handlePlayers = (playerList) => setPlayers(playerList)
    const handleGameStarted = () => { if (pin) navigate(`/host/game/${pin}`) }

    socket.on('player-list:updated', handlePlayers)
    socket.on('game:started', handleGameStarted)

    return () => {
      socket.off('player-list:updated', handlePlayers)
      socket.off('game:started', handleGameStarted)
    }
  }, [pin, navigate])

  const copyPin = () => {
    navigator.clipboard.writeText(pin)
    toast.success('Đã sao chép mã PIN!')
  }

  const startGame = () => {
    if (!gameId) return
    if (players.length === 0) return toast.error('Cần ít nhất 1 người chơi')
    socket.emit('host:start')
  }

  if (phase === 'creating') return <Centered>Đang tạo phòng...</Centered>
  if (phase === 'error') return <ErrorState message={errorMsg} onRetry={() => { hasCreated.current = false; initGame() }} />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sq-bg-background">
      <div className="w-full max-w-lg">
        {/* PIN card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="sq-card text-center mb-5"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-sm font-medium uppercase tracking-wider sq-text-subtle">Game PIN</p>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              isConnected ? 'sq-bg-success-soft sq-text-success' : 'sq-bg-danger-soft sq-text-danger'
            }`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </div>
          </div>

          <div className="sq-pin">{pin}</div>

          <div className="flex gap-2 justify-center mt-5">
            <button onClick={copyPin} className="sq-btn sq-btn-secondary sq-btn-sm">
              <Copy size={14} /> Sao chép PIN
            </button>
            <button onClick={() => setShowQR(true)} className="sq-btn sq-btn-secondary sq-btn-sm">
              <QrCode size={14} /> QR Code
            </button>
          </div>

          <p className="text-xs mt-4 leading-relaxed sq-text-subtle">
            Người chơi truy cập{' '}
            <span className="font-medium sq-text-primary-light">{window.location.host}/join</span>
            {' '}và nhập mã PIN này
          </p>
        </motion.div>

        {/* Players card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="sq-card mb-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="sq-text-primary" />
              <span className="font-semibold text-sm sq-text-foreground">Người chơi</span>
              <span className="sq-badge sq-badge-primary ml-1">{players.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sq-text-muted">
              <div className="w-2 h-2 rounded-full animate-pulse sq-bg-success" />
              Đang chờ
            </div>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-center py-6 sq-text-subtle">
              Chưa có người chơi nào tham gia...
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              <AnimatePresence>
                {players.map((p, i) => (
                  <PlayerCard key={p.playerId || i} player={p} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button
            onClick={startGame}
            disabled={players.length === 0}
            className="sq-btn sq-btn-primary w-full py-4 text-lg"
          >
            <Play size={20} /> Bắt đầu game
          </button>
          {players.length === 0 && (
            <p className="text-center text-xs mt-2 sq-text-subtle">Cần ít nhất 1 người chơi để bắt đầu</p>
          )}
        </motion.div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 sq-bg-overlay"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sq-card text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base sq-text-foreground">Quét để tham gia</h3>
                <button onClick={() => setShowQR(false)} className="sq-btn sq-btn-ghost sq-btn-icon sq-text-muted hover:sq-text-foreground">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 rounded-xl inline-block mb-4 bg-white">
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <p className="text-xs mb-1 break-all px-2 sq-text-subtle">{joinUrl}</p>
              <p className="text-4xl font-black font-mono mt-3 tracking-widest sq-text-primary-light">{pin}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}