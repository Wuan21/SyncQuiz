import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Trophy, Users, Clock, ArrowLeft } from 'lucide-react'
import { getSessionResult } from '../../api/game.api'

export default function ResultsPage() {
  const { sessionId } = useParams()
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionResult(sessionId),
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white/40">Loading results...</div>
  if (!session) return null

  const duration = session.startedAt && session.endedAt
    ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="card text-center mb-6">
        <Trophy size={48} className="text-yellow-400 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">{session.quizId?.title || 'Game Results'}</h1>
        <div className="flex items-center justify-center gap-6 mt-3 text-white/50 text-sm">
          <span className="flex items-center gap-1"><Users size={14} /> {session.players?.length} players</span>
          {duration && <span className="flex items-center gap-1"><Clock size={14} /> {duration}s</span>}
        </div>
      </div>

      <div className="space-y-2">
        {session.players?.map((p) => (
          <div key={p.nickname}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              p.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' : 'bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white/30 w-8">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}</span>
              <span className="font-semibold">{p.nickname}</span>
            </div>
            <span className="text-yellow-400 font-bold">{p.totalScore?.toLocaleString()} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
