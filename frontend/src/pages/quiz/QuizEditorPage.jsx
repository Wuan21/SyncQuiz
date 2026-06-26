import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, ArrowLeft, Trash2, Image, Clock, Star, ChevronUp, ChevronDown, Sparkles, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getQuizFull, createQuiz, updateQuiz,
  createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
} from '../../api/quizzes.api'
import { presignUpload } from '../../api/game.api'
import { importCSV, downloadCSVTemplate } from '../../api/advanced.api'
import AIGeneratorModal from '../../components/quiz/AIGeneratorModal'

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825']
const COLOR_LABELS = ['Red', 'Blue', 'Green', 'Yellow']

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
    }
  }, [data])

  // ── Save all ───────────────────────────────────────────────────────────────
  const save = async () => {
    if (!meta.title.trim()) return toast.error('Quiz title is required')
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
  }

  const addQuestion = () => {
    setQuestions((qs) => [...qs, emptyQuestion()])
    setActiveQ(questions.length)
  }

  const removeQuestion = async (idx) => {
    const q = questions[idx]
    if (q.id && id) {
      await deleteQuestion(id, q.id)
    }
    setQuestions((qs) => qs.filter((_, i) => i !== idx))
    setActiveQ(Math.max(0, idx - 1))
  }

  const moveQ = (idx, dir) => {
    const qs = [...questions]
    const to = idx + dir
    if (to < 0 || to >= qs.length) return
    ;[qs[idx], qs[to]] = [qs[to], qs[idx]]
    setQuestions(qs)
    setActiveQ(to)
  }

  // ── Image upload ───────────────────────────────────────────────────────────
  const uploadImage = async (file) => {
    try {
      const { uploadUrl, publicUrl } = await presignUpload({
        fileName: file.name,
        contentType: file.type,
        folder: 'questions',
      })
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      updateQ('imageUrl', publicUrl)
      toast.success('Image uploaded')
    } catch {
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
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-950">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all shrink-0">
            <ArrowLeft size={16} />
          </button>
          <input
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            placeholder="Tên quiz..."
            className="bg-transparent text-lg font-bold outline-none text-white placeholder-white/25 flex-1 min-w-0"
          />
          <span className="text-white/25 text-sm shrink-0">{questions.length} câu</span>
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 text-violet-300 text-sm font-medium transition-all">
            <Sparkles size={14} /> AI
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all cursor-pointer">
            <Upload size={14} /> CSV
            <input type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files[0] && handleCSVImport(e.target.files[0])} />
          </label>
          <select
            value={meta.visibility}
            onChange={(e) => setMeta((m) => ({ ...m, visibility: e.target.value }))}
            className="select text-sm py-1.5 w-auto"
          >
            <option value="private">🔒 Private</option>
            <option value="public">🌐 Public</option>
          </select>
          <button onClick={save} disabled={saving}
            className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
            <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-52 border-r border-white/10 bg-gray-900/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/8">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Câu hỏi</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all group flex items-start gap-2 ${
                  i === activeQ
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                }`}
              >
                <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold mt-0.5 ${
                  i === activeQ ? 'bg-white/20' : 'bg-white/10'
                }`}>{i + 1}</span>
                <span className="flex-1 truncate leading-snug">{q.content || 'Câu trống'}</span>
                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, -1) }}
                    className="hover:text-white transition-colors"><ChevronUp size={11} /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, 1) }}
                    className="hover:text-white transition-colors"><ChevronDown size={11} /></button>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/8">
            <button onClick={addQuestion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-sm font-medium transition-all">
              <Plus size={15} /> Thêm câu</button>
          </div>
        </div>
            </button>
          </div>
        </div>

        {/* ── Main Editor ── */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          <div className="max-w-2xl mx-auto p-6 space-y-4">

            {/* Question content */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/35 uppercase tracking-wider">
                  Câu {activeQ + 1} / {questions.length}
                </span>
                <button
                  onClick={() => removeQuestion(activeQ)}
                  disabled={questions.length === 1}
                  className="flex items-center gap-1.5 text-xs text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} /> Xóa câu
                </button>
              </div>

              <textarea
                value={q.content}
                onChange={(e) => updateQ('content', e.target.value)}
                placeholder="Nhập câu hỏi tại đây..."
                rows={3}
                className="input resize-none text-base leading-relaxed"
              />

              {/* Image */}
              <div className="mt-3">
                {q.imageUrl ? (
                  <div className="relative inline-block">
                    <img src={q.imageUrl} alt="question" className="rounded-xl max-h-40 object-cover" />
                    <button onClick={() => updateQ('imageUrl', null)}
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 text-white/70 hover:text-white transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/60 cursor-pointer transition-colors border border-dashed border-white/15 hover:border-white/30 rounded-lg px-3 py-2">
                    <Image size={14} /> Thêm ảnh (tùy chọn)
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/4 border border-white/8 rounded-xl p-3">
                <label className="flex items-center gap-1.5 text-xs text-white/45 mb-2 font-medium">
                  <Clock size={12} /> Thời gian
                </label>
                <select value={q.timeLimit} onChange={(e) => updateQ('timeLimit', +e.target.value)}
                  className="select text-sm py-2">
                  {[5, 10, 20, 30, 45, 60, 90, 120].map((t) => (
                    <option key={t} value={t}>{t} giây</option>
                  ))}
                </select>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-xl p-3">
                <label className="flex items-center gap-1.5 text-xs text-white/45 mb-2 font-medium">
                  <Star size={12} /> Điểm
                </label>
                <select value={q.points} onChange={(e) => updateQ('points', +e.target.value)}
                  className="select text-sm py-2">
                  {[0, 500, 1000, 2000].map((p) => (
                    <option key={p} value={p}>{p === 0 ? 'Không tính điểm' : `${p.toLocaleString()} điểm`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Answer options */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/60">Đáp án <span className="text-white/35 text-xs font-normal">(click vào ô để chọn đáp án đúng)</span></p>
                <span className="text-xs text-green-400/70">
                  ✓ {q.options.filter((o) => o.isCorrect).length} đúng
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    onClick={() => updateOption(oi, 'isCorrect', true)}
                    className={`relative rounded-xl p-3 cursor-pointer transition-all border-l-4 ${
                      opt.isCorrect
                        ? 'bg-green-500/10 border border-green-500/30 ring-1 ring-green-500/20'
                        : 'bg-white/4 border border-white/8 hover:bg-white/8'
                    }`}
                    style={{ borderLeftColor: COLORS[oi] }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        opt.isCorrect ? 'border-green-400' : ''
                      }`} style={{ borderColor: opt.isCorrect ? '#4ade80' : COLORS[oi] }}>
                        {opt.isCorrect && <div className="w-2 h-2 rounded-full bg-green-400" />}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: COLORS[oi] }}>
                        {['A', 'B', 'C', 'D'][oi]}
                      </span>
                      {opt.isCorrect && <span className="text-xs text-green-400 ml-auto">✓ Đúng</span>}
                    </div>
                    <input
                      value={opt.text}
                      onChange={(e) => { e.stopPropagation(); updateOption(oi, 'text', e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Đáp án ${['A', 'B', 'C', 'D'][oi]}...`}
                      className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white/85"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-4">
              <label className="block text-xs font-medium text-white/45 mb-2 flex items-center gap-1.5">
                💡 Giải thích <span className="text-white/25 font-normal">(hiển thị sau khi trả lời)</span>
              </label>
              <textarea
                value={q.explanation || ''}
                onChange={(e) => updateQ('explanation', e.target.value)}
                placeholder="VD: Đáp án B vì..."
                rows={2}
                className="input resize-none text-sm py-2.5"
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
