import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, ArrowLeft, Trash2, Image, Clock, Star, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getQuizFull, createQuiz, updateQuiz,
  createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
} from '../../api/quizzes.api'
import { presignUpload } from '../../api/game.api'

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

  const q = questions[activeQ] || emptyQuestion()

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <input
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            placeholder="Quiz title..."
            className="bg-transparent text-lg font-semibold outline-none text-white placeholder-white/30 w-64"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={meta.visibility}
            onChange={(e) => setMeta((m) => ({ ...m, visibility: e.target.value }))}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 py-2 text-sm">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — question list */}
        <div className="w-56 border-r border-white/10 bg-gray-900/50 flex flex-col overflow-y-auto">
          <div className="p-2 space-y-1">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                  i === activeQ ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="truncate flex-1">Q{i + 1}: {q.content || 'Empty'}</span>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, -1) }} className="opacity-50 hover:opacity-100">
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveQ(i, 1) }} className="opacity-50 hover:opacity-100">
                    <ChevronDown size={12} />
                  </button>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/10 mt-auto">
            <button onClick={addQuestion} className="btn-secondary w-full text-sm flex items-center justify-center gap-2 py-2">
              <Plus size={16} /> Add Question
            </button>
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Question content */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/50">Question {activeQ + 1} of {questions.length}</span>
                <button
                  onClick={() => removeQuestion(activeQ)}
                  className="text-red-400/60 hover:text-red-400 transition-colors"
                  disabled={questions.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea
                value={q.content}
                onChange={(e) => updateQ('content', e.target.value)}
                placeholder="Type your question here..."
                rows={3}
                className="input resize-none text-lg"
              />

              {/* Image upload */}
              <div className="mt-3">
                {q.imageUrl ? (
                  <div className="relative">
                    <img src={q.imageUrl} alt="question" className="rounded-xl max-h-48 object-cover" />
                    <button onClick={() => updateQ('imageUrl', null)}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white/70 hover:text-white">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 cursor-pointer transition-colors w-fit">
                    <Image size={16} />
                    <span>Add image</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
                  <Clock size={14} /> Time Limit
                </label>
                <select value={q.timeLimit} onChange={(e) => updateQ('timeLimit', +e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 w-full outline-none">
                  {[5, 10, 20, 30, 45, 60, 90, 120].map((t) => (
                    <option key={t} value={t}>{t}s</option>
                  ))}
                </select>
              </div>
              <div className="card">
                <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
                  <Star size={14} /> Points
                </label>
                <select value={q.points} onChange={(e) => updateQ('points', +e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 w-full outline-none">
                  {[0, 500, 1000, 2000].map((p) => (
                    <option key={p} value={p}>{p === 0 ? 'No points' : `${p} pts`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Answer options */}
            <div className="card">
              <p className="text-sm text-white/50 mb-3">Answer Options (click to mark correct)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    onClick={() => updateOption(oi, 'isCorrect', true)}
                    className={`relative rounded-xl p-3 cursor-pointer border-2 transition-all ${
                      opt.isCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                    style={{ borderLeftColor: COLORS[oi], borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: COLORS[oi] }}>
                        {opt.isCorrect && <div className="w-2 h-2 rounded-full" style={{ background: COLORS[oi] }} />}
                      </div>
                      <span className="text-xs text-white/50">{COLOR_LABELS[oi]}</span>
                    </div>
                    <input
                      value={opt.text}
                      onChange={(e) => { e.stopPropagation(); updateOption(oi, 'text', e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`Option ${oi + 1}`}
                      className="bg-transparent outline-none w-full text-sm placeholder-white/30"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="card">
              <label className="block text-sm text-white/50 mb-2">Explanation (optional)</label>
              <textarea
                value={q.explanation || ''}
                onChange={(e) => updateQ('explanation', e.target.value)}
                placeholder="Show after answer is revealed..."
                rows={2}
                className="input resize-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
