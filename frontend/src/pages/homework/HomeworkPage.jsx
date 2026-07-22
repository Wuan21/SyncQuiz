import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { getStudentHomework } from '../../api/advanced.api'

const GROUP_VARIANTS = [
  { key: 'overdue', label: '⚠️ Quá hạn', cls: 'sq-border-danger sq-bg-danger-soft' },
  { key: 'pending', label: '📋 Đang làm', cls: 'sq-border-warning sq-bg-warning-soft' },
  { key: 'done', label: '✅ Hoàn thành', cls: 'sq-border-success sq-bg-success-soft' },
]

export default function HomeworkPage() {
  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', 'student'],
    queryFn: getStudentHomework,
  })

  const now = new Date()
  const overdue = homework.filter((h) => !h.submitted && new Date(h.dueDate) < now)
  const pending = homework.filter((h) => !h.submitted && new Date(h.dueDate) >= now)
  const done = homework.filter((h) => h.submitted)

  const groups = {
    overdue,
    pending,
    done,
  }

  return (
    <div className="sq-page">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl sq-bg-primary-soft flex items-center justify-center">
          <BookOpen size={22} className="sq-text-primary-light" />
        </div>
        <div>
          <h1 className="sq-page-title">Homework</h1>
          <p className="sq-page-subtitle">Danh sách bài tập được giao</p>
        </div>
      </div>

      {isLoading && <div className="sq-text-muted text-center py-12">Loading...</div>}

      {GROUP_VARIANTS.map(({ key, label, cls }) => {
        const items = groups[key]
        if (!items || items.length === 0) return null
        return (
          <section key={key} className="mb-8">
            <h2 className="sq-section-title mb-3">{label}</h2>
            <div className="space-y-3">
              {items.map((hw) => (
                <div key={hw.id} className={`sq-card sq-border ${cls}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold sq-text-foreground">{hw.title}</h3>
                      <p className="sq-text-muted text-sm mt-1">
                        {hw.classroomId?.name} · {hw.quizId?.questionCount} questions
                      </p>
                      <p className="sq-text-subtle text-xs mt-1">
                        By {hw.teacherId?.fullName} · Due {new Date(hw.dueDate).toLocaleString('vi')}
                      </p>
                      {hw.bestScore !== null && (
                        <p className="sq-text-success text-sm font-semibold mt-1">
                          Best score: {hw.bestScore}%
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {hw.canSubmit ? (
                        <Link to={`/homework/${hw.id}/take`} className="sq-btn sq-btn-primary text-sm py-1.5 px-4">
                          Start
                        </Link>
                      ) : hw.submitted ? (
                        <span className="flex items-center gap-1 sq-text-success text-sm">
                          <CheckCircle size={14} /> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 sq-text-danger text-sm">
                          <AlertCircle size={14} /> Expired
                        </span>
                      )}
                      <p className="sq-text-subtle text-xs mt-1">
                        {hw.mySubmissions?.length || 0}/{hw.allowedAttempts} attempts
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {!isLoading && homework.length === 0 && (
        <div className="sq-card text-center py-16 sq-text-subtle">
          No homework assigned yet 🎉
        </div>
      )}
    </div>
  )
}