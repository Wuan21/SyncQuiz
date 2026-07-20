import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Heart, BookOpen, Play, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyFavorites, toggleFavorite } from '../../api/quizzes.api'

export default function FavoritesPage() {
  const { t } = useTranslation()
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('syncquiz-favorites') || '[]') } catch { return [] }
  })
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/explore" className="btn-secondary p-2 rounded-lg hover:bg-white/10">
          <ArrowLeft size={18} />
        </Link>
        <Heart size={28} className="text-red-400" />
        <h1 className="text-3xl font-bold">{t('favorites.title')}</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-white/40">{t('common.loading')}</div>
      ) : quizzes.length === 0 ? (
        <div className="card text-center py-16">
          <Heart size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-lg mb-2">{t('favorites.noFavorites')}</p>
          <p className="text-white/20 text-sm mb-6">{t('favorites.noFavoritesHint')}</p>
          <Link to="/explore" className="btn-primary text-sm py-2 px-5 inline-flex items-center gap-2">
            <BookOpen size={16} /> {t('favorites.exploreQuizzes')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="card hover:border-white/30 transition-colors relative">
              <button
                onClick={() => favMut.mutate(quiz.id)}
                className="absolute top-3 right-3 p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                title="Remove from favorites"
              >
                <Heart size={16} fill="currentColor" />
              </button>

              <div className="h-32 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                {quiz.coverImageUrl
                  ? <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover" />
                  : <BookOpen size={28} className="text-white/20" />
                }
              </div>
              <h3 className="font-semibold truncate pr-8">{quiz.title}</h3>
              <p className="text-white/40 text-xs mt-1">{quiz.questionCount} {t('explore.questions')} &middot; {quiz.totalPlays} {t('explore.plays')}</p>
              <Link to="/join" state={{ fromQuiz: quiz.id }} className="btn-primary w-full text-sm mt-3 flex items-center justify-center gap-2">
                <Play size={14} /> {t('explore.play')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
