import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Zap } from 'lucide-react'
import { socket, connectSocket } from '../../store/useSocketStore'

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825']
const SHAPES = ['▲', '◆', '●', '■']
const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀']

export default function PlayerGamePage() {
  const { pin, gameId: gameIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Determine if we're in lobby mode
  const isLobbyRoute = location.pathname.includes('/lobby')

  // Get player session from sessionStorage
  const sessionRaw = sessionStorage.getItem('syncquiz-player-session')
  const playerSession = sessionRaw ? JSON.parse(sessionRaw) : null
  const nickname = playerSession?.nickname || searchParams.get('nickname') || 'Player'
  const myPlayerId = playerSession?.playerId
  const avatar = playerSession?.avatar || AVATARS[0]

  const [phase, setPhase] = useState(isLobbyRoute ? 'lobby' : 'lobby')
  const [question, setQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [correctOptions, setCorrectOptions] = useState([])
  const [removedOptions, setRemovedOptions] = useState([])
  const [powerUps, setPowerUps] = useState({ double_points: 1, fifty_fifty: 1, extra_time: 1 })
  const [players, setPlayers] = useState([])
  const answerTs = useRef(null)
  const hasAttached = useRef(false)

  /* ── Reconnect socket + re-attach on mount ────────────────────────────── */
  useEffect(() => {
    if (hasAttached.current) return
    hasAttached.current = true

    async function attachPlayer() {
      if (!playerSession) return

      try {
        await connectSocket()

        // Re-attach player to game via socket
        socket.emit(
          'player:attach-game',
          {
            gameId: playerSession.gameId,
            playerId: playerSession.playerId,
            pin: playerSession.pin,
          },
          (result) => {
            if (result?.success) {
              console.log('[PLAYER GAME] Re-attached to game')
            } else {
              console.warn('[PLAYER GAME] Re-attach failed:', result)
            }
          },
        )
      } catch (err) {
        console.error('[PLAYER GAME] Socket connect error:', err)
      }
    }

    attachPlayer()
  }, []) // eslint-disable-line

  /* ── Socket event listeners ─────────────────────────────────────────── */
  useEffect(() => {
    const handleStarted = () => setPhase('question')

    const handleQuestion = (q) => {
      setQuestion(q)
      setTimeLeft(q.timeLimit)
      setSelected(null)
      setFeedback(null)
      setCorrectOptions([])
      setRemovedOptions([])
      setPhase('question')
      answerTs.current = Date.now()
    }

    const handlePowerUp = ({ type, removedOptions: ro }) => {
      if (type === 'fifty_fifty' && ro) setRemovedOptions(ro)
    }

    const handleAnswerAck = (data) => {
      setFeedback(data)
      setPhase('answered')
    }

    const handleQuestionEnd = ({ correctOptions: co, leaderboard: lb }) => {
      setCorrectOptions(co)
      setLeaderboard(lb)
      setPhase('result')
    }

    const handleEnded = ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('ended')
    }

    const handleExtraTime = ({ seconds }) => {
      setTimeLeft((prev) => prev + seconds)
    }

    const handleHostLeft = () => {
      alert('Host has left the game')
      navigate('/')
    }

    const handlePlayerList = (list) => {
      setPlayers(list)
    }

    socket.on('game:started', handleStarted)
    socket.on('game:question', handleQuestion)
    socket.on('powerup:activated', handlePowerUp)
    socket.on('player:answer_ack', handleAnswerAck)
    socket.on('game:question_end', handleQuestionEnd)
    socket.on('game:ended', handleEnded)
    socket.on('game:extra_time', handleExtraTime)
    socket.on('game:host_left', handleHostLeft)
    socket.on('player-list:updated', handlePlayerList)

    return () => {
      socket.off('game:started', handleStarted)
      socket.off('game:question', handleQuestion)
      socket.off('powerup:activated', handlePowerUp)
      socket.off('player:answer_ack', handleAnswerAck)
      socket.off('game:question_end', handleQuestionEnd)
      socket.off('game:ended', handleEnded)
      socket.off('game:extra_time', handleExtraTime)
      socket.off('game:host_left', handleHostLeft)
      socket.off('player-list:updated', handlePlayerList)
    }
  }, [navigate])

  // Countdown
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft])

  const triggerPowerUp = (type) => {
    if (!powerUps[type] || selected !== null) return
    socket.emit('player:powerup', { type })
    setPowerUps((p) => ({ ...p, [type]: 0 }))
  }

  const answer = (optionIndex) => {
    if (phase !== 'question' || selected !== null) return
    const timeSpent = Date.now() - (answerTs.current || Date.now())
    setSelected(optionIndex)
    socket.emit('player:answer', { optionIndex, timeSpent })
  }

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 to-gray-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4 animate-bounce">{avatar}</div>
        <h2 className="text-2xl font-bold mb-2">{nickname}</h2>
        <p className="text-white/50">Waiting for the host to start...</p>
        <div className="flex gap-1 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Ended ────────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    const me = leaderboard.find((p) => p.playerId === myPlayerId || p.nickname === nickname)
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <Trophy size={64} className="text-yellow-400 mb-4" />
        <h1 className="text-3xl font-bold mb-1">Game Over!</h1>
        {me && (
          <p className="text-white/60 mb-6">
            You ranked <span className="text-yellow-400 font-bold">#{me.rank}</span> with{' '}
            <span className="text-violet-400 font-bold">{me.totalScore.toLocaleString()} pts</span>
          </p>
        )}
        <div className="w-full max-w-xs space-y-2 mb-8">
          {leaderboard.slice(0, 5).map((p) => (
            <div key={p.nickname}
              className={`flex items-center justify-between rounded-xl px-4 py-2 ${(p.playerId === myPlayerId || p.nickname === nickname) ? 'bg-violet-600/30 border border-violet-500/40' : 'bg-white/5'}`}>
              <span>{p.rank}. {p.nickname}</span>
              <span className="font-bold text-yellow-400">{p.totalScore.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/join')} className="btn-primary px-8">Play Again</button>
      </div>
    )
  }

  // ── Result (after question) ───────────────────────────────────────────────
  if (phase === 'result' && question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-white/50 text-sm mb-4">Correct answer{correctOptions.length > 1 ? 's' : ''}:</p>
          <div className="space-y-2 mb-6">
            {question.options.map((opt, i) => (
              <div key={i} className={`rounded-xl px-4 py-3 font-semibold transition-all ${
                correctOptions.includes(i) ? 'ring-2 ring-green-400' : 'opacity-30'
              }`} style={{ background: COLORS[i] }}>
                {SHAPES[i]} {opt.text}
              </div>
            ))}
          </div>
          {feedback && (
            <div className={`card text-center ${feedback.isCorrect ? 'border-green-500/40' : 'border-red-500/40'}`}>
              <div className="text-4xl mb-1">{feedback.isCorrect ? '✅' : '❌'}</div>
              <p className="font-bold text-lg">{feedback.isCorrect ? 'Correct!' : 'Wrong'}</p>
              {feedback.isCorrect && (
                <p className="text-violet-400 text-sm">+{feedback.pointsEarned} pts · Total: {feedback.totalScore.toLocaleString()}</p>
              )}
            </div>
          )}
          <p className="text-white/30 text-xs mt-4">Next question coming up...</p>
        </div>
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-4">
      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/40 text-sm">Q{(question?.index ?? 0) + 1}/{question?.total}</span>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-xl ${
          timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-violet-400'
        }`}>
          <Clock size={16} />
          {timeLeft}
        </div>
        <div className="flex items-center gap-1 text-sm text-white/40">
          <Zap size={14} className="text-violet-400" />
          {feedback?.totalScore?.toLocaleString() ?? '0'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-1.5 mb-6">
        <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-1000"
          style={{ width: `${(timeLeft / (question?.timeLimit || 30)) * 100}%` }} />
      </div>

      {/* Question text */}
      <div className="text-center mb-6 flex-1 flex flex-col items-center justify-center">
        {question?.imageUrl && (
          <img src={question.imageUrl} alt="question" className="rounded-xl max-h-40 object-cover mb-4" />
        )}
        <h2 className="text-xl sm:text-2xl font-bold leading-snug max-w-xl">{question?.content}</h2>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
        <AnimatePresence>
          {question?.options.map((opt, i) => {
            const removed = removedOptions.includes(i)
            return (
              <motion.button
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: removed ? 0.7 : 1, opacity: removed ? 0.15 : 1 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => !removed && answer(i)}
                disabled={selected !== null || removed}
                className={`rounded-2xl p-4 text-white font-bold text-center text-lg transition-all active:scale-95 ${
                  selected === i ? 'ring-4 ring-white scale-95'
                  : selected !== null || removed ? 'opacity-40' : 'hover:scale-105'
                }`}
                style={{ background: COLORS[i], minHeight: 80 }}
              >
                <span className="text-2xl">{SHAPES[i]}</span>
                <br />
                <span className="text-sm mt-1 block">{opt.text}</span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Power-ups bar */}
      {selected === null && (
        <div className="flex justify-center gap-3 mt-4">
          <PowerUpBtn
            label="2×" title="Double Points" active={powerUps.double_points > 0}
            onClick={() => triggerPowerUp('double_points')} color="bg-yellow-500"
          />
          <PowerUpBtn
            label="50/50" title="Remove 2 wrong answers" active={powerUps.fifty_fifty > 0}
            onClick={() => triggerPowerUp('fifty_fifty')} color="bg-blue-500"
          />
          <PowerUpBtn
            label="+15s" title="Add 15 seconds" active={powerUps.extra_time > 0}
            onClick={() => triggerPowerUp('extra_time')} color="bg-green-500"
          />
        </div>
      )}
    </div>
  )
}

function PowerUpBtn({ label, title, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      disabled={!active}
      title={title}
      className={`w-14 h-14 rounded-full font-bold text-white text-sm transition-all active:scale-90 ${
        active ? `${color} shadow-lg hover:scale-110` : 'bg-white/10 opacity-40 cursor-not-allowed'
      }`}
    >
      {label}
    </button>
  )
}
