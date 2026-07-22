/**
 * SyncQuiz Button Component
 * Variants: primary, secondary, ghost, danger, outline
 * Sizes: sm, md (default), lg
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'sq-btn sq-btn-primary',
    secondary: 'sq-btn sq-btn-secondary',
    ghost: 'sq-btn sq-btn-ghost',
    danger: 'sq-btn sq-btn-danger',
    outline: 'sq-btn sq-btn-outline',
  }

  const sizes = {
    sm: 'sq-btn-sm',
    md: '',
    lg: 'sq-btn-lg',
  }

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {Icon && iconPosition === 'left' && !loading && <Icon size={16} />}
      {children}
      {Icon && iconPosition === 'right' && !loading && <Icon size={16} />}
    </button>
  )
}

export function IconButton({ children, variant = 'ghost', size: _size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'sq-btn sq-btn-primary sq-btn-icon',
    secondary: 'sq-btn sq-btn-secondary sq-btn-icon',
    ghost: 'sq-btn sq-btn-ghost sq-btn-icon',
    danger: 'sq-btn sq-btn-danger sq-btn-icon',
    outline: 'sq-btn sq-btn-outline sq-btn-icon',
  }
  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
