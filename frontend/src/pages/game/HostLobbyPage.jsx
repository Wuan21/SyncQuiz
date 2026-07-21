import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, Copy, QrCode, X, Wifi, WifiOff } from 'lucide-react'
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
      className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-2.5 group"
    >
      <span className="text-2xl">{player.avatar || '😀'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{player.nickname}</p>
        {player.teamName && <p className="text-white/30 text-xs truncate">{player.teamName}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-white/20'}`} />
        <span className="text-white/25 text-xs">{player.connected ? 'Online' : 'Offline'}</span>
      </div>
    </motion.div>
  )
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
      <p className="text-white/40 text-sm">{children}</p>
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

  const joinUrl = pin ? `${window.location.origin}/join/${pin}` : ''

  useEffect(() => {
    if (hasCreated.current || !quizId) return
    hasCreated.current = true

    async function init() {
      try {
        const response = await createSession({ quizId })
        const data = response.data || response
        const newGameId = data.gameId || data.id || data._id
        const newPin = data.pin

        if (!newGameId || !newPin) {
          setPhase('error')
          setErrorMsg('Không thể tạo phòng chơi')
          return
        }

        setGameId(newGameId)
        setPin(newPin)

        await connectSocket()

        await new Promise((resolve, reject) => {
          const timeoutId = window.setTimeout(() => reject(new Error('Host attach timeout')), 15000)
          socket.emit('host:attach-game', { gameId: newGameId, pin: newPin }, (result) => {
            window.clearTimeout(timeoutId)
            if (!result?.success) { reject(new Error(result?.message || 'Host attach failed')); return }
            if (result.players) setPlayers(result.players)
            resolve(result)
          })
        })

        sessionStorage.setItem('syncquiz-host-session', JSON.stringify({ gameId: newGameId, pin: newPin }))
        setIsConnected(true)
        setPhase('lobby')
      } catch (err) {
        console.error('[HOST LOBBY] Init error:', err)
        setPhase('error')
        setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to create game')
        toast.error(err?.response?.data?.message || err?.message || 'Failed to create game')
      }
    }

    init()
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
    if (!socket.connected || !gameId) return
    if (players.length === 0) return toast.error('Cần ít nhất 1 người chơi')
    socket.emit('host:start')
  }

  if (phase === 'creating') return <Centered>Đang tạo phòng...</Centered>
  if (phase === 'error') return <Centered>{errorMsg || 'Đã xảy ra lỗi'}</Centered>

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* PIN card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="sq-card text-center mb-5"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Game PIN</p>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isConnected ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </div>
          </div>

          <div className="sq-pin">{pin}</div>

          <div className="flex gap-2 justify-center mt-5">
            <button onClick={copyPin} className="sq-btn sq-btn-secondary text-sm">
              <Copy size={14} /> Sao chép PIN
            </button>
            <button onClick={() => setShowQR(true)} className="sq-btn sq-btn-secondary text-sm">
              <QrCode size={14} /> QR Code
            </button>
          </div>

          <p className="text-white/35 text-xs mt-4 leading-relaxed">
            Người chơi truy cập{' '}
            <span className="text-violet-400 font-medium">{window.location.host}/join</span>
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
              <Users size={18} className="text-violet-400" />
              <span className="font-semibold text-sm">Người chơi</span>
              <span className="sq-badge sq-badge-primary ml-1">{players.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/35">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Đang chờ
            </div>
          </div>

          {players.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-6">
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
            className="sq-btn sq-btn-primary w-full py-4 text-lg disabled:opacity-40"
          >
            <Play size={20} /> Bắt đầu game
          </button>
          {players.length === 0 && (
            <p className="text-center text-white/30 text-xs mt-2">Cần ít nhất 1 người chơi để bắt đầu</p>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                <button onClick={() => setShowQR(false)} className="sq-btn sq-btn-ghost sq-btn-icon text-white/40">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-xl">
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <p className="text-white/35 text-xs mb-1 break-all px-2">{joinUrl}</p>
              <p className="text-4xl font-black font-mono text-violet-400 mt-3 tracking-widest">{pin}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
