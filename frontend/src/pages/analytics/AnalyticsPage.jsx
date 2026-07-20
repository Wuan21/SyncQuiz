import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Trophy, Users, BookOpen, Zap, TrendingUp } from 'lucide-react'
import { getAnalytics } from '../../api/upload.api'
import { getMyAchievements } from '../../api/advanced.api'

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

export default function AnalyticsPage() {
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics })
  const { data: achievements } = useQuery({ queryKey: ['achievements'], queryFn: getMyAchievements })

  const earnedBadges = achievements?.filter((a) => a.earned) || []

  // Build chart data from recent sessions
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <TrendingUp className="text-violet-400" /> Analytics
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Games', value: analytics?.totalSessions, icon: Zap, color: 'text-violet-400' },
          { label: 'Quizzes', value: analytics?.quizCount, icon: BookOpen, color: 'text-pink-400' },
          { label: 'Avg Players', value: analytics?.avgPlayers, icon: Users, color: 'text-blue-400' },
          { label: 'Badges', value: `${earnedBadges.length}/${achievements?.length || 0}`, icon: Trophy, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <Icon size={24} className={color} />
            <div>
              <p className="text-white/50 text-xs">{label}</p>
              <p className="text-2xl font-bold">{value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent games bar chart */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Players per Game</h2>
          {sessionChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionChart}>
                <XAxis dataKey="name" stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 11 }} />
                <YAxis stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="players" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30">No game data yet</div>
          )}
        </div>

        {/* Badge pie */}
        <div className="card">
          <h2 className="font-semibold mb-4">Badges Progress</h2>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={badgePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value">
                  {badgePieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#6366f1' : '#ffffff15'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-3xl font-bold text-violet-400">{earnedBadges.length}</p>
            <p className="text-white/40 text-sm">of {achievements?.length || 0} badges</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card">
        <h2 className="font-semibold mb-5">🏆 Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {achievements?.map((badge) => (
            <div
              key={badge.id}
              className={`flex flex-col items-center text-center p-4 rounded-xl transition-all ${
                badge.earned
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/3 border border-white/5 opacity-40 grayscale'
              }`}
            >
              <span className="text-3xl mb-2">{badge.icon}</span>
              <p className="font-semibold text-sm">{badge.name}</p>
              <p className="text-white/40 text-xs mt-1">{badge.desc}</p>
              {badge.earned && badge.earnedAt && (
                <p className="text-violet-400 text-xs mt-2">
                  {new Date(badge.earnedAt).toLocaleDateString('vi')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
