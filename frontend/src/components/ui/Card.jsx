/**
 * SyncQuiz Card Component
 * Variants: default, interactive (hover effect)
 */
export function Card({ children, className = '', interactive = false, ...props }) {
  return (
    <div
      className={`${interactive ? 'sq-card cursor-pointer hover:border-white/20' : 'sq-card'} ${className}`}
      {...props}
    >
      {children}
    </div>
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
    <h3 className={`text-base font-semibold ${className}`}>
      {children}
    </h3>
  )
}
