import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { socket, connectSocket } from '../../store/useSocketStore'

const COLORS = ['var(--danger)', 'var(--primary)', 'var(--success)', 'var(--warning)']
const SHAPES = ['▲', '◆', '●', '■']
const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀']

export default function PlayerGamePage() {
  const { gameId: gameIdParam } = useParams()  // eslint-disable-line
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const sessionRaw = sessionStorage.getItem('syncquiz-player-session')
  const playerSession = sessionRaw ? JSON.parse(sessionRaw) : null
  const nickname = playerSession?.nickname || searchParams.get('nickname') || 'Player'
  const myPlayerId = playerSession?.playerId
  const avatar = playerSession?.avatar || AVATARS[0]

  const [phase, setPhase] = useState('lobby')
  const [question, setQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [correctOptions, setCorrectOptions] = useState([])
  const [removedOptions, setRemovedOptions] = useState([])
  const [powerUps, setPowerUps] = useState({ double_points: 1, fifty_fifty: 1, extra_time: 1 })
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

        socket.emit(
          'player:attach-game',
          {
            gameId: playerSession.gameId,
            playerId: playerSession.playerId,
            pin: playerSession.pin,
          },
          () => {}
        )
      } catch (_) {}
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
      toast.error('Host đã rời khỏi game')
      navigate('/')
    }

    socket.on('game:started', handleStarted)
    socket.on('game:question', handleQuestion)
    socket.on('powerup:activated', handlePowerUp)
    socket.on('player:answer_ack', handleAnswerAck)
    socket.on('game:question_end', handleQuestionEnd)
    socket.on('game:ended', handleEnded)
    socket.on('game:extra_time', handleExtraTime)
    socket.on('game:host_left', handleHostLeft)

    return () => {
      socket.off('game:started', handleStarted)
      socket.off('game:question', handleQuestion)
      socket.off('powerup:activated', handlePowerUp)
      socket.off('player:answer_ack', handleAnswerAck)
      socket.off('game:question_end', handleQuestionEnd)
      socket.off('game:ended', handleEnded)
      socket.off('game:extra_time', handleExtraTime)
      socket.off('game:host_left', handleHostLeft)
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
      <div className="min-h-screen sq-bg-gradient-primary flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4 animate-bounce">{avatar}</div>
        <h2 className="text-2xl font-bold mb-2 sq-text-white">{nickname}</h2>
        <p className="sq-text-white-70">Waiting for the host to start...</p>
        <div className="flex gap-1 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Ended ────────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    const me = leaderboard.find((p) => p.playerId === myPlayerId || p.nickname === nickname)
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center p-4 text-center">
        <Trophy size={64} className="sq-text-warning mb-4" />
        <h1 className="text-3xl font-bold mb-1 sq-text-foreground">Game Over!</h1>
        {me && (
          <p className="sq-text-muted mb-6">
            You ranked <span className="sq-text-warning font-bold">#{me.rank}</span> with{' '}
            <span className="sq-text-primary font-bold">{me.totalScore.toLocaleString()} pts</span>
          </p>
        )}
        <div className="w-full max-w-xs space-y-2 mb-8">
          {leaderboard.slice(0, 5).map((p) => (
            <div
              key={p.nickname}
              className={`flex items-center justify-between rounded-xl px-4 py-2 sq-border ${
                (p.playerId === myPlayerId || p.nickname === nickname)
                  ? 'sq-bg-primary-soft sq-border-primary'
                  : 'sq-bg-surface'
              }`}
            >
              <span className="sq-text-foreground">{p.rank}. {p.nickname}</span>
              <span className="font-bold sq-text-warning">{p.totalScore.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/join')} className="sq-btn sq-btn-primary px-8">Play Again</button>
      </div>
    )
  }

  // ── Result (after question) ───────────────────────────────────────────────
  if (phase === 'result' && question) {
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="sq-text-muted text-sm mb-4">Correct answer{correctOptions.length > 1 ? 's' : ''}:</p>
          <div className="space-y-2 mb-6">
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 font-semibold transition-all sq-text-foreground sq-border ${
                  correctOptions.includes(i) ? 'ring-2 sq-border-success' : 'opacity-30'
                }`}
                style={{ background: COLORS[i] }}
              >
                {SHAPES[i]} {opt.text}
              </div>
            ))}
          </div>
          {feedback && (
            <div className={`sq-card text-center ${
              feedback.isCorrect ? 'sq-border-success sq-bg-success-soft' : 'sq-border-danger sq-bg-danger-soft'
            }`}>
              <div className="text-4xl mb-1">{feedback.isCorrect ? '✅' : '❌'}</div>
              <p className="font-bold text-lg sq-text-foreground">{feedback.isCorrect ? 'Correct!' : 'Wrong'}</p>
              {feedback.isCorrect && (
                <p className="sq-text-primary text-sm">+{feedback.pointsEarned} pts · Total: {feedback.totalScore.toLocaleString()}</p>
              )}
            </div>
          )}
          <p className="sq-text-subtle text-xs mt-4">Next question coming up...</p>
        </div>
      </div>
    )
  }

  // ── Question ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen sq-bg-background flex flex-col p-4">
      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <span className="sq-text-subtle text-sm">Q{(question?.index ?? 0) + 1}/{question?.total}</span>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-xl sq-border ${
          timeLeft <= 5 ? 'sq-bg-danger-soft sq-text-danger' : 'sq-bg-surface sq-text-primary'
        }`}>
          <Clock size={16} />
          {timeLeft}
        </div>
        <div className="flex items-center gap-1 text-sm sq-text-subtle">
          <Zap size={14} className="sq-text-primary" />
          {feedback?.totalScore?.toLocaleString() ?? '0'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full sq-bg-surface rounded-full h-1.5 mb-6 overflow-hidden sq-border">
        <div
          className="h-1.5 rounded-full transition-all duration-1000 sq-bg-gradient-primary"
          style={{ width: `${(timeLeft / (question?.timeLimit || 30)) * 100}%` }}
        />
      </div>

      {/* Question text */}
      <div className="text-center mb-6 flex-1 flex flex-col items-center justify-center">
        {question?.imageUrl && (
          <img src={question.imageUrl} alt="question" className="rounded-xl max-h-40 object-cover mb-4 sq-border" />
        )}
        <h2 className="text-xl sm:text-2xl font-bold leading-snug max-w-xl sq-text-foreground">{question?.content}</h2>
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
                className={`rounded-2xl p-4 sq-text-foreground font-bold text-center text-lg transition-all active:scale-95 sq-border ${
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
            onClick={() => triggerPowerUp('double_points')} color="sq-bg-warning"
          />
          <PowerUpBtn
            label="50/50" title="Remove 2 wrong answers" active={powerUps.fifty_fifty > 0}
            onClick={() => triggerPowerUp('fifty_fifty')} color="sq-bg-primary"
          />
          <PowerUpBtn
            label="+15s" title="Add 15 seconds" active={powerUps.extra_time > 0}
            onClick={() => triggerPowerUp('extra_time')} color="sq-bg-success"
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
      className={`w-14 h-14 rounded-full font-bold sq-text-foreground text-sm transition-all active:scale-90 ${
        active ? `${color} shadow-lg hover:scale-110 sq-border` : 'sq-bg-surface opacity-40 cursor-not-allowed sq-border'
      }`}
    >
      {label}
    </button>
  )
}