import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { getStudentHomework } from '../../api/advanced.api'

export default function HomeworkPage() {
  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', 'student'],
    queryFn: getStudentHomework,
  })

  const now = new Date()
  const overdue = homework.filter((h) => !h.submitted && new Date(h.dueDate) < now)
  const pending = homework.filter((h) => !h.submitted && new Date(h.dueDate) >= now)
  const done = homework.filter((h) => h.submitted)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <BookOpen className="text-violet-400" /> Homework
      </h1>

      {isLoading && <div className="text-white/40 text-center py-12">Loading...</div>}

      {[
        { label: '⚠️ Overdue', items: overdue, color: 'border-red-500/30' },
        { label: '📋 Pending', items: pending, color: 'border-yellow-500/30' },
        { label: '✅ Completed', items: done, color: 'border-green-500/30' },
      ].map(({ label, items, color }) => items.length > 0 && (
        <div key={label} className="mb-8">
          <h2 className="font-semibold text-lg mb-3">{label}</h2>
          <div className="space-y-3">
            {items.map((hw) => (
              <div key={hw.id} className={`card border ${color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{hw.title}</h3>
                    <p className="text-white/50 text-sm mt-1">
                      {hw.classroomId?.name} · {hw.quizId?.questionCount} questions
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      By {hw.teacherId?.fullName} · Due {new Date(hw.dueDate).toLocaleString('vi')}
                    </p>
                    {hw.bestScore !== null && (
                      <p className="text-green-400 text-sm font-semibold mt-1">
                        Best score: {hw.bestScore}%
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {hw.canSubmit ? (
                      <Link to={`/homework/${hw.id}/take`} className="btn-primary text-sm py-1.5 px-4">
                        Start
                      </Link>
                    ) : hw.submitted ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle size={14} /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertCircle size={14} /> Expired
                      </span>
                    )}
                    <p className="text-white/30 text-xs mt-1">
                      {hw.mySubmissions?.length || 0}/{hw.allowedAttempts} attempts
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && homework.length === 0 && (
        <div className="card text-center py-16 text-white/30">
          No homework assigned yet 🎉
        </div>
      )}
    </div>
  )
}
