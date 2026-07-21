import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Zap, BookOpen, Users, Plus, Play, TrendingUp, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { getAnalytics } from '../../api/upload.api'
import { getMyQuizzes } from '../../api/quizzes.api'
import useAuthStore from '../../store/useAuthStore'
import { SkeletonStat, SkeletonQuizCard } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'

function StatCard({ icon: Icon, label, value, colorClass, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="sq-stat group"
    >
      <div className={`sq-stat-icon ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="sq-stat-value">{value ?? '—'}</p>
        <p className="sq-stat-label">{label}</p>
      </div>
    </motion.div>
  )
}

function QuickAction({ to, icon: Icon, title, description, colorClass, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Link
        to={to}
        className="sq-card flex items-center gap-4 group hover:border-white/20 block"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 ${colorClass}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base">{title}</p>
          <p className="text-white/40 text-sm mt-0.5">{description}</p>
        </div>
        <ArrowRight size={18} className="text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all shrink-0" />
      </Link>
    </motion.div>
  )
}

function QuizCard({ quiz, index }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      className="sq-card group"
    >
      <div className="sq-quiz-cover">
        {quiz.coverImageUrl
          ? <img src={quiz.coverImageUrl} alt={quiz.title} />
          : <BookOpen size={28} className="text-white/20" />
        }
      </div>
      <h3 className="font-semibold truncate text-sm">{quiz.title}</h3>
      <p className="text-white/35 text-xs mt-1 mb-3">
        {quiz.questionCount} {t('dashboard.questionsCount', { count: quiz.questionCount })}
      </p>
      <div className="flex gap-2">
        <Link to={`/quizzes/${quiz.id}/edit`} className="sq-btn sq-btn-secondary sq-btn-sm flex-1 text-center">
          {t('common.edit')}
        </Link>
        <Link to={`/host/${quiz.id}`} className="sq-btn sq-btn-primary sq-btn-sm flex-1 text-center">
          <Play size={12} /> {t('dashboard.host')}
        </Link>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
  })
  const { data: myQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['quizzes', 'my'],
    queryFn: () => getMyQuizzes({ limit: 6 }),
  })

  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName?.split(' ')[0] || ''

  return (
    <div className="sq-page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="sq-page-title">
          {t('dashboard.welcome')}{' '}
          <span className="sq-gradient">{firstName}</span>
        </h1>
        <p className="sq-page-subtitle">{t('dashboard.subTitle')}</p>
      </motion.div>

      {/* Stats */}
      <section className="sq-section">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={BookOpen}
            label={t('dashboard.totalQuizzes')}
            value={analytics?.quizCount}
            colorClass="bg-violet-500/15 text-violet-400"
            delay={0}
          />
          <StatCard
            icon={Zap}
            label={t('dashboard.gamesHosted')}
            value={analytics?.totalSessions}
            colorClass="bg-pink-500/15 text-pink-400"
            delay={0.06}
          />
          <StatCard
            icon={Users}
            label={t('dashboard.avgPlayers')}
            value={analytics?.avgPlayers}
            colorClass="bg-blue-500/15 text-blue-400"
            delay={0.12}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="sq-section">
        <h2 className="sq-section-title mb-4">{t('dashboard.quickActions') || 'Quick actions'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            to="/quizzes/new"
            icon={Plus}
            title={t('dashboard.createQuizBtn')}
            description={t('dashboard.createQuizDesc')}
            colorClass="bg-violet-500/15 text-violet-400"
            delay={0.15}
          />
          <QuickAction
            to="/join"
            icon={Play}
            title={t('nav.joinGame')}
            description={t('dashboard.joinGameDesc')}
            colorClass="bg-pink-500/15 text-pink-400"
            delay={0.2}
          />
        </div>
      </section>

      {/* My Quizzes */}
      <section className="sq-section">
        <div className="sq-section-header">
          <h2 className="sq-section-title">{t('dashboard.myQuizzes')}</h2>
          <Link to="/quizzes" className="text-violet-400 text-sm font-medium hover:text-violet-300 transition-colors flex items-center gap-1">
            {t('dashboard.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>

        {quizzesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonQuizCard key={i} />)}
          </div>
        ) : !myQuizzes?.quizzes?.length ? (
          <div className="sq-card">
            <EmptyState
              icon={BookOpen}
              title={t('dashboard.noQuizzesYet')}
              description={t('dashboard.createFirstQuizDesc') || 'Create your first quiz to get started'}
              actionText={t('dashboard.createFirstQuiz')}
              action={() => window.location.href = '/quizzes/new'}
              actionVariant="primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myQuizzes.quizzes.map((q, i) => (
              <QuizCard key={q.id} quiz={q} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
