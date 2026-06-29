import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, BookOpen, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, ArrowLeft, Trophy, XCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getHomeworkDetails, submitHomework } from '../../api/advanced.api'

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825']
const SHAPES = ['▲', '◆', '●', '■']

export default function TakeHomeworkPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('start') // 'start' | 'active' | 'feedback'
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionId: optionIndex }
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // Graded result from backend

  const { data: hw, isLoading, error } = useQuery({
    queryKey: ['homework-details', id],
    queryFn: () => getHomeworkDetails(id),
  })

  const submitMut = useMutation({
    mutationFn: (answersPayload) => submitHomework(id, answersPayload),
    onSuccess: (data) => {
      setResult(data)
      setPhase('feedback')
      toast.success('Đã nộp bài tập thành công!')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi khi nộp bài')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white/40">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        Đang tải bài tập về nhà...
      </div>
    )
  }

  if (error || !hw) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="text-red-400 mb-3" size={40} />
        <h2 className="text-xl font-bold mb-1">Không tìm thấy bài tập</h2>
        <p className="text-white/40 mb-6 text-sm">{error?.message || 'Bạn không có quyền truy cập bài tập này.'}</p>
        <button onClick={() => navigate('/homework')} className="btn-primary py-2 px-5 text-sm flex items-center gap-1.5">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>
    )
  }

  const questions = hw.questions || []
  const currentQ = questions[currentIdx]

  const selectOption = (optIndex) => {
    if (phase !== 'active') return
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ._id || currentQ.id]: optIndex,
    }))
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1)
    }
  }

  const handleStart = () => {
    if (questions.length === 0) {
      return toast.error('Bài tập này chưa có câu hỏi nào!')
    }
    // Initialize answers
    const init = {}
    questions.forEach((q) => {
      init[q._id || q.id] = -1
    })
    setSelectedAnswers(init)
    setCurrentIdx(0)
    setPhase('active')
  }

  const handleSubmit = () => {
    // Check if unanswered questions
    const unansweredCount = questions.filter(
      (q) => selectedAnswers[q._id || q.id] === undefined || selectedAnswers[q._id || q.id] === -1
    ).length

    const confirmMsg = unansweredCount > 0
      ? `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn vẫn muốn nộp bài chứ?`
      : 'Bạn có chắc chắn muốn nộp bài tập này không?'

    if (confirm(confirmMsg)) {
      setSubmitting(true)
      const payload = {
        answers: Object.entries(selectedAnswers).map(([qid, optIndex]) => ({
          questionId: qid,
          selectedOption: optIndex,
        })),
      }
      submitMut.mutate(payload)
    }
  }

  const progressPercent = questions.length > 0
    ? Math.round((Object.values(selectedAnswers).filter((v) => v !== -1).length / questions.length) * 100)
    : 0

  // ── 1. START SCREEN ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    const attemptsUsed = hw.mySubmissions?.length || 0
    const attemptsAllowed = hw.allowedAttempts || 1
    const attemptsLeft = attemptsAllowed - attemptsUsed

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="card max-w-lg w-full border-white/10 shadow-2xl relative overflow-hidden">
          {/* Header gradient banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-500 to-pink-500" />
          
          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-12 h-12 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Bài tập về nhà</p>
              <h1 className="text-2xl font-bold mt-0.5 leading-tight">{hw.title}</h1>
            </div>
          </div>

          <div className="space-y-4 border-y border-white/10 py-5 my-5 text-sm text-white/70">
            <div className="flex justify-between">
              <span>Lớp học:</span>
              <span className="text-white font-semibold">{hw.classroomId?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Giáo viên giao:</span>
              <span className="text-white font-semibold">{hw.teacherId?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>Hạn nộp:</span>
              <span className="text-red-400 font-semibold">{new Date(hw.dueDate).toLocaleString('vi')}</span>
            </div>
            <div className="flex justify-between">
              <span>Số câu hỏi:</span>
              <span className="text-white font-semibold">{questions.length} câu trắc nghiệm</span>
            </div>
            <div className="flex justify-between">
              <span>Số lượt làm bài:</span>
              <span className="text-white font-semibold">
                Đã dùng {attemptsUsed}/{attemptsAllowed} (Còn {Math.max(0, attemptsLeft)} lượt)
              </span>
            </div>

            {hw.instructions && (
              <div className="bg-white/3 border border-white/5 rounded-xl p-3.5 mt-4 text-xs text-white/60">
                <p className="font-semibold text-white/80 mb-1 flex items-center gap-1">
                  <Info size={12} className="text-violet-400" /> Hướng dẫn của giáo viên:
                </p>
                {hw.instructions}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/homework')} className="btn-secondary flex-1 text-sm py-3">
              Quay lại
            </button>
            <button
              onClick={handleStart}
              disabled={attemptsLeft <= 0}
              className="btn-primary flex-1 text-sm py-3 font-semibold shadow-lg shadow-violet-600/30"
            >
              {attemptsLeft <= 0 ? 'Hết lượt làm bài' : 'Bắt đầu làm bài'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 2. ACTIVE TEST SCREEN ───────────────────────────────────────────────────
  if (phase === 'active' && currentQ) {
    const selectedOpt = selectedAnswers[currentQ._id || currentQ.id]

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header bar */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 z-10 px-4 py-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base truncate max-w-[200px] sm:max-w-[400px]">{hw.title}</span>
            <span className="text-white/20">|</span>
            <span className="text-white/50 text-sm">Câu {currentIdx + 1} / {questions.length}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-white/40 hidden sm:block">
              Hoàn thành: {progressPercent}% ({Object.values(selectedAnswers).filter((v) => v !== -1).length}/{questions.length} câu)
            </div>
            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg active:scale-95 transition-all shadow-md shadow-green-600/10 cursor-pointer"
            >
              Nộp bài
            </button>
          </div>
        </div>

        {/* Local progress indicator bar */}
        <div className="w-full bg-white/5 h-1 shrink-0">
          <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar selector */}
          <div className="md:w-56 border-b md:border-b-0 md:border-r border-white/10 bg-gray-900/20 p-4 overflow-y-auto shrink-0">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Danh sách câu hỏi</p>
            <div className="grid grid-cols-5 gap-2 md:grid-cols-4 lg:grid-cols-4">
              {questions.map((q, i) => {
                const isAnswered = selectedAnswers[q._id || q.id] !== undefined && selectedAnswers[q._id || q.id] !== -1
                return (
                  <button
                    key={q._id || q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      i === currentIdx
                        ? 'bg-violet-600 text-white scale-105 shadow-md shadow-violet-600/30'
                        : isAnswered
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question board */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-950 flex flex-col">
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
              {currentQ.imageUrl && (
                <div className="flex justify-center mb-6">
                  <img src={currentQ.imageUrl} alt="câu hỏi" className="rounded-2xl max-h-48 object-cover shadow-lg border border-white/10" />
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold text-center leading-relaxed mb-10 max-w-xl mx-auto">
                {currentQ.content}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {currentQ.options?.map((opt, oi) => {
                  const isThisSelected = selectedOpt === oi
                  return (
                    <button
                      key={oi}
                      onClick={() => selectOption(oi)}
                      className={`card text-left p-4 rounded-2xl border-l-4 transition-all relative ${
                        isThisSelected
                          ? 'bg-white/10 border border-white/30 ring-2 ring-white/10'
                          : 'bg-white/4 border border-white/8 hover:bg-white/8'
                      }`}
                      style={{ borderLeftColor: COLORS[oi] }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border border-white/10"
                          style={{ background: COLORS[oi] }}
                        >
                          {SHAPES[oi]}
                        </div>
                        <span className="text-sm font-medium pr-6">{opt.text}</span>
                        {isThisSelected && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Navigation footer inside body */}
            <div className="max-w-2xl mx-auto w-full flex items-center justify-between border-t border-white/10 pt-4 mt-6 shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Quay lại
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  Tiếp theo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/10"
                >
                  Nộp bài <CheckCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. FEEDBACK / RESULTS SCREEN ─────────────────────────────────────────────
  if (phase === 'feedback' && result) {
    const showReview = hw.showCorrectAnswers && result.gradedAnswers

    return (
      <div className="min-h-screen bg-gray-950 py-10 px-4 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          
          {/* Summary Score Card */}
          <div className="card text-center relative overflow-hidden border-violet-500/20 shadow-2xl mb-8 py-8">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-pink-500" />
            <Trophy size={56} className="mx-auto text-yellow-400 mb-3 animate-bounce" />
            
            <h1 className="text-2xl font-bold mb-1">Kết quả kiểm tra!</h1>
            <p className="text-white/50 text-sm">Cảm ơn bạn đã hoàn thành bài tập về nhà.</p>

            <div className="flex justify-center gap-10 my-6">
              <div>
                <p className="text-white/40 text-xs">Đạt được</p>
                <p className="text-4xl font-extrabold text-violet-400 mt-1">{result.percentage}%</p>
              </div>
              <div className="w-[1px] bg-white/10 self-stretch" />
              <div>
                <p className="text-white/40 text-xs">Đúng</p>
                <p className="text-4xl font-extrabold text-green-400 mt-1">{result.correct} / {result.total}</p>
              </div>
            </div>

            <button onClick={() => navigate('/homework')} className="btn-primary text-sm py-2 px-6">
              Quay lại danh sách bài tập
            </button>
          </div>

          {/* Graded Questions Review */}
          {showReview && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b border-white/10 pb-2 mb-4">Xem lại đáp án câu hỏi</h3>
              
              {questions.map((q, i) => {
                const gradeInfo = result.gradedAnswers.find((ga) => ga.questionId === (q._id || q.id))
                const studentChoice = gradeInfo?.selectedOption ?? -1
                const correctOptIndex = gradeInfo?.correctOptionIndex ?? -1
                const isCorrect = gradeInfo?.isCorrect

                return (
                  <div
                    key={q._id || q.id}
                    className={`card border p-5 ${
                      isCorrect ? 'border-green-500/20 bg-green-500/2' : 'border-red-500/20 bg-red-500/2'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-4">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {i + 1}
                      </span>
                      <p className="font-semibold text-sm leading-snug">{q.content}</p>
                      
                      <span className={`badge shrink-0 ml-auto ${
                        isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isCorrect ? 'Chính xác' : 'Sai'}
                      </span>
                    </div>

                    {q.imageUrl && (
                      <div className="mb-4">
                        <img src={q.imageUrl} alt="hình câu hỏi" className="rounded-xl max-h-32 object-cover" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => {
                        const wasSelected = studentChoice === oi
                        const wasCorrect = correctOptIndex === oi
                        
                        let borderStyle = 'border-white/5 bg-white/3 text-white/50'
                        if (wasCorrect) {
                          borderStyle = 'border-green-500/30 bg-green-500/10 text-green-300 font-semibold'
                        } else if (wasSelected && !isCorrect) {
                          borderStyle = 'border-red-500/30 bg-red-500/10 text-red-300 font-semibold'
                        }

                        return (
                          <div
                            key={oi}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${borderStyle}`}
                          >
                            <div
                              className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 border border-white/10"
                              style={{ background: COLORS[oi] }}
                            >
                              {SHAPES[oi]}
                            </div>
                            <span className="truncate">{opt.text}</span>

                            {wasCorrect && (
                              <CheckCircle size={12} className="text-green-400 ml-auto shrink-0" />
                            )}
                            {wasSelected && !isCorrect && (
                              <XCircle size={12} className="text-red-400 ml-auto shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-white/3 border border-white/5 rounded-lg p-3 mt-3.5 text-xs text-white/50 flex gap-2">
                        <span className="shrink-0 text-violet-400 font-bold">💡 Giải thích:</span>
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
