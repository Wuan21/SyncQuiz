import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Users, Play, Copy, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { createSession } from '../../api/game.api'
import useSocketStore from '../../store/useSocketStore'

export default function HostLobbyPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { socket, connect } = useSocketStore()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [showQR, setShowQR] = useState(false)
  const hasCreated = useRef(false)

  const joinUrl = session ? `${window.location.origin}/join/${session.pin}` : ''

  const createMut = useMutation({
    mutationFn: () => createSession({ quizId }),
    onSuccess: (data) => {
      console.log('[HOST LOBBY] Session created successfully:', data)
      setSession(data)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create game'),
  })

  useEffect(() => {
    if (!hasCreated.current && quizId) {
      hasCreated.current = true
      createMut.mutate()
    }
  }, [quizId]) // eslint-disable-line

  useEffect(() => {
    if (!session) return
    const sock = connect() || socket
    if (!sock) return

    const sId = session.id || session._id
    sock.emit('host:join', { sessionId: sId, pin: session.pin })

    sock.on('host:joined', (data) => {
      if (data.players) setPlayers(data.players)
    })
    sock.on('host:lobby_update', ({ players: ps }) => setPlayers(ps))
    sock.on('host:player_joined', ({ playerCount }) => {
      toast.success(`Có người chơi mới tham gia (${playerCount} người)`)
    })
    sock.on('game:started', () => navigate(`/host/game/${session.pin}`))

    return () => {
      sock.off('host:joined')
      sock.off('host:lobby_update')
      sock.off('host:player_joined')
      sock.off('game:started')
    }
  }, [session, socket]) // eslint-disable-line

  useEffect(() => { connect() }, []) // eslint-disable-line

  const startGame = () => {
    const sock = socket || connect()
    if (!sock || !session) return
    if (players.length === 0) return toast.error('Wait for at least 1 player')
    sock.emit('host:start')
  }

  if (createMut.isPending) return <Centered>Creating game...</Centered>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        {/* PIN display */}
        <div className="card mb-6">
          <p className="text-white/50 text-sm mb-2">Game PIN</p>
          <div className="text-6xl font-black tracking-widest text-violet-400 font-mono">
            {session.pin}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { navigator.clipboard.writeText(session.pin); toast.success('PIN copied!') }}
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
                <div key={i} className="bg-white/5 rounded-lg px-3 py-2 text-sm truncate">
                  {p.nickname}
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
            <p className="text-4xl font-black font-mono text-violet-400 mt-3">{session.pin}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-white/50">{children}</div>
}
