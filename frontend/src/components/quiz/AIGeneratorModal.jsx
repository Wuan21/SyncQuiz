import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, X, Loader, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { generateAIQuiz } from '../../api/advanced.api'

const COUNTS = [3, 5, 8, 10, 15, 20]
const DIFFICULTIES = [
  { value: 'easy', colorKey: 'success' },
  { value: 'medium', colorKey: 'warning' },
  { value: 'hard', colorKey: 'danger' },
]
const COLOR_CLASSES = {
  success: 'sq-text-success',
  warning: 'sq-text-warning',
  danger: 'sq-text-danger',
}
const LANGUAGES = ['Vietnamese', 'English', 'Bilingual (Vi + En)']

export default function AIGeneratorModal({ onImport, onClose }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ topic: '', count: 5, difficulty: 'medium', language: 'Vietnamese' })
  const [preview, setPreview] = useState(null)

  const mutation = useMutation({
    mutationFn: generateAIQuiz,
    onSuccess: (data) => {
      setPreview(data.questions)
      toast.success(t('aiGenerator.successToast', { count: data.questions.length }))
    },
    onError: (err) => {
      const message = err.message || err.response?.data?.message || t('aiGenerator.errorToast')
      toast.error(message)
    },
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const selectedDiff = DIFFICULTIES.find((d) => d.value === form.difficulty)

  return (
    <div className="fixed inset-0 sq-bg-overlay backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="sq-card sq-card-flush w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-3xl sm:rounded-2xl">

        {/* Header */}
        <div className="sticky top-0 sq-bg-overlay backdrop-blur flex items-center justify-between px-6 py-4 sq-border-b z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sq-bg-primary-soft rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="sq-text-primary-light" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight sq-text-foreground">{t('aiGenerator.title')}</h2>
              <p className="sq-text-subtle text-xs">{t('aiGenerator.subTitle')}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full sq-bg-surface hover:sq-bg-surface-2 flex items-center justify-center sq-text-muted hover:sq-text-foreground transition-colors"
            aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {!preview ? (
            <div className="space-y-5">
              {/* Topic */}
              <div>
                <label className="sq-label">
                  {t('aiGenerator.topicLabel')} <span className="sq-text-danger">*</span>
                </label>
                <input
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && form.topic.trim() && mutation.mutate(form)}
                  placeholder={t('aiGenerator.topicPlaceholder')}
                  className="sq-input mt-2 text-base"
                  autoFocus
                />
              </div>

              {/* Count */}
              <div>
                <label className="sq-label">{t('aiGenerator.countLabel')}</label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('count', n)}
                      className={`w-12 h-10 rounded-xl font-semibold text-sm transition-all sq-border ${
                        form.count === n
                          ? 'sq-bg-primary sq-text-primary-foreground scale-105 sq-border-primary'
                          : 'sq-bg-surface sq-text-muted hover:sq-bg-surface-2'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="sq-label">{t('aiGenerator.difficultyLabel')}</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => set('difficulty', d.value)}
                      className={`p-3 rounded-xl sq-border text-left transition-all sq-text-foreground ${
                        form.difficulty === d.value
                          ? 'sq-border-primary sq-bg-primary-soft'
                          : 'sq-bg-surface hover:sq-border-hover'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${COLOR_CLASSES[d.colorKey]}`}>{t(`aiGenerator.${d.value}`)}</p>
                      <p className="sq-text-subtle text-xs mt-0.5">{t(`aiGenerator.${d.value}Desc`)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="sq-label">{t('aiGenerator.languageLabel')}</label>
                <select
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                  className="sq-select mt-2"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l === 'Vietnamese' ? t('aiGenerator.langVietnamese') :
                       l === 'English' ? t('aiGenerator.langEnglish') :
                       t('aiGenerator.langBilingual')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div className="sq-bg-primary-soft sq-border sq-border-primary rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <Sparkles size={16} className="sq-text-primary-light shrink-0" />
                <span className="sq-text-muted">
                  {t('aiGenerator.summaryPrefix')} <span className="sq-text-foreground font-semibold">{t('aiGenerator.summaryQuestions', { count: form.count })}</span> {t('aiGenerator.summaryTopic')}{' '}
                  <span className="sq-text-foreground font-semibold">"{form.topic || '...'}"</span>,{' '}
                  {t('aiGenerator.summaryDifficulty')} <span className={`font-semibold ${COLOR_CLASSES[selectedDiff?.colorKey]}`}>{t(`aiGenerator.${form.difficulty}`)}</span>,{' '}
                  {t('aiGenerator.summaryLanguage')}: <span className="sq-text-foreground font-semibold">
                    {form.language === 'Vietnamese' ? t('aiGenerator.langVietnamese') :
                     form.language === 'English' ? t('aiGenerator.langEnglish') :
                     t('aiGenerator.langBilingual')}
                  </span>
                </span>
              </div>

              <button
                onClick={() => mutation.mutate(form)}
                disabled={!form.topic.trim() || mutation.isPending}
                className="sq-btn sq-btn-primary w-full py-3.5 text-base"
              >
                {mutation.isPending
                  ? <><Loader size={18} className="animate-spin" /> {t('aiGenerator.generating')}</>
                  : <><Sparkles size={18} /> {t('aiGenerator.generateBtn', { count: form.count })}</>
                }
              </button>

              <p className="text-center sq-text-subtle text-xs">
                {t('aiGenerator.free')} •{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  className="sq-text-primary opacity-70 hover:opacity-100 underline transition-opacity">
                  {t('aiGenerator.getApiKey')}
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold sq-text-foreground">{t('aiGenerator.previewTitle', { count: preview.length })}</p>
                  <p className="sq-text-subtle text-sm mt-0.5">{t('aiGenerator.previewTopic')}: {form.topic}</p>
                </div>
                <span className="sq-badge sq-badge-success">
                  <CheckCircle size={12} /> AI Generated
                </span>
              </div>

              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {preview.map((q, i) => (
                  <div key={i} className="sq-bg-surface sq-border rounded-xl p-4 hover:sq-border-hover transition-colors">
                    <p className="font-medium text-sm mb-3 leading-snug sq-text-foreground">
                      <span className="sq-text-primary font-bold mr-1">Q{i + 1}.</span>
                      {q.content}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((o, oi) => (
                        <div key={oi} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 sq-border ${
                          o.isCorrect
                            ? 'sq-bg-success-soft sq-text-success sq-border-success'
                            : 'sq-bg-surface sq-text-muted sq-border'
                        }`}>
                          {o.isCorrect && <CheckCircle size={11} className="shrink-0" />}
                          <span className="truncate">{o.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="sq-text-subtle text-xs mt-2.5 flex items-start gap-1.5">
                        <span className="shrink-0">💡</span>
                        <span>{q.explanation}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1 sticky bottom-0 sq-bg-overlay pb-1">
                <button
                  onClick={() => { setPreview(null); mutation.reset() }}
                  className="sq-btn sq-btn-secondary flex-1"
                >
                  ↺ {t('aiGenerator.regenerateBtn')}
                </button>
                <button
                  onClick={() => { onImport(preview); onClose() }}
                  className="sq-btn sq-btn-primary flex-1"
                >
                  <CheckCircle size={16} />
                  {t('aiGenerator.importBtn', { count: preview.length })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}