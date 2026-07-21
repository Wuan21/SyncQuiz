import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, BookOpen, Play, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getQuizzes, toggleFavorite } from '../api/quizzes.api'
import { getCategories } from '../api/upload.api'
import { SkeletonQuizCard } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

function QuizCard({ quiz, isFav, onFav, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="sq-card group relative"
    >
      {/* Favorite button */}
      <button
        onClick={() => onFav(quiz.id)}
        className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
          isFav
            ? 'bg-red-500/20 text-red-400'
            : 'bg-black/30 text-white/30 hover:text-red-400 hover:bg-black/40'
        }`}
        title={isFav ? 'Bỏ yêu thích' : 'Yêu thích'}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
      </button>

      {/* Cover */}
      <div className="sq-quiz-cover">
        {quiz.coverImageUrl ? (
          <img src={quiz.coverImageUrl} alt={quiz.title} />
        ) : (
          <BookOpen size={28} className="text-white/20" />
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm truncate pr-8">{quiz.title}</h3>
      {quiz.ownerId?.fullName && (
        <p className="text-white/30 text-xs mt-0.5 truncate">
          bởi {quiz.ownerId.fullName}
        </p>
      )}
      <p className="text-white/35 text-xs mt-1 mb-3">
        {quiz.questionCount} câu · {quiz.totalPlays} lượt chơi
      </p>

      <Link
        to="/join"
        state={{ fromQuiz: quiz.id }}
        className="sq-btn sq-btn-primary sq-btn-sm w-full flex items-center justify-center gap-1.5"
      >
        <Play size={13} /> Chơi ngay
      </Link>
    </motion.div>
  )
}

export default function ExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('syncquiz-favorites') || '[]') } catch { return [] }
  })
  const qc = useQueryClient()

  // Debounce search — prevents API call on every keystroke
  useEffect(() => {
    const tid = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(tid)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes', 'public', debouncedSearch, category],
    queryFn: () => getQuizzes({ search: debouncedSearch, category, limit: 24 }),
    placeholderData: (prev) => prev,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60_000, // categories rarely change — cache for 5 min
    gcTime: 30 * 60_000,
  })

  const favMut = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (res, quizId) => {
      setFavorites((prev) => {
        const next = res.isFavorite ? [...prev, quizId] : prev.filter((id) => id !== quizId)
        localStorage.setItem('syncquiz-favorites', JSON.stringify(next))
        return next
      })
      qc.invalidateQueries({ queryKey: ['quizzes', 'public'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Đã xảy ra lỗi'),
  })

  const quizzes = data?.quizzes || []

  return (
    <div className="sq-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sq-page-title">{t('explore.title')}</h1>
          <p className="sq-page-subtitle">Khám phá quiz công khai từ cộng đồng</p>
        </div>
        <Link to="/favorites" className="sq-btn sq-btn-secondary text-sm shrink-0 flex items-center gap-2">
          <Heart size={14} /> {t('favorites.title')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('explore.searchPlaceholder')}
            className="sq-input pl-10"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="sq-select"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          <option value="">{t('explore.allCategories')}</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonQuizCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && quizzes.length === 0 && (
        <div className="sq-card">
          <EmptyState
            icon={BookOpen}
            title={t('explore.noQuizzes')}
            description={search || category ? 'Thử thay đổi bộ lọc tìm kiếm' : 'Chưa có quiz công khai nào'}
          />
        </div>
      )}

      {/* Grid */}
      {!isLoading && quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quizzes.map((quiz, i) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              isFav={favorites.includes(quiz.id)}
              onFav={(id) => favMut.mutate(id)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
