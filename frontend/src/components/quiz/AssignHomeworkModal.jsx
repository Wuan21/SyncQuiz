import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Calendar, BookOpen, Clock, Settings, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getClassrooms, createHomework } from '../../api/advanced.api'

export default function AssignHomeworkModal({ quizId, quizTitle, onClose }) {
  const [form, setForm] = useState({
    classroomId: '',
    title: `Bài tập về nhà: ${quizTitle || ''}`,
    instructions: '',
    dueDate: '',
    allowedAttempts: 1,
    shuffleQuestions: false,
    showCorrectAnswers: true,
  })

  // Get classrooms taught by the teacher
  const { data: classroomsData, isLoading: loadingClasses } = useQuery({
    queryKey: ['classrooms'],
    queryFn: getClassrooms,
  })

  const taughtClassrooms = classroomsData?.taught || []

  const createHwMut = useMutation({
    mutationFn: createHomework,
    onSuccess: () => {
      toast.success('Giao bài tập về nhà thành công!')
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi khi giao bài tập')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.classroomId) return toast.error('Vui lòng chọn lớp học')
    if (!form.dueDate) return toast.error('Vui lòng chọn hạn nộp bài')

    createHwMut.mutate({
      quizId,
      ...form,
      dueDate: new Date(form.dueDate).toISOString(),
    })
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Default to tomorrow for date picker helper
  const getTomorrowString = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(23, 59, 0, 0)
    // Format to yyyy-MM-ddThh:mm
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // Set default due date once
  useState(() => {
    set('dueDate', getTomorrowString())
  })

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="text-violet-400" size={20} />
            <h2 className="font-bold text-lg">Giao bài tập về nhà</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          {/* Quiz info banner */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3.5 flex items-center gap-3">
            <Info size={16} className="text-violet-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Quiz chọn</p>
              <p className="text-sm font-semibold truncate text-white">{quizTitle}</p>
            </div>
          </div>

          {/* Classroom Selection */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
              Chọn Lớp Học <span className="text-red-400">*</span>
            </label>
            {loadingClasses ? (
              <div className="text-white/40 text-xs py-2">Đang tải danh sách lớp học...</div>
            ) : taughtClassrooms.length === 0 ? (
              <div className="text-red-400/80 text-xs py-2">
                Bạn chưa giảng dạy lớp học nào. Hãy tạo lớp học trước ở trang Classrooms!
              </div>
            ) : (
              <select
                required
                value={form.classroomId}
                onChange={(e) => set('classroomId', e.target.value)}
                className="select text-sm py-2.5"
              >
                <option value="">-- Chọn lớp học --</option>
                {taughtClassrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students?.length || 0} học sinh)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
              Tiêu đề bài tập <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="VD: Bài tập tuần 5, Luyện tập..."
              className="input text-sm py-2.5"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
              Hướng dẫn làm bài (tùy chọn)
            </label>
            <textarea
              value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="VD: Hãy hoàn thành trước thứ hai tuần sau, không sử dụng tài liệu..."
              rows={2}
              className="input text-sm py-2.5 resize-none"
            />
          </div>

          {/* Due date & Allowed attempts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Hạn nộp bài <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="input text-sm py-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> Số lượt làm bài
              </label>
              <select
                value={form.allowedAttempts}
                onChange={(e) => set('allowedAttempts', parseInt(e.target.value))}
                className="select text-sm py-2.5"
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1 lượt (Mặc định)' : `${n} lượt`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings / Checkboxes */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Settings size={12} /> Cài đặt làm bài
            </h4>
            
            <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(e) => set('shuffleQuestions', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
              />
              <div>
                <p className="font-medium text-xs">Trộn thứ tự câu hỏi</p>
                <p className="text-white/40 text-[10px] mt-0.5">Xáo trộn câu hỏi ngẫu nhiên cho mỗi lượt làm bài</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.showCorrectAnswers}
                onChange={(e) => set('showCorrectAnswers', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
              />
              <div>
                <p className="font-medium text-xs">Hiển thị đáp án đúng sau khi nộp</p>
                <p className="text-white/40 text-[10px] mt-0.5">Cho phép học sinh xem lại bài làm và đối chiếu đáp án chính xác</p>
              </div>
            </label>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createHwMut.isPending || taughtClassrooms.length === 0}
              className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center font-semibold shadow-lg shadow-violet-600/30"
            >
              {createHwMut.isPending ? 'Đang giao bài...' : 'Giao bài tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
