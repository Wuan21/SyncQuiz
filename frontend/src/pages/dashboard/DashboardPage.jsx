import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Zap, BookOpen, Users, Trophy, Plus, Play } from 'lucide-react'
import { getAnalytics } from '../../api/game.api'
import { getMyQuizzes } from '../../api/quizzes.api'
import useAuthStore from '../../store/useAuthStore'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-white/50 text-sm">{label}</p>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics })
  const { data: myQuizzes } = useQuery({ queryKey: ['quizzes', 'my'], queryFn: () => getMyQuizzes({ limit: 6 }) })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, <span className="text-violet-400">{user?.fullName?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-white/50 mt-1">Ready to quiz the world?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Quizzes Created" value={analytics?.quizCount} color="bg-violet-600" />
        <StatCard icon={Zap} label="Games Hosted" value={analytics?.totalSessions} color="bg-pink-600" />
        <StatCard icon={Users} label="Avg Players" value={analytics?.avgPlayers} color="bg-blue-600" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link to="/quizzes/new"
          className="card flex items-center gap-4 hover:border-violet-500 transition-colors cursor-pointer group">
          <div className="p-4 bg-violet-600/20 rounded-xl group-hover:bg-violet-600/40 transition-colors">
            <Plus size={28} className="text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-lg">Create Quiz</p>
            <p className="text-white/50 text-sm">Build a new quiz from scratch</p>
          </div>
        </Link>

        <Link to="/join"
          className="card flex items-center gap-4 hover:border-pink-500 transition-colors cursor-pointer group">
          <div className="p-4 bg-pink-600/20 rounded-xl group-hover:bg-pink-600/40 transition-colors">
            <Play size={28} className="text-pink-400" />
          </div>
          <div>
            <p className="font-semibold text-lg">Join Game</p>
            <p className="text-white/50 text-sm">Enter a PIN to join a live quiz</p>
          </div>
        </Link>
      </div>

      {/* My Quizzes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">My Quizzes</h2>
          <Link to="/quizzes" className="text-violet-400 text-sm hover:underline">View all →</Link>
        </div>

        {myQuizzes?.quizzes?.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen size={40} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/50">No quizzes yet.</p>
            <Link to="/quizzes/new" className="btn-primary inline-block mt-4 text-sm">Create your first quiz</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myQuizzes?.quizzes?.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuizCard({ quiz }) {
  return (
    <div className="card hover:border-white/30 transition-colors">
      <div className="h-32 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
        {quiz.coverImageUrl
          ? <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover rounded-xl" />
          : <BookOpen size={32} className="text-white/30" />
        }
      </div>
      <h3 className="font-semibold truncate">{quiz.title}</h3>
      <p className="text-white/40 text-sm mt-1">{quiz.questionCount} questions</p>
      <div className="flex gap-2 mt-3">
        <Link to={`/quizzes/${quiz.id}/edit`} className="btn-secondary text-xs py-1.5 flex-1 text-center">Edit</Link>
        <Link to={`/host/${quiz.id}`} className="btn-primary text-xs py-1.5 flex-1 text-center">Host</Link>
      </div>
    </div>
  )
}
