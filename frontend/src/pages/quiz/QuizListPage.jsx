import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2, Copy, Edit, Play, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyQuizzes, deleteQuiz, cloneQuiz } from '../../api/quizzes.api'

export default function QuizListPage() {
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes', 'my', search],
    queryFn: () => getMyQuizzes({ search, limit: 24 }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => { qc.invalidateQueries(['quizzes']); toast.success('Quiz deleted') },
  })

  const cloneMut = useMutation({
    mutationFn: cloneQuiz,
    onSuccess: () => { qc.invalidateQueries(['quizzes']); toast.success('Quiz cloned!') },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <Link to="/quizzes/new" className="btn-primary flex items-center gap-2 w-fit">
          <Plus size={18} /> New Quiz
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes..."
          className="input pl-10"
        />
      </div>

      {isLoading && <div className="text-center text-white/40 py-20">Loading...</div>}

      {!isLoading && data?.quizzes?.length === 0 && (
        <div className="card text-center py-16">
          <BookOpen size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50 mb-4">No quizzes found</p>
          <Link to="/quizzes/new" className="btn-primary inline-block">Create your first quiz</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.quizzes?.map((quiz) => (
          <div key={quiz.id} className="card flex flex-col hover:border-white/30 transition-colors">
            <div className="h-36 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
              {quiz.coverImageUrl
                ? <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover" />
                : <BookOpen size={32} className="text-white/20" />
              }
            </div>

            <h3 className="font-semibold truncate flex-1">{quiz.title}</h3>
            <div className="flex items-center gap-2 mt-1 mb-3">
              <span className="text-xs text-white/40">{quiz.questionCount} Qs</span>
              <span className="text-xs text-white/20">•</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${quiz.visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                {quiz.visibility}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link to={`/host/${quiz.id}`} className="btn-primary text-xs py-1.5 flex-1 flex items-center justify-center gap-1">
                <Play size={12} /> Host
              </Link>
              <Link to={`/quizzes/${quiz.id}/edit`} className="btn-secondary text-xs py-1.5 px-2.5">
                <Edit size={14} />
              </Link>
              <button onClick={() => cloneMut.mutate(quiz.id)} className="btn-secondary text-xs py-1.5 px-2.5">
                <Copy size={14} />
              </button>
              <button
                onClick={() => { if (confirm('Delete this quiz?')) deleteMut.mutate(quiz.id) }}
                className="text-red-400/60 hover:text-red-400 p-1.5 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
