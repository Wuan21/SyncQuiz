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
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 group"
      style={{ backgroundColor: 'hsl(0 0% 100% / 0.04)' }}
    >
      <span className="text-2xl">{player.avatar || '😀'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'hsl(0 0% 96%)' }}>{player.nickname}</p>
        {player.teamName && <p className="text-xs truncate" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>{player.teamName}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.connected ? 'hsl(142 60% 42%)' : 'hsl(0 0% 100% / 0.2)' }} />
        <span className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.25)' }}>{player.connected ? 'Online' : 'Offline'}</span>
      </div>
    </motion.div>
  )
}

function Centered({ children, onRetry }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'hsl(225 42% 5%)' }}>
      <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'hsl(270 90% 58% / 0.3)', borderTopColor: 'hsl(270 90% 58%)' }} />
      <p className="text-sm mb-4" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{children}</p>
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'hsl(225 42% 5%)' }}>
      <div className="sq-card text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(0 75% 55% / 0.12)' }}>
          <X size={32} style={{ color: 'hsl(0 75% 55%)' }} />
        </div>
        <h2 className="font-bold text-lg mb-2">Không thể tạo phòng</h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(220 13% 65%)' }}>{message}</p>
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

  const joinUrl = pin ? `${window.location.origin}/join/${pin}` : ''

  const initGame = async () => {
    if (!quizId) return
    hasCreated.current = true
    setPhase('creating')
    setErrorMsg('')

    try {
      const response = await createSession({ quizId })
      const data = response.data || response
      const newGameId = data.gameId || data.id || data._id
      const newPin = data.pin

      if (!newGameId || !newPin) {
        setPhase('error')
        setErrorMsg('Phản hồi không hợp lệ từ server')
        return
      }

      setGameId(newGameId)
      setPin(newPin)

      try {
        await connectSocket()
      } catch (socketErr) {
        console.warn('[HOST LOBBY] Socket connection failed, game still playable:', socketErr.message)
      }

      if (socket.connected) {
        try {
          await new Promise((resolve, reject) => {
            const timeoutId = window.setTimeout(() => reject(new Error('Host attach timeout')), 15000)
            socket.emit('host:attach-game', { gameId: newGameId, pin: newPin }, (result) => {
              window.clearTimeout(timeoutId)
              if (!result?.success) { reject(new Error(result?.message || 'Host attach failed')); return }
              if (result.players) setPlayers(result.players)
              resolve(result)
            })
          })
          setIsConnected(true)
        } catch (attachErr) {
          console.warn('[HOST LOBBY] Attach failed, game still playable:', attachErr.message)
        }
      }

      sessionStorage.setItem('syncquiz-host-session', JSON.stringify({ gameId: newGameId, pin: newPin }))
      setPhase('lobby')
    } catch (err) {
      console.error('[HOST LOBBY] Init error:', err)
      const msg = err?.response?.data?.message || err?.message || ''
      setPhase('error')
      setErrorMsg(msg.includes('401') ? 'Vui lòng đăng nhập lại' : (msg || 'Đã xảy ra lỗi khi tạo phòng'))
      toast.error(msg || 'Đã xảy ra lỗi khi tạo phòng')
    }
  }

  useEffect(() => {
    if (quizId !== quizIdRef.current) {
      hasCreated.current = false
      quizIdRef.current = quizId
    }
    initGame()
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'hsl(225 42% 5%)' }}>
      <div className="w-full max-w-lg">
        {/* PIN card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="sq-card text-center mb-5"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Game PIN</p>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{
              backgroundColor: isConnected ? 'hsl(142 60% 42% / 0.15)' : 'hsl(0 75% 55% / 0.15)',
              color: isConnected ? 'hsl(142 60% 42%)' : 'hsl(0 75% 55%)'
            }}>
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

          <p className="text-xs mt-4 leading-relaxed" style={{ color: 'hsl(0 0% 100% / 0.35)' }}>
            Người chơi truy cập{' '}
            <span className="font-medium" style={{ color: 'hsl(270 92% 64%)' }}>{window.location.host}/join</span>
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
              <Users size={18} style={{ color: 'hsl(270 92% 64%)' }} />
              <span className="font-semibold text-sm">Người chơi</span>
              <span className="sq-badge sq-badge-primary ml-1">{players.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(0 0% 100% / 0.35)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(142 60% 42%)' }} />
              Đang chờ
            </div>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(0 0% 100% / 0.25)' }}>
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
            <p className="text-center text-xs mt-2" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>Cần ít nhất 1 người chơi để bắt đầu</p>
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
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'hsl(0 0% 0% / 0.8)' }}
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
                <h3 className="font-bold text-base">Quét để tham gia</h3>
                <button onClick={() => setShowQR(false)} className="sq-btn sq-btn-ghost sq-btn-icon" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 rounded-xl inline-block mb-4" style={{ backgroundColor: 'white' }}>
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <p className="text-xs mb-1 break-all px-2" style={{ color: 'hsl(0 0% 100% / 0.35)' }}>{joinUrl}</p>
              <p className="text-4xl font-black font-mono mt-3 tracking-widest" style={{ color: 'hsl(270 92% 64%)' }}>{pin}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
