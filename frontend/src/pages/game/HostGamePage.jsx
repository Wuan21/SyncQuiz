import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Trophy, ChevronRight, Clock, XOctagon } from 'lucide-react'
import { socket, connectSocket } from '../../store/useSocketStore'

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825']
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

    if (!socket.connected) {
      const hostRaw = sessionStorage.getItem('syncquiz-host-session')
      if (hostRaw) {
        try {
          const session = JSON.parse(hostRaw)
          connectSocket()
            .then(() => {
              if (!mounted) return
              socket.emit('host:attach-game', { gameId: session.gameId, pin: session.pin }, (result) => {
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
            })
            .catch(console.error)
        } catch (_) {}
      }
    }

    return () => {
      mounted = false
    }
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
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <Trophy size={64} className="text-yellow-400 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
        <p className="text-white/50 mb-8">Final Leaderboard</p>
        <div className="w-full max-w-md space-y-2 mb-8">
          {leaderboard.slice(0, 5).map((p) => (
            <div key={p.nickname} className={`flex items-center justify-between rounded-xl px-4 py-3 ${p.rank === 1 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'}`}>
              <span className="font-semibold">{p.rank}. {p.nickname}</span>
              <span className="text-yellow-400 font-bold">{p.totalScore.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-8">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-4 relative">
      {/* End Game Confirm Modal */}
      {showEndConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <XOctagon size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Kết thúc sớm?</h3>
            <p className="text-white/60 mb-6 text-sm">
              Trò chơi sẽ lập tức kết thúc và hiển thị bảng xếp hạng cuối cùng cho mọi người. Bạn có chắc chắn không?
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 btn-secondary py-2">
                Huỷ bỏ
              </button>
              <button onClick={endGame} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 font-bold transition-all">
                Đồng ý Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl mb-6">
        <div className="flex items-center gap-3 px-3">
          <span className="text-white/50 text-sm">PIN:</span>
          <span className="font-mono font-bold text-xl tracking-wider">{pin}</span>
        </div>
        <button 
          onClick={() => setShowEndConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded-xl transition-all font-semibold text-sm"
        >
          <XOctagon size={16} />
          <span>Thoát</span>
        </button>
      </div>

      {phase === 'answer' && question && (
        <div className="flex-1 flex flex-col items-center pt-2">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-6">
              <p className="text-white/50 text-sm">Question {question.index + 1} / {question.total}</p>
              <h2 className="text-2xl font-bold mt-2">{question.content}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {question.options.map((opt, i) => (
                <div key={i} className={`rounded-xl p-4 text-white font-semibold text-center transition-all ${
                  correctOptions.includes(i) ? 'ring-4 ring-green-400 scale-105' : 'opacity-40'
                }`} style={{ background: COLORS[i] }}>
                  <span className="text-xl mr-2">{SHAPES[i]}</span> {opt.text}
                </div>
              ))}
            </div>
            <div className="card text-center mb-4">
              <p className="text-white/50 text-sm mb-1">Leaderboard</p>
              {leaderboard.slice(0, 3).map((p) => (
                <div key={p.nickname} className="flex items-center justify-between py-1">
                  <span>{p.rank}. {p.nickname}</span>
                  <span className="text-violet-400 font-bold">{p.totalScore.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={nextQuestion} className="btn-primary w-full flex items-center justify-center gap-2">
              Next Question <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {phase === 'question' && question && (
        <>
          {/* Timer bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-4">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / question.timeLimit) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-white/50 text-sm font-medium">Q{question.index + 1}/{question.total}</span>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 shadow-lg">
              <Clock size={16} className="text-violet-400" />
              <span className="font-mono font-bold text-xl text-violet-400">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white/70 bg-white/5 px-3 py-1.5 rounded-full">
              <Users size={16} />
              <span className="font-semibold">{answerCount.answered}/{answerCount.total}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            {question.imageUrl && (
              <img src={question.imageUrl} alt="question" className="rounded-xl max-h-48 object-cover mb-4 shadow-xl" />
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 px-4 leading-tight">{question.content}</h2>

            <div className="grid grid-cols-2 gap-4 w-full px-2">
              {question.options.map((opt, i) => (
                <div key={i} className="rounded-2xl p-5 text-white font-semibold text-center text-lg shadow-lg hover:brightness-110 transition-all cursor-default"
                  style={{ background: COLORS[i] }}>
                  <span className="text-2xl mr-2">{SHAPES[i]}</span> {opt.text}
                </div>
              ))}
            </div>
          </div>

          <button onClick={skipTime} className="mt-8 mb-4 mx-auto flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            Bỏ qua thời gian <ChevronRight size={16} />
          </button>
        </>
      )}

      {phase === 'waiting' && !question && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/50">Đang chờ câu hỏi...</p>
          </div>
        </div>
      )}
    </div>
  )
}
