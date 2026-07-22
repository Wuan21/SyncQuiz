/**
 * SyncQuiz Card Component
 * Variants: default, interactive (hover + focus effect)
 */
export function Card({ children, className = '', interactive = false, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`${interactive ? 'sq-card sq-card-interactive' : 'sq-card'} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base font-semibold sq-text-foreground ${className}`}>
      {children}
    </h3>
  )
}