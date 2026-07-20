import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, BookOpen, Play, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuizzes, toggleFavorite } from '../api/quizzes.api'
import { getCategories } from '../api/upload.api'

export default function ExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('syncquiz-favorites') || '[]') } catch { return [] }
  })
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['quizzes', 'public', search, category],
    queryFn: () => getQuizzes({ search, category, limit: 24 }),
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

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
      qc.invalidateQueries({ queryKey: ['quizzes', 'public'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('explore.title')}</h1>
        <Link to="/favorites" className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
          <Heart size={14} /> {t('favorites.title')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('explore.searchPlaceholder')} className="input pl-10" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="select">
          <option value="">{t('explore.allCategories')}</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {data?.quizzes?.length === 0 && (
        <div className="card text-center py-16 text-white/40">{t('explore.noQuizzes')}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.quizzes?.map((quiz) => {
          const isFav = favorites.includes(quiz.id)
          return (
            <div key={quiz.id} className="card hover:border-white/30 transition-colors relative">
              <button
                onClick={() => favMut.mutate(quiz.id)}
                className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                  isFav
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-black/20 text-white/30 hover:text-red-400 hover:bg-black/30'
                }`}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
              </button>

              <div className="h-32 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                {quiz.coverImageUrl
                  ? <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover" />
                  : <BookOpen size={28} className="text-white/20" />
                }
              </div>
              <h3 className="font-semibold truncate pr-8">{quiz.title}</h3>
              {quiz.ownerId?.fullName && (
                <p className="text-white/30 text-xs mt-0.5 truncate">{t('explore.by')} {quiz.ownerId.fullName}</p>
              )}
              <p className="text-white/40 text-xs mt-1">{quiz.questionCount} {t('explore.questions')} &middot; {quiz.totalPlays} {t('explore.plays')}</p>
              <Link to="/join" state={{ fromQuiz: quiz.id }} className="btn-primary w-full text-sm mt-3 flex items-center justify-center gap-2">
                <Play size={14} /> {t('explore.play')}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
