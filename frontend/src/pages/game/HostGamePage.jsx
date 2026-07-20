import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Trophy, ChevronRight, Clock } from 'lucide-react'
import { socket } from '../../store/useSocketStore'

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

  const next = () => socket.emit('host:next')

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

  if (phase === 'answer' && question) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4 pt-10">
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
          <button onClick={next} className="btn-primary w-full flex items-center justify-center gap-2">
            Next Question <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-4">
      {question && (
        <>
          {/* Timer bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-6">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / question.timeLimit) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-sm">Q{question.index + 1}/{question.total}</span>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <Clock size={14} className="text-violet-400" />
              <span className="font-mono font-bold text-xl text-violet-400">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-white/50">
              <Users size={14} />
              {answerCount.answered}/{answerCount.total}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            {question.imageUrl && (
              <img src={question.imageUrl} alt="question" className="rounded-xl max-h-48 object-cover mb-4" />
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">{question.content}</h2>

            <div className="grid grid-cols-2 gap-4 w-full">
              {question.options.map((opt, i) => (
                <div key={i} className="rounded-2xl p-5 text-white font-semibold text-center text-lg"
                  style={{ background: COLORS[i] }}>
                  <span className="text-2xl mr-2">{SHAPES[i]}</span> {opt.text}
                </div>
              ))}
            </div>
          </div>

          <button onClick={next} className="btn-secondary mt-6 mx-auto flex items-center gap-2 text-sm">
            Skip <ChevronRight size={16} />
          </button>
        </>
      )}
      {!question && (
        <div className="flex-1 flex items-center justify-center text-white/50">
          Waiting for first question...
        </div>
      )}
    </div>
  )
}
