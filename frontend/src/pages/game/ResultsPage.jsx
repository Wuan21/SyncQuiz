import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Trophy, Users, Clock, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { getSessionResult } from '../../api/game.api'
import { Skeleton } from '../../components/ui/Skeleton'

const TROPHY_COLORS = ['#fbbf24', '#94a3b8', '#cd7c3c']
const TROPHY_EMOJIS = ['🥇', '🥈', '🥉']

function Podium({ players }) {
  const top3 = players.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-3 mb-8">
      {/* 2nd place */}
      {top3[1] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col items-center gap-2 order-1"
        >
          <span className="text-3xl">{TROPHY_EMOJIS[1]}</span>
          <span className="text-lg font-bold">{top3[1].nickname}</span>
          <span className="text-yellow-300 text-sm font-semibold">{top3[1].totalScore?.toLocaleString()} pts</span>
          <div className="w-20 bg-gradient-to-t from-slate-600 to-slate-400 rounded-t-lg flex items-center justify-center text-white/60 font-bold text-3xl font-black" style={{ height: '80px' }}>
            2
          </div>
        </motion.div>
      )}

      {/* 1st place */}
      {top3[0] && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center gap-2 order-2"
        >
          <span className="text-4xl">{TROPHY_EMOJIS[0]}</span>
          <span className="text-lg font-bold">{top3[0].nickname}</span>
          <span className="text-yellow-300 text-sm font-semibold">{top3[0].totalScore?.toLocaleString()} pts</span>
          <div className="w-24 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg flex items-center justify-center text-white/80 font-bold text-4xl font-black" style={{ height: '110px' }}>
            1
          </div>
        </motion.div>
      )}

      {/* 3rd place */}
      {top3[2] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center gap-2 order-3"
        >
          <span className="text-3xl">{TROPHY_EMOJIS[2]}</span>
          <span className="text-lg font-bold">{top3[2].nickname}</span>
          <span className="text-yellow-300 text-sm font-semibold">{top3[2].totalScore?.toLocaleString()} pts</span>
          <div className="w-16 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg flex items-center justify-center text-white/60 font-bold text-2xl font-black" style={{ height: '55px' }}>
            3
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const { sessionId } = useParams()
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionResult(sessionId),
  })

  if (isLoading) {
    return (
      <div className="sq-page-narrow py-12">
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (!session) return null

  const duration = session.startedAt && session.endedAt
    ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
    : null

  const players = session.players || []
  const top3 = players.slice(0, 3)

  return (
    <div className="sq-page-narrow">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Quay về Dashboard
      </Link>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sq-card text-center mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-yellow-400" />
        </div>
        <h1 className="sq-title-sm mb-2">{session.quizTitle || session.quizId?.title || 'Kết quả game'}</h1>
        <div className="flex items-center justify-center gap-6 text-white/40 text-sm">
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {players.length} người chơi
          </span>
          {duration && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {duration > 60 ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : `${duration}s`}
            </span>
          )}
        </div>
      </motion.div>

      {/* Podium — only show if there are top players */}
      {top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="sq-card mb-6"
        >
          <p className="text-center text-white/35 text-xs uppercase tracking-widest mb-6 font-medium">
            Bảng xếp hạng
          </p>
          <Podium players={players} />
        </motion.div>
      )}

      {/* Full leaderboard */}
      {players.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="sq-card"
        >
          <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">Tất cả người chơi</h2>
          <div className="space-y-2">
            {players.map((p, i) => (
              <motion.div
                key={p.nickname}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.04, duration: 0.3 }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  p.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/15'
                    : 'bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-white/25 w-6 text-center">
                    {p.rank <= 3 ? TROPHY_EMOJIS[p.rank - 1] : `#${p.rank}`}
                  </span>
                  <span className="font-medium text-sm">{p.nickname}</span>
                  {p.teamName && (
                    <span className="text-white/25 text-xs">({p.teamName})</span>
                  )}
                </div>
                <span className="text-yellow-400 font-bold text-sm">
                  {p.totalScore?.toLocaleString()} pts
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Back button */}
      <div className="text-center mt-8">
        <Link to="/dashboard" className="sq-btn sq-btn-primary px-8">
          Quay về Dashboard
        </Link>
      </div>
    </div>
  )
}
