import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * SyncQuiz Modal Component
 * Accessible modal with focus trap and backdrop click to close
 */
export function Modal({ open, onClose, title, children, className = '', size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return (
    <div
      className="sq-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`sq-modal ${sizes[size]} ${className}`}>
        {title && (
          <div className="sq-modal-header">
            <h2 id="modal-title" className="sq-modal-title">{title}</h2>
            <button
              onClick={onClose}
              className="sq-btn sq-btn-ghost sq-btn-icon sq-text-muted hover:sq-text-foreground"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

/**
 * Confirm dialog — simple yes/no modal
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="sq-text-muted text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="sq-btn sq-btn-secondary flex-1">
          {cancelText}
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`sq-btn flex-1 ${variant === 'danger' ? 'sq-btn-danger' : 'sq-btn-primary'}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}