import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Zap, BookOpen, Users, Plus, Play, ArrowRight, RefreshCw, AlertCircle, Loader2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDashboardOverview } from '../../api/dashboard.api'
import useAuthStore from '../../store/useAuthStore'
import { Skeleton } from '../../components/ui/Skeleton'

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, bgColor, textColor, delay = 0 }) {
  return (
    <div
      className="sq-stat"
      style={{ animationDelay: `${delay}ms`, animation: 'sq-fade-up 0.4s ease-out both' }}
    >
      <div
        className="sq-stat-icon"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="sq-stat-value">{value ?? '—'}</p>
        <p className="sq-stat-label">{label}</p>
      </div>
    </div>
  )
}

/* ─── Quick Action Card ─── */
function QuickAction({ to, icon: Icon, title, description, bgColor, textColor, delay = 0 }) {
  return (
    <Link
      to={to}
      className="sq-card flex items-center gap-4 group"
      style={{ animationDelay: `${delay}ms`, animation: 'sq-fade-up 0.4s ease-out both' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm mt-0.5">{description}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

/* ─── Quiz Card ─── */
function QuizCard({ quiz, index }) {
  const { t } = useTranslation()
  return (
    <div
      className="sq-card group"
      style={{ animationDelay: `${100 + index * 50}ms`, animation: 'sq-fade-up 0.35s ease-out both' }}
    >
      <div className="sq-quiz-cover">
        {quiz.coverImageUrl
          ? <img src={quiz.coverImageUrl} alt={quiz.title} loading="lazy" />
          : <BookOpen size={28} className="opacity-30" />
        }
      </div>
      <h3 className="font-semibold text-sm truncate mb-1">{quiz.title}</h3>
      <p className="text-sm mt-1 mb-3">
        {quiz.questionCount || 0} {t('dashboard.questionsCount', { count: quiz.questionCount || 0 })}
      </p>
      <div className="flex gap-2">
        <Link
          to={`/quizzes/${quiz.id}/edit`}
          className="sq-btn sq-btn-secondary sq-btn-sm flex-1 text-center"
        >
          {t('common.edit')}
        </Link>
        <Link
          to={`/host/${quiz.id}`}
          className="sq-btn sq-btn-primary sq-btn-sm flex-1 text-center"
        >
          <Play size={11} /> {t('dashboard.host')}
        </Link>
      </div>
    </div>
  )
}

/* ─── Loading Skeletons ─── */
function StatSkeleton() {
  return (
    <div className="sq-stat">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-7 w-12 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="sq-card">
      <div className="sq-quiz-cover sq-skeleton" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

/* ─── Error States ─── */
function ServerWakingUpState({ onRetry }) {
  return (
    <div className="sq-card text-center py-8">
      <Loader2 size={40} className="mx-auto mb-3 animate-spin opacity-50" />
      <p className="font-medium mb-1">Máy chủ đang khởi động</p>
      <p className="text-sm text-muted mb-4">Vui lòng chờ trong giây lát...</p>
      <button onClick={onRetry} className="sq-btn sq-btn-primary sq-btn-sm">
        <RefreshCw size={14} /> Thử lại ngay
      </button>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="sq-card text-center py-8">
      <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
      <p className="font-medium mb-1">Không thể tải dữ liệu</p>
      <p className="text-sm text-muted mb-4">Vui lòng thử lại sau</p>
      <button onClick={onRetry} className="sq-btn sq-btn-primary sq-btn-sm">
        <RefreshCw size={14} /> Thử lại
      </button>
    </div>
  )
}

/* ─── Empty State ─── */
function EmptyQuizzesState() {
  const { t } = useTranslation()
  return (
    <div className="sq-card text-center py-10">
      <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium mb-1">{t('dashboard.noQuizzesYet')}</p>
      <p className="text-sm mb-5">{t('dashboard.createFirstQuiz')}</p>
      <Link to="/quizzes/new" className="sq-btn sq-btn-primary">
        <Plus size={16} /> {t('dashboard.createQuizBtn')}
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isAuthLoading = useAuthStore((s) => s.isLoading)
  const accessToken = useAuthStore((s) => s.accessToken)

  // Only fetch dashboard data when auth is ready
  const shouldFetch = !isAuthLoading && (user || accessToken)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
    enabled: shouldFetch,
    retry: 2,
    staleTime: 60_000,
    gcTime: 300_000,
    select: (response) => response?.data,
    throwOnError: false,
  })

  const firstName = user?.fullName?.split(' ').slice(-1)[0] || user?.fullName?.split(' ')[0] || ''

  const stats = data?.statistics
  const recentQuizzes = data?.recentQuizzes || []

  // Determine which error state to show based on error type
  const showServerWakingUp = isError && !data && (isLoading || isFetching)

  return (
    <div className="sq-page">

      {/* ─── Header ─── */}
      <div className="mb-8" style={{ animation: 'sq-fade-in 0.4s ease-out' }}>
        <h1 className="sq-page-title">
          {t('dashboard.welcome')}{' '}
          <span className="sq-text-gradient">{firstName}</span> 👋
        </h1>
        <p className="sq-page-subtitle">{t('dashboard.subTitle')}</p>
      </div>

      {/* ─── Stats ─── */}
      <section className="sq-section">
        <h2 className="sq-section-title mb-4">Thống kê nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading || !shouldFetch ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : isError && !data ? (
            <>
              <StatCard icon={BookOpen} label={t('dashboard.totalQuizzes')} value="—" bgColor="hsl(270 90% 58% / 0.12)" textColor="hsl(270 92% 64%)" />
              <StatCard icon={Zap} label={t('dashboard.gamesHosted')} value="—" bgColor="hsl(330 85% 58% / 0.12)" textColor="hsl(330 90% 65%)" />
              <StatCard icon={Users} label={t('dashboard.avgPlayers')} value="—" bgColor="hsl(145 65% 42% / 0.12)" textColor="hsl(145 55% 48%)" />
            </>
          ) : (
            <>
              <StatCard icon={BookOpen} label={t('dashboard.totalQuizzes')} value={stats?.totalQuizzes ?? '—'} bgColor="hsl(270 90% 58% / 0.12)" textColor="hsl(270 92% 64%)" delay={0} />
              <StatCard icon={Zap} label={t('dashboard.gamesHosted')} value={stats?.totalGames ?? '—'} bgColor="hsl(330 85% 58% / 0.12)" textColor="hsl(330 90% 65%)" delay={60} />
              <StatCard icon={Users} label={t('dashboard.avgPlayers')} value={stats?.averagePlayers ?? '—'} bgColor="hsl(145 65% 42% / 0.12)" textColor="hsl(145 55% 48%)" delay={120} />
            </>
          )}
        </div>
      </section>

      {/* ─── Quick Actions ─── */}
      <section className="sq-section">
        <h2 className="sq-section-title mb-4">Hành động nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            to="/quizzes/new"
            icon={Plus}
            title={t('dashboard.createQuizBtn')}
            description={t('dashboard.createQuizDesc')}
            bgColor="hsl(270 90% 58% / 0.12)"
            textColor="hsl(270 92% 64%)"
            delay={150}
          />
          <QuickAction
            to="/join"
            icon={Play}
            title={t('nav.joinGame')}
            description={t('dashboard.joinGameDesc')}
            bgColor="hsl(330 85% 58% / 0.12)"
            textColor="hsl(330 90% 65%)"
            delay={200}
          />
        </div>
      </section>

      {/* ─── My Quizzes ─── */}
      <section className="sq-section">
        <div className="sq-section-header">
          <h2 className="sq-section-title">{t('dashboard.myQuizzes')}</h2>
          <Link to="/quizzes" className="text-sm font-medium" style={{ color: 'hsl(270 92% 64%)' }}>
            {t('dashboard.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading || !shouldFetch ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <LoadingCard key={i} />)}
          </div>
        ) : isError && !data ? (
          showServerWakingUp ? (
            <ServerWakingUpState onRetry={() => refetch()} />
          ) : (
            <ErrorState onRetry={() => refetch()} />
          )
        ) : recentQuizzes.length === 0 ? (
          <EmptyQuizzesState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentQuizzes.map((q, i) => (
              <QuizCard key={q.id} quiz={q} index={i} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
