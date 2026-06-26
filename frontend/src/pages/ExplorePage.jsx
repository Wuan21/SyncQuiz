import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, BookOpen, Play } from 'lucide-react'
import { getQuizzes } from '../api/quizzes.api'
import { getCategories } from '../api/game.api'

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data } = useQuery({
    queryKey: ['quizzes', 'public', search, category],
    queryFn: () => getQuizzes({ search, category, limit: 24 }),
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Quizzes</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search public quizzes..." className="input pl-10" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="select">
          <option value="">All Categories</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {data?.quizzes?.length === 0 && (
        <div className="card text-center py-16 text-white/40">No public quizzes found</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.quizzes?.map((quiz) => (
          <div key={quiz.id} className="card hover:border-white/30 transition-colors">
            <div className="h-32 bg-gradient-to-br from-violet-600/30 to-pink-600/30 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
              {quiz.coverImageUrl
                ? <img src={quiz.coverImageUrl} alt={quiz.title} className="w-full h-full object-cover" />
                : <BookOpen size={28} className="text-white/20" />
              }
            </div>
            <h3 className="font-semibold truncate">{quiz.title}</h3>
            <p className="text-white/40 text-xs mt-1">{quiz.questionCount} questions • {quiz.totalPlays} plays</p>
            <Link to={`/join`} state={{ fromQuiz: quiz.id }} className="btn-primary w-full text-sm mt-3 flex items-center justify-center gap-2">
              <Play size={14} /> Play
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
