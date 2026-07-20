import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, Copy, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { createSession } from '../../api/game.api'
import { socket, connectSocket } from '../../store/useSocketStore'

export default function HostLobbyPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [gameId, setGameId] = useState(null)
  const [pin, setPin] = useState(null)
  const [players, setPlayers] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [phase, setPhase] = useState('creating') // creating | lobby | error
  const [errorMsg, setErrorMsg] = useState('')
  const hasCreated = useRef(false)

  const joinUrl = pin ? `${window.location.origin}/join/${pin}` : ''

  /* ── Create session + attach socket ─────────────────────────────────── */
  useEffect(() => {
    if (hasCreated.current || !quizId) return
    hasCreated.current = true

    async function init() {
      try {
        // Step 1: REST create session
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

        // Step 2: Connect Socket.IO
        await connectSocket()

        // Step 3: Emit host:attach-game with acknowledgment
        await new Promise((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject(new Error('Host attach timeout'))
          }, 15000)

          socket.emit(
            'host:attach-game',
            { gameId: newGameId, pin: newPin },
            (result) => {
              window.clearTimeout(timeoutId)
              if (!result?.success) {
                reject(new Error(result?.message || 'Host attach failed'))
                return
              }
              // Set initial player list from attach response
              if (result.players) {
                setPlayers(result.players)
              }
              resolve(result)
            },
          )
        })

        // Save host session for reconnect
        sessionStorage.setItem(
          'syncquiz-host-session',
          JSON.stringify({ gameId: newGameId, pin: newPin }),
        )

        setPhase('lobby')
      } catch (err) {
        console.error('[HOST LOBBY] Init error:', err)
        setPhase('error')
        setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to create game')
        toast.error(err?.response?.data?.message || err?.message || 'Failed to create game')
      }
    }

    init()
  }, [quizId]) // eslint-disable-line

  /* ── Listen for player list updates ─────────────────────────────────── */
  useEffect(() => {
    const handlePlayers = (playerList) => {
      setPlayers(playerList)
    }

    socket.on('player-list:updated', handlePlayers)
    socket.on('game:started', () => {
      if (pin) navigate(`/host/game/${pin}`)
    })

    return () => {
      socket.off('player-list:updated', handlePlayers)
      socket.off('game:started')
    }
  }, [pin, navigate])

  /* ── Start game ─────────────────────────────────────────────────────── */
  const startGame = () => {
    if (!socket.connected || !gameId) return
    if (players.length === 0) return toast.error('Cần ít nhất 1 người chơi')
    socket.emit('host:start')
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  if (phase === 'creating') return <Centered>Creating game...</Centered>
  if (phase === 'error') return <Centered>{errorMsg || 'Something went wrong'}</Centered>

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        {/* PIN display */}
        <div className="card mb-6">
          <p className="text-white/50 text-sm mb-2">Game PIN</p>
          <div className="text-6xl font-black tracking-widest text-violet-400 font-mono">
            {pin}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { navigator.clipboard.writeText(pin); toast.success('PIN copied!') }}
              className="btn-secondary mt-4 text-sm flex items-center gap-2"
            >
              <Copy size={14} /> Copy PIN
            </button>
            <button onClick={() => setShowQR(true)} className="btn-secondary mt-4 text-sm flex items-center gap-2">
              <QrCode size={14} /> QR Code
            </button>
          </div>
          <p className="text-white/40 text-sm mt-3">
            Players go to <span className="text-violet-400 font-semibold">{window.location.host}/join</span> and enter this PIN
          </p>
        </div>

        {/* Player list */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-violet-400" />
              <span className="font-semibold">{players.length} Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/50">Waiting</span>
            </div>
          </div>

          {players.length === 0 ? (
            <p className="text-white/30 text-sm py-4">Waiting for players to join...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {players.map((p, i) => (
                <div key={p.playerId || i} className="bg-white/5 rounded-lg px-3 py-2 text-sm truncate flex items-center gap-2">
                  <span>{p.avatar || '😀'}</span>
                  <span>{p.nickname}</span>
                  {p.connected && <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={startGame} disabled={players.length === 0}
          className="btn-primary text-lg px-10 py-4 flex items-center gap-3 mx-auto">
          <Play size={22} /> Start Game
        </button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Scan to Join</h3>
              <button onClick={() => setShowQR(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
            <p className="text-white/50 text-sm">{joinUrl}</p>
            <p className="text-4xl font-black font-mono text-violet-400 mt-3">{pin}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-white/50">{children}</div>
}
