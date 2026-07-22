import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
        className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 sq-border ${
          isFav
            ? 'sq-bg-danger-soft sq-text-danger sq-border-danger'
            : 'sq-bg-overlay sq-text-muted hover:sq-text-danger hover:sq-bg-danger-soft'
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
          <BookOpen size={28} className="sq-text-subtle opacity-60" />
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm truncate pr-8 sq-text-foreground">{quiz.title}</h3>
      {quiz.ownerId?.fullName && (
        <p className="sq-text-subtle text-xs mt-0.5 truncate">
          bởi {quiz.ownerId.fullName}
        </p>
      )}
      <p className="sq-text-subtle text-xs mt-1 mb-3">
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
    staleTime: 5 * 60_000,
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
    },
    onError: () => toast.error(t('common.error')),
  })

  const quizzes = data?.quizzes || data?.data || data || []

  return (
    <div className="sq-page">
      <div className="mb-8">
        <h1 className="sq-page-title">Khám phá Quiz</h1>
        <p className="sq-page-subtitle">{t('explore.subTitle')}</p>
      </div>

      {/* Search + categories */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 sq-text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('explore.searchPlaceholder')}
            className="sq-input pl-10"
          />
        </div>
        {categories?.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sq-select sm:w-auto sm:min-w-[180px]"
          >
            <option value="">{t('explore.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id || c.slug || c.name} value={c.id || c.slug || c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonQuizCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && quizzes.length === 0 && (
        <div className="sq-card">
          <EmptyState
            icon={Search}
            title={t('explore.noResults')}
            description={t('explore.tryDifferentSearch')}
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