import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2, Copy, Edit, Play, BookOpen, ClipboardList, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { getMyQuizzes, deleteQuiz, cloneQuiz } from '../../api/quizzes.api'
import { SkeletonQuizCard } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/Modal'
import AssignHomeworkModal from '../../components/quiz/AssignHomeworkModal'

function QuizCard({ quiz, onDelete, onClone, onAssign, onHost, onEdit }) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="sq-card group"
    >
      {/* Cover image */}
      <div className="sq-quiz-cover">
        {quiz.coverImageUrl ? (
          <img src={quiz.coverImageUrl} alt={quiz.title} />
        ) : (
          <BookOpen size={28} className="text-white/20" />
        )}
      </div>

      {/* Title & meta */}
      <h3 className="font-semibold text-sm truncate mb-1">{quiz.title}</h3>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="sq-badge sq-badge-muted">{quiz.questionCount || 0} câu</span>
        <span className={`sq-badge ${quiz.visibility === 'public' ? 'sq-badge-success' : 'sq-badge-muted'}`}>
          {quiz.visibility === 'public' ? '🌐 Công khai' : '🔒 Riêng tư'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Link
          to={`/host/${quiz.id}`}
          className="sq-btn sq-btn-primary sq-btn-sm flex-1 flex items-center justify-center gap-1"
          title="Host game"
        >
          <Play size={12} /> Host
        </Link>

        <button
          onClick={() => onAssign(quiz)}
          className="sq-btn sq-btn-secondary sq-btn-sm px-2"
          title="Giao bài tập"
          aria-label="Assign as homework"
        >
          <ClipboardList size={14} />
        </button>

        <Link
          to={`/quizzes/${quiz.id}/edit`}
          className="sq-btn sq-btn-secondary sq-btn-sm px-2"
          title="Edit quiz"
          aria-label="Edit quiz"
        >
          <Edit size={14} />
        </Link>

        <button
          onClick={() => onClone(quiz.id)}
          className="sq-btn sq-btn-secondary sq-btn-sm px-2"
          title="Clone quiz"
          aria-label="Clone quiz"
        >
          <Copy size={14} />
        </button>

        <button
          onClick={() => setShowDelete(true)}
          className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
          title="Delete quiz"
          aria-label="Delete quiz"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => onDelete(quiz.id)}
        title="Xóa quiz?"
        message={`Bạn có chắc muốn xóa "${quiz.title}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
      />
    </motion.div>
  )
}

export default function QuizListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [assignQuiz, setAssignQuiz] = useState(null)
  const qc = useQueryClient()

  // Debounce search — only call API 300ms after user stops typing
  useEffect(() => {
    const tid = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(tid)
  }, [search])

  const { data, isLoading, error } = useQuery({
    queryKey: ['quizzes', 'my', debouncedSearch],
    queryFn: () => getMyQuizzes({ search: debouncedSearch, limit: 50 }),
    placeholderData: (prev) => prev,
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
      toast.success('Quiz đã được xóa')
    },
    onError: () => toast.error('Không thể xóa quiz'),
  })

  const cloneMut = useMutation({
    mutationFn: cloneQuiz,
    onSuccess: () => {
      qc.invalidateQueries(['quizzes'])
      toast.success('Đã sao chép quiz!')
    },
    onError: () => toast.error('Không thể sao chép quiz'),
  })

  return (
    <div className="sq-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="sq-page-title">Bộ câu hỏi của tôi</h1>
          <p className="sq-page-subtitle">
            {isLoading ? 'Đang tải...' : `${rawQuizzes.length} quiz đã tạo`}
          </p>
        </div>
        <Link to="/quizzes/new" className="sq-btn sq-btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus size={18} /> Tạo quiz mới
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm quiz..."
          className="sq-input pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonQuizCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sq-card border-red-500/20 bg-red-500/5 mb-6 text-center py-8">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
          <p className="text-red-300 font-medium mb-1">Không thể tải danh sách quiz</p>
          <p className="text-white/40 text-sm">{error.response?.data?.message || error.message}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filteredQuizzes.length === 0 && (
        <div className="sq-card">
          <EmptyState
            icon={BookOpen}
            title={search ? 'Không có kết quả tìm kiếm' : 'Chưa có quiz nào'}
            description={search ? `Không tìm thấy quiz nào phù hợp với "${search}"` : 'Tạo quiz đầu tiên của bạn để bắt đầu'}
            actionText={search ? undefined : 'Tạo quiz đầu tiên'}
            action={search ? undefined : () => window.location.href = '/quizzes/new'}
          />
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onDelete={(id) => deleteMut.mutate(id)}
                onClone={(id) => cloneMut.mutate(id)}
                onAssign={setAssignQuiz}
              />
            ))}
          </AnimatePresence>
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
