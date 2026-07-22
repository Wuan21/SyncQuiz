import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Users, BookOpen, Zap, TrendingUp } from 'lucide-react'
import { getAnalytics } from '../../api/upload.api'
import { getMyAchievements } from '../../api/advanced.api'

const ICON_CLASS = 'sq-text-primary-light'

const STAT_ICONS = {
  totalGames: Zap,
  quizCount: BookOpen,
  avgPlayers: Users,
  badges: Trophy,
}

// Dynamic import recharts — saves ~100KB from initial bundle
export default function AnalyticsPage() {
  const [Charts, setCharts] = useState(null)
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics })
  const { data: achievements } = useQuery({ queryKey: ['achievements'], queryFn: getMyAchievements })

  useEffect(() => {
    Promise.all([
      import('recharts'),
    ]).then(([rechartsModule]) => {
      setCharts({
        BarChart: rechartsModule.BarChart,
        Bar: rechartsModule.Bar,
        XAxis: rechartsModule.XAxis,
        YAxis: rechartsModule.YAxis,
        Tooltip: rechartsModule.Tooltip,
        ResponsiveContainer: rechartsModule.ResponsiveContainer,
        PieChart: rechartsModule.PieChart,
        Pie: rechartsModule.Pie,
        Cell: rechartsModule.Cell,
      })
    }).catch(() => {})
  }, [])

  const earnedBadges = achievements?.filter((a) => a.earned) || []

  const sessionChart = analytics?.recentSessions?.map((s, i) => ({
    name: `Game ${i + 1}`,
    players: s.playerCount || s.players?.length || 0,
    avgScore: s.avgScore || 0,
    date: s.date ? new Date(s.date).toLocaleDateString('vi') : '',
  })) || []

  const badgePieData = [
    { name: 'Earned', value: earnedBadges.length },
    { name: 'Remaining', value: (achievements?.length || 0) - earnedBadges.length },
  ]

  const statCards = [
    { label: 'Total Games', value: analytics?.totalSessions, icon: STAT_ICONS.totalGames },
    { label: 'Quizzes', value: analytics?.quizCount, icon: STAT_ICONS.quizCount },
    { label: 'Avg Players', value: analytics?.avgPlayers, icon: STAT_ICONS.avgPlayers },
    { label: 'Badges', value: `${earnedBadges.length}/${achievements?.length || 0}`, icon: STAT_ICONS.badges },
  ]

  return (
    <div className="sq-page">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl sq-bg-primary-soft flex items-center justify-center">
          <TrendingUp size={22} className={ICON_CLASS} />
        </div>
        <div>
          <h1 className="sq-page-title">Analytics</h1>
          <p className="sq-page-subtitle">Thống kê hoạt động của bạn</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="sq-card flex items-center gap-3">
            <Icon size={24} className={ICON_CLASS} />
            <div>
              <p className="sq-text-muted text-xs">{label}</p>
              <p className="text-2xl font-bold sq-text-foreground">{value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent games bar chart */}
        <div className="sq-card lg:col-span-2">
          <h2 className="sq-section-title mb-4">Players per Game</h2>
          {sessionChart.length > 0 && Charts ? (
            <Charts.ResponsiveContainer width="100%" height={200}>
              <Charts.BarChart data={sessionChart}>
                <Charts.XAxis dataKey="name" stroke="var(--text-subtle)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Charts.YAxis stroke="var(--text-subtle)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Charts.Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                <Charts.Bar dataKey="players" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </Charts.BarChart>
            </Charts.ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center sq-text-subtle">
              {sessionChart.length === 0 ? 'No game data yet' : 'Loading charts...'}
            </div>
          )}
        </div>

        {/* Badge pie */}
        <div className="sq-card">
          <h2 className="sq-section-title mb-4">Badges Progress</h2>
          <div className="flex flex-col items-center">
            {Charts ? (
              <Charts.ResponsiveContainer width="100%" height={150}>
                <Charts.PieChart>
                  <Charts.Pie
                    data={badgePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    dataKey="value"
                  >
                    <Charts.Cell fill="var(--success)" />
                    <Charts.Cell fill="var(--bg-surface)" />
                  </Charts.Pie>
                </Charts.PieChart>
              </Charts.ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center sq-text-subtle text-sm">
                Loading chart...
              </div>
            )}
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm sq-bg-success" />
                <span className="sq-text-muted">Earned ({earnedBadges.length})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm sq-bg-surface sq-border" />
                <span className="sq-text-muted">Remaining</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements list */}
      {achievements?.length > 0 && (
        <div className="sq-card">
          <h2 className="sq-section-title mb-4">Achievements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id || a.name}
                className={`sq-card flex items-center gap-3 sq-border ${a.earned ? 'sq-border-success sq-bg-success-soft' : 'opacity-60'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  a.earned ? 'sq-bg-success-soft sq-text-success' : 'sq-bg-surface sq-text-subtle'
                }`}>
                  <Trophy size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sq-text-foreground">{a.name}</p>
                  <p className="text-xs sq-text-muted truncate">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}