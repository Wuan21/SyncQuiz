/**
 * SyncQuiz Input Component
 * Wraps form inputs with consistent styling, label, and error message
 * Uses theme tokens so it works in light + dark modes
 */
export function Input({
  label,
  error,
  hint,
  required,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={`sq-form-group ${className}`}>
      {label && (
        <label className="sq-label">
          {label}
          {required && <span className="sq-text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        className={`sq-input ${error ? 'error' : ''} ${inputClassName}`}
        {...props}
      />
      {error && <p className="sq-error">{error}</p>}
      {hint && !error && <p className="sq-hint">{hint}</p>}
    </div>
  )
}

export function Select({
  label,
  error,
  hint,
  required,
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`sq-form-group ${className}`}>
      {label && (
        <label className="sq-label">
          {label}
          {required && <span className="sq-text-danger ml-0.5">*</span>}
        </label>
      )}
      <select className={`sq-select ${error ? 'error' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="sq-error">{error}</p>}
      {hint && !error && <p className="sq-hint">{hint}</p>}
    </div>
  )
}

export function Textarea({
  label,
  error,
  hint,
  required,
  className = '',
  ...props
}) {
  return (
    <div className={`sq-form-group ${className}`}>
      {label && (
        <label className="sq-label">
          {label}
          {required && <span className="sq-text-danger ml-0.5">*</span>}
        </label>
      )}
      <textarea
        className={`sq-input resize-none ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <p className="sq-error">{error}</p>}
      {hint && !error && <p className="sq-hint">{hint}</p>}
    </div>
  )
}