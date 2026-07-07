import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, CalendarClock, CheckCircle2, FileWarning, GraduationCap, Users } from 'lucide-react'
import { getClassroomGradebook } from '../../api/advanced.api'

function formatDate(value) {
  if (!value) return 'Chua co'
  return new Date(value).toLocaleString('vi')
}

export default function GradebookPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['classroom-gradebook', id],
    queryFn: () => getClassroomGradebook(id),
    enabled: Boolean(id),
  })

  const topPerformer = useMemo(() => {
    const students = data?.students || []
    return [...students]
      .filter((student) => student.averageScore !== null)
      .sort((a, b) => b.averageScore - a.averageScore)[0]
  }, [data])

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-white/40">Dang tai bang diem...</div>
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="card border border-red-500/30 text-red-200">
          Khong the tai bang diem. Vui long thu lai sau.
        </div>
      </div>
    )
  }

  const { classroom, summary, students, homeworks } = data

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to="/classrooms" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-3">
            <ArrowLeft size={16} />
            Quay lai danh sach lop hoc
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="text-violet-400" />
            Bang diem lop {classroom.name}
          </h1>
          <p className="text-white/50 mt-2">
            Theo doi tien do lam homework, diem trung binh va han nop cua hoc sinh trong lop.
          </p>
        </div>

        <div className="card min-w-[220px] border border-violet-500/20 bg-violet-600/5">
          <p className="text-white/40 text-xs uppercase tracking-wider">Ma lop</p>
          <p className="text-2xl font-bold text-violet-300 mt-1">{classroom.code}</p>
          <p className="text-white/40 text-sm mt-2">{classroom.studentCount} hoc sinh</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card border border-white/10">
          <div className="flex items-center gap-3">
            <Users className="text-violet-400" size={18} />
            <span className="text-white/60 text-sm">Tong hoc sinh</span>
          </div>
          <p className="text-3xl font-bold mt-3">{summary.totalStudents}</p>
        </div>

        <div className="card border border-white/10">
          <div className="flex items-center gap-3">
            <BookOpen className="text-cyan-400" size={18} />
            <span className="text-white/60 text-sm">Tong homework</span>
          </div>
          <p className="text-3xl font-bold mt-3">{summary.totalHomeworks}</p>
        </div>

        <div className="card border border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-400" size={18} />
            <span className="text-white/60 text-sm">Ty le hoan thanh</span>
          </div>
          <p className="text-3xl font-bold mt-3">{summary.completionRate}%</p>
          <p className="text-white/40 text-sm mt-1">
            {summary.submittedCount}/{summary.totalPossibleSubmissions} luot nop
          </p>
        </div>

        <div className="card border border-white/10">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-amber-400" size={18} />
            <span className="text-white/60 text-sm">Diem TB lop</span>
          </div>
          <p className="text-3xl font-bold mt-3">{summary.classAverage ?? '--'}%</p>
          <p className="text-white/40 text-sm mt-1">
            {topPerformer ? `Cao nhat: ${topPerformer.fullName} (${topPerformer.averageScore}%)` : 'Chua co bai nop'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Bang diem hoc sinh</h2>
              <p className="text-white/45 text-sm mt-1">Tinh theo diem cao nhat cua moi homework.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/45">
                  <th className="py-3 pr-4 font-medium">Hoc sinh</th>
                  <th className="py-3 pr-4 font-medium">Da nop</th>
                  <th className="py-3 pr-4 font-medium">Chua nop</th>
                  <th className="py-3 pr-4 font-medium">Qua han</th>
                  <th className="py-3 pr-4 font-medium">Diem TB</th>
                  <th className="py-3 font-medium">Lan nop gan nhat</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${student.email}`}
                          alt={student.fullName}
                          className="w-9 h-9 rounded-full bg-violet-800 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{student.fullName}</p>
                          <p className="text-white/40 text-xs truncate">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-green-300">{student.homeworkCompleted}</td>
                    <td className="py-3 pr-4 text-white/70">{student.homeworkPending}</td>
                    <td className="py-3 pr-4 text-red-300">{student.overdueCount}</td>
                    <td className="py-3 pr-4 font-semibold">{student.averageScore ?? '--'}%</td>
                    <td className="py-3 text-white/60">{formatDate(student.latestSubmission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card border border-white/10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock size={18} className="text-violet-400" />
              Danh sach homework
            </h2>
            <div className="space-y-3 mt-4">
              {homeworks.length === 0 ? (
                <div className="text-white/35 text-sm">Chua co homework nao duoc giao cho lop nay.</div>
              ) : (
                homeworks.map((homework) => (
                  <div key={homework.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="font-medium">{homework.title}</p>
                    <p className="text-white/45 text-xs mt-1">
                      Han nop: {formatDate(homework.dueDate)}
                    </p>
                    <p className="text-white/35 text-xs mt-1">
                      So lan lam toi da: {homework.allowedAttempts}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card border border-white/10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileWarning size={18} className="text-amber-400" />
              Ghi chu nhanh
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-white/65">
              <li>Diem trung binh duoc tinh theo diem cao nhat cua moi homework da nop.</li>
              <li>Qua han la homework chua nop va da qua han nop bai.</li>
              <li>Ban co the dung man nay de doi chieu tien do hoc sinh theo tung lop.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
