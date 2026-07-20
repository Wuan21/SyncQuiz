import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2, Copy, Edit, Play, BookOpen, ClipboardList, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyQuizzes, deleteQuiz, cloneQuiz } from '../../api/quizzes.api'
import AssignHomeworkModal from '../../components/quiz/AssignHomeworkModal'

export default function QuizListPage() {
  const [search, setSearch] = useState('')
  const [assignQuiz, setAssignQuiz] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['quizzes', 'my', search],
    queryFn: () => getMyQuizzes({ search, limit: 100 }),
  })

  const rawQuizzes = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.quizzes)) return data.quizzes
    if (Array.isArray(data.data)) return data.data
    return []
  }, [data])

  const filteredQuizzes = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return rawQuizzes
    return rawQuizzes.filter((q) => q.title?.toLowerCase().includes(keyword))
  }, [rawQuizzes, search])

  const deleteMut = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      qc.invalidateQueries(['quizzes'])
      toast.success('Quiz deleted')
    },
  })

  const cloneMut = useMutation({
    mutationFn: cloneQuiz,
    onSuccess: () => {
      qc.invalidateQueries(['quizzes'])
      toast.success('Quiz cloned!')
    },
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

      {isLoading && (
        <div className="text-center text-white/40 py-20">Loading quizzes...</div>
      )}

      {error && (
        <div className="card text-center py-12 border-red-500/30 bg-red-500/10 mb-6">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-300 font-medium mb-1">Could not load quizzes</p>
          <p className="text-white/50 text-sm">{error.response?.data?.message || error.message}</p>
        </div>
      )}

      {!isLoading && !error && filteredQuizzes.length === 0 && (
        <div className="card text-center py-16">
          <BookOpen size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50 mb-4">
            {search ? 'No quizzes match your search' : 'No quizzes found'}
          </p>
          <Link to="/quizzes/new" className="btn-primary inline-block">
            Create your first quiz
          </Link>
        </div>
      )}

      {!isLoading && !error && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="card flex flex-col hover:border-white/30 transition-colors">
              <div className="h-36 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                {quiz.coverImageUrl ? (
                  <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={32} className="text-white/20" />
                )}
              </div>

              <h3 className="font-semibold truncate flex-1">{quiz.title}</h3>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <span className="text-xs text-white/40">{quiz.questionCount || 0} Qs</span>
                <span className="text-xs text-white/20">•</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    quiz.visibility === 'public'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {quiz.visibility || 'private'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/host/${quiz.id}`}
                  className="btn-primary text-xs py-1.5 flex-1 flex items-center justify-center gap-1"
                >
                  <Play size={12} /> Host
                </Link>
                <button
                  onClick={() => setAssignQuiz(quiz)}
                  className="btn-secondary text-xs py-1.5 px-2.5"
                  title="Giao bài tập"
                >
                  <ClipboardList size={14} />
                </button>
                <Link to={`/quizzes/${quiz.id}/edit`} className="btn-secondary text-xs py-1.5 px-2.5">
                  <Edit size={14} />
                </Link>
                <button onClick={() => cloneMut.mutate(quiz.id)} className="btn-secondary text-xs py-1.5 px-2.5">
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this quiz?')) deleteMut.mutate(quiz.id)
                  }}
                  className="text-red-400/60 hover:text-red-400 p-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignQuiz && (
        <AssignHomeworkModal
          quizId={assignQuiz.id}
          quizTitle={assignQuiz.title}
          onClose={() => setAssignQuiz(null)}
        />
      )}
    </div>
  )
}
