import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Heart, BookOpen, Play, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyFavorites, toggleFavorite } from '../../api/quizzes.api'

export default function FavoritesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: getMyFavorites,
  })

  const favMut = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (res, quizId) => {
      setFavorites((prev) => {
        const next = res.isFavorite
          ? [...prev, quizId]
          : prev.filter((id) => id !== quizId)
        localStorage.setItem('syncquiz-favorites', JSON.stringify(next))
        return next
      })
      qc.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error(t('common.error')),
  })

  const quizzes = (data?.quizzes || data?.data || [])

  return (
    <div className="sq-page">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/explore" className="sq-btn sq-btn-secondary sq-btn-icon" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <Heart size={28} className="sq-text-danger" />
        <h1 className="sq-page-title">{t('favorites.title')}</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-16 sq-text-muted">{t('common.loading')}</div>
      ) : quizzes.length === 0 ? (
        <div className="sq-card text-center py-16">
          <Heart size={48} className="mx-auto sq-text-subtle opacity-50 mb-4" />
          <p className="sq-text-muted text-lg mb-2">{t('favorites.noFavorites')}</p>
          <p className="sq-text-subtle text-sm mb-6">{t('favorites.noFavoritesHint')}</p>
          <Link to="/explore" className="sq-btn sq-btn-primary text-sm py-2 px-5 inline-flex items-center gap-2">
            <BookOpen size={16} /> {t('favorites.exploreQuizzes')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="sq-card relative">
              <button
                onClick={() => favMut.mutate(quiz.id)}
                className="absolute top-3 right-3 sq-btn sq-btn-icon sq-bg-danger-soft sq-text-danger hover:sq-bg-danger-light sq-border sq-border-danger w-9 h-9 rounded-full"
                title="Remove from favorites"
                aria-label="Remove from favorites"
              >
                <Heart size={16} fill="currentColor" />
              </button>

              <div className="sq-quiz-cover">
                {quiz.coverImageUrl
                  ? <img src={quiz.coverImageUrl} alt={quiz.title} />
                  : <BookOpen size={28} className="sq-text-subtle opacity-60" />
                }
              </div>
              <h3 className="font-semibold truncate pr-8 sq-text-foreground">{quiz.title}</h3>
              <p className="sq-text-subtle text-xs mt-1">{quiz.questionCount} {t('explore.questions')} &middot; {quiz.totalPlays} {t('explore.plays')}</p>
              <Link to="/join" state={{ fromQuiz: quiz.id }} className="sq-btn sq-btn-primary w-full text-sm mt-3 flex items-center justify-center gap-2">
                <Play size={14} /> {t('explore.play')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}