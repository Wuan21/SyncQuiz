import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Users, Play, Copy, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { createSession } from '../../api/game.api'
import useSocketStore from '../../store/useSocketStore'

export default function HostLobbyPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { socket, connect } = useSocketStore()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])

  const createMut = useMutation({
    mutationFn: () => createSession({ quizId }),
    onSuccess: (data) => setSession(data),
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create game'),
  })

  useEffect(() => { createMut.mutate() }, []) // eslint-disable-line

  useEffect(() => {
    if (!session || !socket) return
    socket.emit('host:join', { sessionId: session.id })

    socket.on('host:lobby_update', ({ players: ps }) => setPlayers(ps))
    socket.on('host:player_joined', ({ playerCount }) => {
      toast.success(`${playerCount} player(s) waiting`)
    })
    socket.on('game:started', () => navigate(`/host/game/${session.pin}`))

    return () => { socket.off('host:lobby_update'); socket.off('host:player_joined'); socket.off('game:started') }
  }, [session, socket]) // eslint-disable-line

  useEffect(() => { connect() }, []) // eslint-disable-line

  const startGame = () => {
    if (!socket || !session) return
    if (players.length === 0) return toast.error('Wait for at least 1 player')
    socket.emit('host:start')
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
          <button
            onClick={() => { navigator.clipboard.writeText(session.pin); toast.success('PIN copied!') }}
            className="btn-secondary mt-4 text-sm flex items-center gap-2 mx-auto"
          >
            <Copy size={14} /> Copy PIN
          </button>
          <p className="text-white/40 text-sm mt-3">
            Players go to <span className="text-violet-400 font-semibold">syncquiz.app/join</span> and enter this PIN
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
    </div>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-white/50">{children}</div>
}
