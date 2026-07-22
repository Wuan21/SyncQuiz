import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Save, ArrowLeft, Trash2, Image, Clock, Star, ChevronUp, ChevronDown, Sparkles, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getQuizFull, createQuiz, updateQuiz,
  createQuestion, updateQuestion, deleteQuestion,
} from '../../api/quizzes.api'
import { presignUpload } from '../../api/upload.api'
import { importCSV, downloadCSVTemplate } from '../../api/advanced.api'
import AIGeneratorModal from '../../components/quiz/AIGeneratorModal'

const COLORS = ['var(--danger)', 'var(--primary)', 'var(--success)', 'var(--warning)']

const emptyQuestion = () => ({
  type: 'multiple_choice',
  content: '',
  imageUrl: null,
  timeLimit: 30,
  points: 1000,
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
  explanation: '',
})

export default function QuizEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id

  // ── Quiz meta ──────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState({ title: '', description: '', visibility: 'private', shuffleQuestions: false })
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [activeQ, setActiveQ] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [hasChanges, setHasChanges] = useState(false)
  const saveTimer = useRef(null)
  const lastSaved = useRef({ meta: null, questions: null })
  const [showAI, setShowAI] = useState(false)

  const { data } = useQuery({
    queryKey: ['quiz-full', id],
    queryFn: () => getQuizFull(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (data) {
      setMeta({ title: data.title, description: data.description || '', visibility: data.visibility, shuffleQuestions: data.shuffleQuestions })
      setQuestions(data.questions?.length ? data.questions : [emptyQuestion()])
      lastSaved.current = { meta: data, questions: data.questions }
    }
  }, [data])

  // ── Track unsaved changes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return
    const metaChanged = JSON.stringify(meta) !== JSON.stringify(lastSaved.current.meta)
    const qsChanged = JSON.stringify(questions) !== JSON.stringify(lastSaved.current.questions)
    setHasChanges(metaChanged || qsChanged)
  }, [meta, questions, data])

  // ── Debounced autosave (2 seconds after last change) ──────────────────────
  const debouncedSave = useCallback(async () => {
    if (!meta.title.trim()) return
    setSaveStatus('saving')
    try {
      let quizId = id
      if (isNew) {
        const quiz = await createQuiz(meta)
        quizId = quiz.id
      } else {
        await updateQuiz(id, meta)
      }
      for (let i = 0; i < questions.length; i++) {
        const q = { ...questions[i], order: i }
        if (q.id) {
          await updateQuestion(quizId, q.id, q)
        } else {
          await createQuestion(quizId, q)
        }
      }
      lastSaved.current = { meta, questions }
      setHasChanges(false)
      setSaveStatus('saved')
      qc.invalidateQueries(['quizzes'])
    } catch (_) {
      setSaveStatus('error')
    }
  }, [meta, questions, id, isNew, qc])

  useEffect(() => {
    if (!hasChanges || isNew) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(debouncedSave, 2000)
    return () => clearTimeout(saveTimer.current)
  }, [hasChanges, debouncedSave, isNew])

  // ── Warn before leaving with unsaved changes ───────────────────────────────
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // ── Back button with unsaved warning ─────────────────────────────────────
  const handleBack = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) return
    }
    navigate(-1)
  }

  // ── Save all ───────────────────────────────────────────────────────────────
  const save = async () => {
    if (!meta.title.trim()) return toast.error('Quiz title is required')
    clearTimeout(saveTimer.current)
    setSaving(true)
    try {
      let quizId = id
      if (isNew) {
        const quiz = await createQuiz(meta)
        quizId = quiz.id
      } else {
        await updateQuiz(id, meta)
      }

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        const q = { ...questions[i], order: i }
        if (q.id) {
          await updateQuestion(quizId, q.id, q)
        } else {
          await createQuestion(quizId, q)
        }
      }

      qc.invalidateQueries(['quizzes'])
      lastSaved.current = { meta, questions }
      setHasChanges(false)
      setSaveStatus('saved')
      toast.success('Quiz saved!')
      if (isNew) navigate(`/quizzes/${quizId}/edit`, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Question helpers ───────────────────────────────────────────────────────
  const updateQ = (field, value) => {
    setQuestions((qs) => qs.map((q, i) => i === activeQ ? { ...q, [field]: value } : q))
    setHasChanges(true)
  }

  const updateOption = (optIdx, field, value) => {
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== activeQ) return q
      const options = q.options.map((o, oi) => {
        if (oi !== optIdx) return field === 'isCorrect' ? { ...o, isCorrect: false } : o
        return { ...o, [field]: value }
      })
      return { ...q, options }
    }))
    setHasChanges(true)
  }

  const addQuestion = () => {
    setQuestions((qs) => [...qs, emptyQuestion()])
    setActiveQ(questions.length)
    setHasChanges(true)
  }

  const removeQuestion = async (idx) => {
    const q = questions[idx]
    if (q.id && id) {
      await deleteQuestion(id, q.id)
    }
    setQuestions((qs) => qs.filter((_, i) => i !== idx))
    setActiveQ(Math.max(0, idx - 1))
    setHasChanges(true)
  }

  const moveQ = (idx, dir) => {
    const qs = [...questions]
    const to = idx + dir
    if (to < 0 || to >= qs.length) return
    ;[qs[idx], qs[to]] = [qs[to], qs[idx]]
    setQuestions(qs)
    setActiveQ(to)
    setHasChanges(true)
  }

  // ── Image upload ───────────────────────────────────────────────────────────
  const uploadImage = async (file) => {
    try {
      if (file.size > 10 * 1024 * 1024) {
        return toast.error('Tệp quá lớn (tối đa 10MB)')
      }
      const uploadRes = await presignUpload({
        fileName: file.name,
        contentType: file.type,
        folder: 'questions',
      })
      const { uploadUrl, publicUrl, backend } = uploadRes

      if (backend === 'local') {
        const form = new FormData()
        form.append('file', file)
        await fetch(uploadUrl, {
          method: 'POST',
          body: form,
        })
      } else {
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
      }
      updateQ('imageUrl', publicUrl)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error('Upload failed')
    }
  }

  // AI import
  const handleAIImport = (aiQuestions) => {
    setQuestions((qs) => [...qs.filter((q) => q.content), ...aiQuestions])
    toast.success(`Added ${aiQuestions.length} AI questions!`)
  }

  // CSV import
  const handleCSVImport = async (file) => {
    if (!id) return toast.error('Save the quiz first before importing CSV')
    try {
      const result = await importCSV(id, file)
      toast.success(`Imported ${result.imported} questions!`)
      qc.invalidateQueries(['quiz-full', id])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    }
  }

  const q = questions[activeQ] || emptyQuestion()

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col sq-bg-background">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 sq-border-b sq-bg-overlay shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={handleBack}
            className="w-8 h-8 rounded-lg sq-bg-surface hover:sq-bg-surface-2 flex items-center justify-center sq-text-muted hover:sq-text-foreground transition-all shrink-0">
            <ArrowLeft size={16} />
          </button>
          <input
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            placeholder="Tên quiz..."
            className="bg-transparent text-lg font-bold outline-none sq-text-foreground placeholder:sq-text-subtle flex-1 min-w-0"
          />
          <span className="sq-text-subtle text-sm shrink-0">{questions.length} câu</span>
          {saveStatus === 'saving' && (
            <span className="text-xs sq-text-warning animate-pulse shrink-0">Auto-saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs sq-text-success shrink-0">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs sq-text-danger shrink-0">Save failed</span>
          )}
          {hasChanges && saveStatus === 'idle' && (
            <span className="text-xs sq-text-subtle shrink-0">Unsaved</span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg sq-bg-primary-soft hover:sq-bg-primary-soft sq-border sq-border-primary sq-text-primary text-sm font-medium transition-all">
            <Sparkles size={14} /> AI
          </button>
          <button onClick={downloadCSVTemplate}
            title="Tải tệp CSV mẫu"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg sq-bg-surface hover:sq-bg-surface-2 sq-border sq-text-muted hover:sq-text-foreground text-sm font-medium transition-all">
            <Download size={14} /> Mẫu CSV
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg sq-bg-surface hover:sq-bg-surface-2 sq-border sq-text-muted hover:sq-text-foreground text-sm font-medium transition-all cursor-pointer">
            <Upload size={14} /> CSV
            <input type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files[0] && handleCSVImport(e.target.files[0])} />
          </label>
          <select
            value={meta.visibility}
            onChange={(e) => setMeta((m) => ({ ...m, visibility: e.target.value }))}
            className="sq-select text-sm py-1.5 w-auto"
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌐 Public</option>
          </select>
          <button onClick={save} disabled={saving}
            className="sq-btn sq-btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
            <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-52 sq-border-r sq-bg-surface flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 sq-border-b">
            <p className="sq-text-subtle text-xs font-medium uppercase tracking-wider">Câu hỏi</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all group flex items-start gap-2 sq-text-foreground ${
                  i === activeQ
                    ? 'sq-bg-primary sq-text-primary-foreground shadow-lg'
                    : 'sq-text-muted hover:sq-bg-surface-2 hover:sq-text-foreground'
                }`}
              >
                <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold mt-0.5 ${
                  i === activeQ ? 'sq-bg-primary-foreground/20 sq-text-primary-foreground' : 'sq-bg-surface sq-text-muted'
                }`}>{i + 1}</span>
                <span className="flex-1 truncate leading-snug">{q.content || 'Câu trống'}</span>
                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, -1) }}
                    className="hover:sq-text-foreground transition-colors"><ChevronUp size={11} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, 1) }}
                    className="hover:sq-text-foreground transition-colors"><ChevronDown size={11} /></button>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 sq-border-t">
            <button onClick={addQuestion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg sq-bg-surface hover:sq-bg-surface-2 sq-text-muted hover:sq-text-foreground text-sm font-medium transition-all">
              <Plus size={15} /> Thêm câu</button>
          </div>
        </div>

        {/* ── Main Editor ── */}
        <div className="flex-1 overflow-y-auto sq-bg-background">
          <div className="max-w-2xl mx-auto p-6 space-y-4">

            {/* Question content */}
            <div className="sq-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold sq-text-subtle uppercase tracking-wider">
                  Câu {activeQ + 1} / {questions.length}
                </span>
                <button
                  onClick={() => removeQuestion(activeQ)}
                  disabled={questions.length === 1}
                  className="flex items-center gap-1.5 text-xs sq-text-danger opacity-70 hover:opacity-100 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} /> Xóa câu
                </button>
              </div>

              <textarea
                value={q.content}
                onChange={(e) => updateQ('content', e.target.value)}
                placeholder="Nhập câu hỏi tại đây..."
                rows={3}
                className="sq-input resize-none text-base leading-relaxed"
              />

              {/* Image */}
              <div className="mt-3">
                {q.imageUrl ? (
                  <div className="relative inline-block">
                    <img src={q.imageUrl} alt="question" className="rounded-xl max-h-40 object-cover sq-border" />
                    <button onClick={() => updateQ('imageUrl', null)}
                      className="absolute top-2 right-2 sq-bg-overlay rounded-full p-1.5 sq-text-muted hover:sq-text-foreground transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 text-sm sq-text-subtle hover:sq-text-muted cursor-pointer transition-colors sq-border border-dashed hover:sq-border-hover rounded-lg px-3 py-2">
                    <Image size={14} /> Thêm ảnh (tùy chọn)
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="sq-bg-surface sq-border rounded-xl p-3">
                <label className="flex items-center gap-1.5 text-xs sq-text-muted mb-2 font-medium">
                  <Clock size={12} /> Thời gian
                </label>
                <select value={q.timeLimit} onChange={(e) => updateQ('timeLimit', +e.target.value)}
                  className="sq-select text-sm py-2">
                  {[5, 10, 20, 30, 45, 60, 90, 120].map((t) => (
                    <option key={t} value={t}>{t} giây</option>
                  ))}
                </select>
              </div>
              <div className="sq-bg-surface sq-border rounded-xl p-3">
                <label className="flex items-center gap-1.5 text-xs sq-text-muted mb-2 font-medium">
                  <Star size={12} /> Điểm
                </label>
                <select value={q.points} onChange={(e) => updateQ('points', +e.target.value)}
                  className="sq-select text-sm py-2">
                  {[0, 500, 1000, 2000].map((p) => (
                    <option key={p} value={p}>{p === 0 ? 'Không tính điểm' : `${p.toLocaleString()} điểm`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Answer options */}
            <div className="sq-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium sq-text-muted">Đáp án <span className="sq-text-subtle text-xs font-normal">(click vào ô để chọn đáp án đúng)</span></p>
                <span className="text-xs sq-text-success opacity-80">
                  ✓ {q.options.filter((o) => o.isCorrect).length} đúng
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    onClick={() => updateOption(oi, 'isCorrect', true)}
                    className={`relative rounded-xl p-3 cursor-pointer transition-all border-l-4 sq-text-foreground ${
                      opt.isCorrect
                        ? 'sq-bg-success-soft sq-border sq-border-success'
                        : 'sq-bg-surface sq-border hover:sq-bg-surface-2'
                    }`}
                    style={{ borderLeftColor: COLORS[oi] }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        opt.isCorrect ? 'sq-border-success' : ''
                      }`} style={{ borderColor: opt.isCorrect ? 'var(--success)' : COLORS[oi] }}>
                        {opt.isCorrect && <div className="w-2 h-2 rounded-full sq-bg-success" />}
                      </div>
                      <span className="text-xs font-semibold sq-text-foreground">
                        {['A', 'B', 'C', 'D'][oi]}
                      </span>
                      {opt.isCorrect && <span className="text-xs sq-text-success ml-auto">✓ Đúng</span>}
                    </div>
                    <input
                      value={opt.text}
                      onChange={(e) => { e.stopPropagation(); updateOption(oi, 'text', e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Đáp án ${['A', 'B', 'C', 'D'][oi]}...`}
                      className="bg-transparent outline-none w-full text-sm placeholder:sq-text-subtle sq-text-foreground"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="sq-bg-surface sq-border rounded-xl p-4">
              <label className="block text-xs font-medium sq-text-muted mb-2 flex items-center gap-1.5">
                💡 Giải thích <span className="sq-text-subtle font-normal">(hiển thị sau khi trả lời)</span>
              </label>
              <textarea
                value={q.explanation || ''}
                onChange={(e) => updateQ('explanation', e.target.value)}
                placeholder="VD: Đáp án B vì..."
                rows={2}
                className="sq-input resize-none text-sm py-2.5"
              />
            </div>
          </div>
        </div>
      </div>

      {showAI && (
        <AIGeneratorModal onImport={handleAIImport} onClose={() => setShowAI(false)} />
      )}
    </div>
  )
}