import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Trophy, ChevronRight, Clock, XOctagon } from 'lucide-react'
import { socket, connectSocket } from '../../store/useSocketStore'

const COLORS = ['var(--danger)', 'var(--primary)', 'var(--success)', 'var(--warning)']
const SHAPES = ['▲', '◆', '●', '■']

export default function HostGamePage() {
  const { pin } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('waiting') // waiting | question | answer | ended
  const [question, setQuestion] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 })
  const [correctOptions, setCorrectOptions] = useState([])
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Reconnect logic on mount
  useEffect(() => {
    let mounted = true

    const attachSession = () => {
      const hostRaw = sessionStorage.getItem('syncquiz-host-session')
      if (!hostRaw) return
      try {
        const session = JSON.parse(hostRaw)
        socket.emit('host:attach-game', { gameId: session.gameId, pin: session.pin }, (result) => {
          if (!mounted) return
          if (result?.gameState === 'running') {
            if (result.question) {
              setQuestion({ ...result.question, index: result.currentIdx, total: result.totalQuestions })
            }
            if (result.timeLeft !== undefined) {
              setTimeLeft(result.timeLeft)
            }
            if (result.answerCount) {
              setAnswerCount(result.answerCount)
            }
            setPhase('question')
          }
        })
      } catch (_) {}
    }

    if (socket.connected) {
      attachSession()
    } else {
      connectSocket()
        .then(() => {
          if (mounted) attachSession()
        })
        .catch(() => {})
    }

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const handleQuestion = ({ question: q, timeLimit, index, total }) => {
      setQuestion({ ...q, index, total })
      setTimeLeft(timeLimit)
      setPhase('question')
      setAnswerCount({ answered: 0, total: 0 })
      setCorrectOptions([])
    }

    const handleAnswerCount = (data) => setAnswerCount(data)

    const handleQuestionEnd = ({ correctOptions: co, leaderboard: lb }) => {
      setCorrectOptions(co)
      setLeaderboard(lb)
      setPhase('answer')
    }

    const handleEnded = ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('ended')
    }

    const handleExtraTime = ({ seconds }) => {
      setTimeLeft((prev) => prev + seconds)
    }

    socket.on('host:question', handleQuestion)
    socket.on('host:answer_count', handleAnswerCount)
    socket.on('game:question_end', handleQuestionEnd)
    socket.on('game:ended', handleEnded)
    socket.on('game:extra_time', handleExtraTime)

    return () => {
      socket.off('host:question', handleQuestion)
      socket.off('host:answer_count', handleAnswerCount)
      socket.off('game:question_end', handleQuestionEnd)
      socket.off('game:ended', handleEnded)
      socket.off('game:extra_time', handleExtraTime)
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft])

  const skipTime = () => socket.emit('host:skip_time')
  const nextQuestion = () => socket.emit('host:next_question')

  const endGame = () => {
    socket.emit('host:end_game')
    setShowEndConfirm(false)
  }

  if (phase === 'ended') {
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center p-4">
        <Trophy size={64} className="sq-text-warning mb-4" />
        <h1 className="text-3xl font-bold mb-2 sq-text-foreground">Game Over!</h1>
        <p className="sq-text-muted mb-8">Final Leaderboard</p>
        <div className="w-full max-w-md space-y-2 mb-8">
          {leaderboard.slice(0, 5).map((p) => (
            <div
              key={p.nickname}
              className={`flex items-center justify-between rounded-xl px-4 py-3 sq-border ${
                p.rank === 1
                  ? 'sq-bg-warning-soft sq-border-warning'
                  : 'sq-bg-surface'
              }`}
            >
              <span className="font-semibold sq-text-foreground">{p.rank}. {p.nickname}</span>
              <span className="sq-text-warning font-bold">{p.totalScore.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const hostRaw = sessionStorage.getItem('syncquiz-host-session')
            const session = hostRaw ? JSON.parse(hostRaw) : null
            if (session?.gameId) {
              navigate(`/results/${session.gameId}`)
            } else {
              navigate('/dashboard')
            }
          }}
          className="sq-btn sq-btn-primary px-8"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen sq-bg-background flex flex-col p-4 relative">
      {/* End Game Confirm Modal */}
      {showEndConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center sq-bg-overlay px-4 backdrop-blur-sm">
          <div className="sq-card max-w-sm w-full text-center shadow-2xl">
            <XOctagon size={48} className="sq-text-danger mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 sq-text-foreground">Kết thúc sớm?</h3>
            <p className="sq-text-muted mb-6 text-sm">
              Trò chơi sẽ lập tức kết thúc và hiển thị bảng xếp hạng cuối cùng cho mọi người. Bạn có chắc chắn không?
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 sq-btn sq-btn-secondary py-2">
                Huỷ bỏ
              </button>
              <button onClick={endGame} className="flex-1 sq-btn sq-btn-danger py-2">
                Đồng ý Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between sq-bg-surface sq-border rounded-2xl p-3 mb-6">
        <div className="flex items-center gap-3 px-3">
          <span className="sq-text-muted text-sm">PIN:</span>
          <span className="font-mono font-bold text-xl tracking-wider sq-text-foreground">{pin}</span>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="sq-btn sq-btn-danger sq-btn-sm flex items-center gap-2"
        >
          <XOctagon size={16} />
          <span>Thoát</span>
        </button>
      </div>

      {phase === 'answer' && question && (
        <div className="flex-1 flex flex-col items-center pt-2">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-6">
              <p className="sq-text-muted text-sm">Question {question.index + 1} / {question.total}</p>
              <h2 className="text-2xl font-bold mt-2 sq-text-foreground">{question.content}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 sq-text-foreground font-semibold text-center transition-all sq-border ${
                    correctOptions.includes(i) ? 'ring-4 sq-border-success scale-105' : 'opacity-40'
                  }`}
                  style={{ background: COLORS[i] }}
                >
                  <span className="text-xl mr-2">{SHAPES[i]}</span> {opt.text}
                </div>
              ))}
            </div>
            <div className="sq-card text-center mb-4">
              <p className="sq-text-muted text-sm mb-1">Leaderboard</p>
              {leaderboard.slice(0, 3).map((p) => (
                <div key={p.nickname} className="flex items-center justify-between py-1">
                  <span className="sq-text-foreground">{p.rank}. {p.nickname}</span>
                  <span className="sq-text-primary font-bold">{p.totalScore.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={nextQuestion} className="sq-btn sq-btn-primary w-full flex items-center justify-center gap-2">
              Next Question <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {phase === 'question' && question && (
        <>
          {/* Timer bar */}
          <div className="w-full sq-bg-surface rounded-full h-2 mb-4 overflow-hidden sq-border">
            <div
              className="h-2 rounded-full transition-all duration-1000 sq-bg-gradient-primary"
              style={{ width: `${(timeLeft / question.timeLimit) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <span className="sq-text-muted text-sm font-medium">Q{question.index + 1}/{question.total}</span>
            <div className="flex items-center gap-2 sq-bg-surface rounded-full px-4 py-1.5 shadow-lg sq-border sq-text-primary">
              <Clock size={16} />
              <span className="font-mono font-bold text-xl">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm sq-text-muted sq-bg-surface px-3 py-1.5 rounded-full sq-border">
              <Users size={16} />
              <span className="font-semibold">{answerCount.answered}/{answerCount.total}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            {question.imageUrl && (
              <img src={question.imageUrl} alt="question" className="rounded-xl max-h-48 object-cover mb-4 shadow-xl sq-border" />
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 px-4 leading-tight sq-text-foreground">{question.content}</h2>

            <div className="grid grid-cols-2 gap-4 w-full px-2">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 sq-text-foreground font-semibold text-center text-lg shadow-lg hover:brightness-110 transition-all cursor-default sq-border"
                  style={{ background: COLORS[i] }}
                >
                  <span className="text-2xl mr-2">{SHAPES[i]}</span> {opt.text}
                </div>
              ))}
            </div>
          </div>

          <button onClick={skipTime} className="mt-8 mb-4 mx-auto flex items-center justify-center gap-2 text-sm sq-text-subtle hover:sq-text-foreground transition-colors">
            Bỏ qua thời gian <ChevronRight size={16} />
          </button>
        </>
      )}

      {phase === 'waiting' && !question && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 border-4 sq-border-primary rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)' }}></div>
            <p className="sq-text-muted">Đang chờ câu hỏi...</p>
          </div>
        </div>
      )}
    </div>
  )
}