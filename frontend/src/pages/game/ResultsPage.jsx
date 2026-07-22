import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Trophy, Users, Clock, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { getSessionResult } from '../../api/game.api'
import { Skeleton } from '../../components/ui/Skeleton'

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
          <span className="text-lg font-bold sq-text-foreground">{top3[1].nickname}</span>
          <span className="sq-text-warning text-sm font-semibold">{top3[1].totalScore?.toLocaleString()} pts</span>
          <div className="w-20 sq-bg-gradient-primary rounded-t-lg flex items-center justify-center sq-text-white font-bold text-3xl font-black" style={{ height: '80px' }}>
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
          <span className="text-lg font-bold sq-text-foreground">{top3[0].nickname}</span>
          <span className="sq-text-warning text-sm font-semibold">{top3[0].totalScore?.toLocaleString()} pts</span>
          <div className="w-24 sq-bg-gradient-primary rounded-t-lg flex items-center justify-center sq-text-white font-bold text-4xl font-black" style={{ height: '110px' }}>
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
          <span className="text-lg font-bold sq-text-foreground">{top3[2].nickname}</span>
          <span className="sq-text-warning text-sm font-semibold">{top3[2].totalScore?.toLocaleString()} pts</span>
          <div className="w-16 sq-bg-gradient-primary rounded-t-lg flex items-center justify-center sq-text-white font-bold text-2xl font-black" style={{ height: '55px' }}>
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
        className="inline-flex items-center gap-2 sq-text-subtle hover:sq-text-foreground text-sm mb-8 transition-colors"
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
        <div className="w-16 h-16 rounded-2xl sq-bg-warning-soft flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="sq-text-warning" />
        </div>
        <h1 className="sq-title-sm mb-2">{session.quizTitle || session.quizId?.title || 'Kết quả game'}</h1>
        <div className="flex items-center justify-center gap-6 sq-text-muted text-sm">
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
          <p className="text-center sq-text-subtle text-xs uppercase tracking-widest mb-6 font-medium">
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
          <h2 className="text-sm font-semibold sq-text-muted mb-3 uppercase tracking-wider">Tất cả người chơi</h2>
          <div className="space-y-2">
            {players.map((p) => (
              <motion.div
                key={p.nickname}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 sq-border ${
                  p.rank <= 3 ? 'sq-bg-warning-soft sq-border-warning' : 'sq-bg-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-black sq-text-subtle w-6 text-center">
                    {p.rank <= 3 ? TROPHY_EMOJIS[p.rank - 1] : `#${p.rank}`}
                  </span>
                  <span className="font-medium text-sm sq-text-foreground">{p.nickname}</span>
                  {p.teamName && (
                    <span className="sq-text-subtle text-xs">({p.teamName})</span>
                  )}
                </div>
                <span className="sq-text-warning font-bold text-sm">
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