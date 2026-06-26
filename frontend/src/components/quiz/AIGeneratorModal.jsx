import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, X, Loader, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateAIQuiz } from '../../api/advanced.api'

const COUNTS = [3, 5, 8, 10, 15, 20]
const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', desc: 'Dễ — kiến thức cơ bản', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', desc: 'Trung bình', color: 'text-yellow-400' },
  { value: 'hard', label: 'Hard', desc: 'Khó — cần hiểu sâu', color: 'text-red-400' },
]
const LANGUAGES = ['Vietnamese', 'English', 'Bilingual (Vi + En)']

export default function AIGeneratorModal({ onImport, onClose }) {
  const [form, setForm] = useState({ topic: '', count: 5, difficulty: 'medium', language: 'Vietnamese' })
  const [preview, setPreview] = useState(null)

  const mutation = useMutation({
    mutationFn: generateAIQuiz,
    onSuccess: (data) => {
      setPreview(data.questions)
      toast.success(`✨ Generated ${data.questions.length} questions!`)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'AI generation failed'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const selectedDiff = DIFFICULTIES.find((d) => d.value === form.difficulty)

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur flex items-center justify-between px-6 py-4 border-b border-white/10 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">AI Quiz Generator</h2>
              <p className="text-white/40 text-xs">Powered by Google Gemini</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {!preview ? (
            <div className="space-y-5">
              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Chủ đề / Topic <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && form.topic.trim() && mutation.mutate(form)}
                  placeholder="VD: Lịch sử Việt Nam, Python basics, Solar system..."
                  className="input text-base"
                  autoFocus
                />
              </div>

              {/* Count */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Số câu hỏi</label>
                <div className="flex gap-2 flex-wrap">
                  {COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('count', n)}
                      className={`w-12 h-10 rounded-xl font-semibold text-sm transition-all ${
                        form.count === n
                          ? 'bg-violet-600 text-white scale-105'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Độ khó</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => set('difficulty', d.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.difficulty === d.value
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${d.color}`}>{d.label}</p>
                      <p className="text-white/40 text-xs mt-0.5">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Ngôn ngữ</label>
                <select
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                  className="select"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <Sparkles size={16} className="text-violet-400 shrink-0" />
                <span className="text-white/70">
                  Sẽ tạo <span className="text-white font-semibold">{form.count} câu</span> về{' '}
                  <span className="text-white font-semibold">"{form.topic || '...'}"</span>,{' '}
                  độ khó <span className={`font-semibold ${selectedDiff?.color}`}>{selectedDiff?.label}</span>,{' '}
                  ngôn ngữ <span className="text-white font-semibold">{form.language}</span>
                </span>
              </div>

              <button
                onClick={() => mutation.mutate(form)}
                disabled={!form.topic.trim() || mutation.isPending}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                {mutation.isPending
                  ? <><Loader size={18} className="animate-spin" /> Đang tạo câu hỏi...</>
                  : <><Sparkles size={18} /> Tạo {form.count} câu hỏi với AI</>
                }
              </button>

              <p className="text-center text-white/25 text-xs">
                Miễn phí •{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  className="text-violet-400/60 hover:text-violet-400 underline transition-colors">
                  Lấy Gemini API key
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Xem trước {preview.length} câu hỏi</p>
                  <p className="text-white/40 text-sm mt-0.5">Chủ đề: {form.topic}</p>
                </div>
                <span className="badge bg-green-500/20 text-green-400 border border-green-500/20">
                  <CheckCircle size={12} /> AI Generated
                </span>
              </div>

              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {preview.map((q, i) => (
                  <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors">
                    <p className="font-medium text-sm mb-3 leading-snug">
                      <span className="text-violet-400 font-bold mr-1">Q{i + 1}.</span>
                      {q.content}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((o, oi) => (
                        <div key={oi} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 ${
                          o.isCorrect
                            ? 'bg-green-500/15 text-green-300 border border-green-500/25'
                            : 'bg-white/5 text-white/45 border border-white/5'
                        }`}>
                          {o.isCorrect && <CheckCircle size={11} className="shrink-0" />}
                          <span className="truncate">{o.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-white/35 text-xs mt-2.5 flex items-start gap-1.5">
                        <span className="shrink-0">💡</span>
                        <span>{q.explanation}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1 sticky bottom-0 bg-gray-900 pb-1">
                <button
                  onClick={() => { setPreview(null); mutation.reset() }}
                  className="btn-secondary flex-1"
                >
                  ↺ Tạo lại
                </button>
                <button
                  onClick={() => { onImport(preview); onClose() }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Thêm vào quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

  const [form, setForm] = useState({ topic: '', count: 5, difficulty: 'medium', language: 'Vietnamese' })
  const [preview, setPreview] = useState(null)

  const mutation = useMutation({
    mutationFn: generateAIQuiz,
    onSuccess: (data) => {
      setPreview(data.questions)
      toast.success(`Generated ${data.questions.length} questions!`)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'AI generation failed'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 rounded-xl">
              <Sparkles size={22} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Quiz Generator</h2>
              <p className="text-white/40 text-xs">Powered by Google Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!preview ? (
            <>
              <div>
                <label className="block text-sm text-white/60 mb-1">Topic / Chủ đề *</label>
                <input
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value)}
                  placeholder="e.g. World War II, Python programming, Photosynthesis..."
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Questions</label>
                  <select value={form.count} onChange={(e) => set('count', +e.target.value)}
                    className="input py-2.5">
                    {[3, 5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Difficulty</label>
                  <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}
                    className="input py-2.5 capitalize">
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Language</label>
                  <select value={form.language} onChange={(e) => set('language', e.target.value)}
                    className="input py-2.5">
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => mutation.mutate(form)}
                disabled={!form.topic.trim() || mutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {mutation.isPending
                  ? <><Loader size={18} className="animate-spin" /> Generating...</>
                  : <><Sparkles size={18} /> Generate {form.count} Questions</>
                }
              </button>

              <p className="text-center text-white/30 text-xs">
                Requires GEMINI_API_KEY in backend .env •{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  className="text-violet-400 hover:underline">Get free API key</a>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {preview.map((q, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <p className="font-medium mb-2">Q{i + 1}: {q.content}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className={`text-sm px-3 py-1.5 rounded-lg ${
                          o.isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/50'
                        }`}>
                          {o.isCorrect ? '✓ ' : ''}{o.text}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-white/40 text-xs mt-2">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPreview(null)} className="btn-secondary flex-1">
                  Regenerate
                </button>
                <button onClick={() => { onImport(preview); onClose() }} className="btn-primary flex-1">
                  Add to Quiz ({preview.length} questions)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
