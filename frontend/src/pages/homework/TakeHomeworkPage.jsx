import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, BookOpen, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, ArrowLeft, Trophy, XCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getHomeworkDetails, submitHomework, saveHomeworkProgress, getHomeworkProgress } from '../../api/advanced.api'

const COLORS = ['var(--danger)', 'var(--primary)', 'var(--success)', 'var(--warning)']
const SHAPES = ['▲', '◆', '●', '■']

function getDeadlineSeconds(dueDate) {
  const deadline = new Date(dueDate).getTime()
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000))
}

export default function TakeHomeworkPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('start') // 'start' | 'active' | 'feedback'
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionId: optionIndex }
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [deadlineSecs, setDeadlineSecs] = useState(0)

  const hw = useQuery({
    queryKey: ['homework-details', id],
    queryFn: () => getHomeworkDetails(id),
  })

  useEffect(() => {
    if (hw.data?.dueDate) {
      setDeadlineSecs(getDeadlineSeconds(hw.data.dueDate))
    }
  }, [hw.data])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'active' || deadlineSecs <= 0) return
    const t = setInterval(() => {
      setDeadlineSecs((s) => {
        if (s <= 1) {
          clearInterval(t)
          handleSubmit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, deadlineSecs > 0]) // eslint-disable-line

  const selectOption = useCallback((optIndex) => {
    if (phase !== 'active') return
    const currentQ = (hw.data?.questions || [])[currentIdx]
    if (!currentQ) return
    const qId = currentQ._id || currentQ.id
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optIndex }))
  }, [phase, currentIdx, hw.data])

  const handleStart = async () => {
    // Load saved progress first
    let startIdx = 0
    try {
      const progress = await getHomeworkProgress(id)
      if (progress?.lastVisitedIndex && !progress.isSubmitted) {
        startIdx = progress.lastVisitedIndex
        const restored = {}
        for (const [qid, optIdx] of Object.entries(progress.answers || {})) {
          restored[qid] = optIdx
        }
        setSelectedAnswers(restored)
        toast.success('Progress restored')
      }
    } catch (_) {}

    const questions = hw.data?.questions || []
    if (questions.length === 0) {
      toast.error('This homework has no questions')
      return
    }
    setCurrentIdx(startIdx)
    setPhase('active')
  }

  const saveProgress = useCallback(async (answers, idx) => {
    try {
      await saveHomeworkProgress(id, {
        answers,
        lastVisitedIndex: idx,
      })
    } catch (_) {}
  }, [id])

  const handleNext = useCallback(() => {
    const questions = hw.data?.questions || []
    if (currentIdx < questions.length - 1) {
      const next = currentIdx + 1
      setCurrentIdx(next)
      saveProgress(selectedAnswers, next)
    }
  }, [currentIdx, hw.data, selectedAnswers, saveProgress])

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      const prev = currentIdx - 1
      setCurrentIdx(prev)
      saveProgress(selectedAnswers, prev)
    }
  }, [currentIdx, selectedAnswers, saveProgress])

  const handleSubmit = async () => {
    const questions = hw.data?.questions || []
    const unansweredCount = questions.filter((q) => {
      const qId = q._id || q.id
      return selectedAnswers[qId] === undefined || selectedAnswers[qId] === -1
    }).length

    const confirmMsg = unansweredCount > 0
      ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Submit anyway?`
      : 'Are you sure you want to submit?'

    if (!window.confirm(confirmMsg)) return
    setSubmitting(true)

    const payload = {
      answers: Object.entries(selectedAnswers).map(([qid, optIndex]) => ({
        questionId: qid,
        selectedOption: optIndex,
      })),
    }

    try {
      const data = await submitHomework(id, payload)
      setResult(data)
      setPhase('feedback')
      toast.success('Submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Warn before leaving
  useEffect(() => {
    if (phase !== 'active') return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  if (hw.isLoading) {
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center sq-text-muted">
        <div className="w-10 h-10 border-4 sq-border-primary rounded-full animate-spin mb-4" style={{ borderTopColor: 'var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)' }} />
        Loading...
      </div>
    )
  }

  if (hw.error || !hw.data) {
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="sq-text-danger mb-3" size={40} />
        <h2 className="text-xl font-bold mb-1 sq-text-foreground">Homework not found</h2>
        <p className="sq-text-subtle mb-6 text-sm">You may not have access to this homework.</p>
        <button onClick={() => navigate('/homework')} className="sq-btn sq-btn-primary py-2 px-5 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    )
  }

  const questions = hw.data.questions || []
  const currentQ = questions[currentIdx]
  const attemptsUsed = hw.data.mySubmissions?.length || 0
  const attemptsAllowed = hw.data.allowedAttempts || 1
  const attemptsLeft = attemptsAllowed - attemptsUsed
  const progressPercent = questions.length > 0
    ? Math.round((Object.values(selectedAnswers).filter((v) => v !== undefined && v !== -1).length / questions.length) * 100)
    : 0

  // ── 1. START SCREEN ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="min-h-screen sq-bg-background flex flex-col items-center justify-center p-4">
        <div className="sq-card max-w-lg w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 sq-bg-gradient-primary" />

          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-12 h-12 sq-bg-primary-soft rounded-xl flex items-center justify-center sq-text-primary-light">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="sq-text-subtle text-xs font-semibold uppercase tracking-wider">Homework</p>
              <h1 className="text-2xl font-bold mt-0.5 leading-tight sq-text-foreground">{hw.data.title}</h1>
            </div>
          </div>

          <div className="space-y-4 sq-border-y py-5 my-5 text-sm sq-text-muted">
            <div className="flex justify-between"><span>Class:</span><span className="sq-text-foreground font-semibold">{hw.data.classroomId?.name}</span></div>
            <div className="flex justify-between"><span>Teacher:</span><span className="sq-text-foreground font-semibold">{hw.data.teacherId?.fullName}</span></div>
            <div className="flex justify-between"><span>Deadline:</span><span className={deadlineSecs <= 3600 && deadlineSecs > 0 ? 'sq-text-danger font-semibold' : 'sq-text-foreground font-semibold'}>
              {deadlineSecs > 0
                ? new Date(hw.data.dueDate).toLocaleString('vi')
                : 'Expired'}
            </span></div>
            <div className="flex justify-between"><span>Questions:</span><span className="sq-text-foreground font-semibold">{questions.length} multiple choice</span></div>
            <div className="flex justify-between">
              <span>Attempts:</span>
              <span className="sq-text-foreground font-semibold">
                {attemptsUsed}/{attemptsAllowed} ({Math.max(0, attemptsLeft)} left)
              </span>
            </div>
            {hw.data.instructions && (
              <div className="sq-bg-surface sq-border rounded-xl p-3.5 mt-4 text-xs sq-text-muted">
                <p className="font-semibold sq-text-foreground mb-1 flex items-center gap-1"><Info size={12} className="sq-text-primary-light" /> Instructions:</p>
                {hw.data.instructions}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/homework')} className="sq-btn sq-btn-secondary flex-1 text-sm py-3">Back</button>
            <button
              onClick={handleStart}
              disabled={attemptsLeft <= 0 || deadlineSecs <= 0}
              className="sq-btn sq-btn-primary flex-1 text-sm py-3 font-semibold disabled:opacity-40"
            >
              {deadlineSecs <= 0 ? 'Expired' : attemptsLeft <= 0 ? 'No attempts left' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 2. ACTIVE TEST SCREEN ───────────────────────────────────────────────────
  if (phase === 'active' && currentQ) {
    const qId = currentQ._id || currentQ.id
    const selectedOpt = selectedAnswers[qId]

    return (
      <div className="min-h-screen sq-bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 sq-bg-overlay sq-border-b z-10 px-4 py-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-base truncate max-w-[200px] sm:max-w-[400px] sq-text-foreground">{hw.data.title}</span>
            <span className="sq-text-subtle">|</span>
            <span className="sq-text-muted text-sm shrink-0">Q {currentIdx + 1}/{questions.length}</span>
          </div>
          <div className="flex items-center gap-4">
            {deadlineSecs > 0 && (
              <div className={`flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-lg sq-border ${
                deadlineSecs < 300 ? 'sq-bg-danger-soft sq-text-danger sq-border-danger' : 'sq-bg-surface sq-text-muted'
              }`}>
                <Clock size={14} />
                {String(Math.floor(deadlineSecs / 60)).padStart(2, '0')}:{String(deadlineSecs % 60).padStart(2, '0')}
              </div>
            )}
            <div className="text-xs sq-text-subtle hidden sm:block">{progressPercent}% done ({Object.values(selectedAnswers).filter((v) => v !== undefined && v !== -1).length}/{questions.length})</div>
            <button onClick={handleSubmit} className="sq-btn sq-btn-success text-xs py-2 px-4">
              Submit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full sq-bg-surface h-1 shrink-0 overflow-hidden">
          <div className="sq-bg-gradient-primary h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Question sidebar */}
          <div className="md:w-56 sq-border-b md:sq-border-b-0 md:sq-border-r sq-bg-surface p-4 overflow-y-auto shrink-0">
            <p className="sq-text-subtle text-xs font-semibold uppercase tracking-wider mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const qid = q._id || q.id
                const isAnswered = selectedAnswers[qid] !== undefined && selectedAnswers[qid] !== -1
                return (
                  <button
                    key={qid}
                    onClick={() => { setCurrentIdx(i); saveProgress(selectedAnswers, i) }}
                    className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      i === currentIdx
                        ? 'sq-bg-primary sq-text-primary-foreground scale-105 shadow-md'
                        : isAnswered
                        ? 'sq-bg-primary-soft sq-text-primary-light sq-border sq-border-primary'
                        : 'sq-bg-surface sq-text-muted sq-border hover:sq-bg-surface-2'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question board */}
          <div className="flex-1 overflow-y-auto p-6 sq-bg-background flex flex-col">
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
              {currentQ.imageUrl && (
                <div className="flex justify-center mb-6">
                  <img src={currentQ.imageUrl} alt="question" className="rounded-2xl max-h-48 object-cover shadow-lg sq-border" />
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-center leading-relaxed mb-10 max-w-xl mx-auto sq-text-foreground">{currentQ.content}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {currentQ.options?.map((opt, oi) => {
                  const isSelected = selectedOpt === oi
                  return (
                    <button
                      key={oi}
                      onClick={() => selectOption(oi)}
                      className={`sq-card text-left p-4 rounded-2xl border-l-4 transition-all relative sq-text-foreground ${
                        isSelected
                          ? 'sq-bg-surface-2 sq-border-primary ring-2 ring-color-primary-30'
                          : 'sq-bg-surface sq-border hover:sq-bg-surface-2'
                      }`}
                      style={{ borderLeftColor: COLORS[oi] }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 sq-border sq-border" style={{ background: COLORS[oi], color: 'white' }}>
                          {SHAPES[oi]}
                        </div>
                        <span className="text-sm font-medium pr-6">{opt.text}</span>
                        {isSelected && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full sq-bg-primary flex items-center justify-center sq-text-primary-foreground text-[10px]">✓</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Navigation footer */}
            <div className="max-w-2xl mx-auto w-full flex items-center justify-between sq-border-t pt-4 mt-6 shrink-0">
              <button onClick={handlePrev} disabled={currentIdx === 0}
                className="sq-btn sq-btn-secondary text-xs py-2 px-4 disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronLeft size={16} /> Prev
              </button>
              {currentIdx < questions.length - 1 ? (
                <button onClick={handleNext}
                  className="sq-btn sq-btn-secondary text-xs py-2 px-4">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="sq-btn sq-btn-success text-xs py-2 px-5 disabled:opacity-50">
                  <CheckCircle size={16} /> {submitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 3. FEEDBACK ──────────────────────────────────────────────────────────────
  if (phase === 'feedback' && result) {
    const showReview = hw.data.showCorrectAnswers && result.gradedAnswers
    return (
      <div className="min-h-screen sq-bg-background py-10 px-4 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          <div className="sq-card text-center relative overflow-hidden sq-border-primary shadow-2xl mb-8 py-8">
            <div className="absolute top-0 left-0 right-0 h-1.5 sq-bg-gradient-primary" />
            <Trophy size={56} className="mx-auto sq-text-warning mb-3 animate-bounce" />
            <h1 className="text-2xl font-bold mb-1 sq-text-foreground">Results!</h1>
            <p className="sq-text-muted text-sm">You completed the homework.</p>
            <div className="flex justify-center gap-10 my-6">
              <div><p className="sq-text-subtle text-xs">Score</p><p className="text-4xl font-extrabold sq-text-primary mt-1">{result.percentage}%</p></div>
              <div className="w-[1px] sq-border self-stretch" />
              <div><p className="sq-text-subtle text-xs">Correct</p><p className="text-4xl font-extrabold sq-text-success mt-1">{result.correct}/{result.total}</p></div>
            </div>
            <button onClick={() => navigate('/homework')} className="sq-btn sq-btn-primary text-sm py-2 px-6">Back to Homework</button>
          </div>

          {showReview && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg sq-border-b pb-2 mb-4">Answer Review</h3>
              {questions.map((q, i) => {
                const gradeInfo = result.gradedAnswers.find((ga) => ga.questionId === (q._id || q.id))
                const studentChoice = gradeInfo?.selectedOption ?? -1
                const correctOptIndex = gradeInfo?.correctOptionIndex ?? -1
                const isCorrect = gradeInfo?.isCorrect
                return (
                  <div
                    key={q._id || q.id}
                    className={`sq-card sq-border p-5 ${
                      isCorrect ? 'sq-border-success sq-bg-success-soft' : 'sq-border-danger sq-bg-danger-soft'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-4">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCorrect ? 'sq-bg-success sq-text-white' : 'sq-bg-danger sq-text-white'
                      }`}>{i + 1}</span>
                      <p className="font-semibold text-sm leading-snug flex-1 sq-text-foreground">{q.content}</p>
                      <span className={`sq-badge shrink-0 ml-auto ${
                        isCorrect ? 'sq-badge-success' : 'sq-badge-danger'
                      }`}>
                        {isCorrect ? 'Correct' : 'Wrong'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options?.map((opt, oi) => {
                        const wasSelected = studentChoice === oi
                        const wasCorrect = correctOptIndex === oi
                        let cls = 'sq-border sq-bg-surface sq-text-muted'
                        if (wasCorrect) cls = 'sq-border-success sq-bg-success-soft sq-text-success font-semibold'
                        else if (wasSelected && !isCorrect) cls = 'sq-border-danger sq-bg-danger-soft sq-text-danger font-semibold'
                        return (
                          <div key={oi} className={`p-3 rounded-xl sq-border text-xs flex items-center gap-2 ${cls}`}>
                            <div className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0" style={{ background: COLORS[oi], color: 'white' }}>
                              {SHAPES[oi]}
                            </div>
                            <span className="truncate">{opt.text}</span>
                            {wasCorrect && <CheckCircle size={12} className="sq-text-success ml-auto shrink-0" />}
                            {wasSelected && !isCorrect && <XCircle size={12} className="sq-text-danger ml-auto shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <div className="sq-bg-surface sq-border rounded-lg p-3 mt-3.5 text-xs sq-text-muted flex gap-2">
                        <span className="shrink-0 sq-text-primary font-bold">💡</span>
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