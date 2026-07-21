/**
 * SyncQuiz Empty State Component
 * Consistent empty state with icon, title, description, and CTA
 */
export function EmptyState({
  icon: Icon,
  iconEl,
  title,
  description,
  action,
  actionText,
  actionVariant = 'primary',
}) {
  return (
    <div className="sq-empty">
      {iconEl || (Icon && (
        <div className="sq-empty-icon flex items-center justify-center">
          <Icon size={40} strokeWidth={1.2} />
        </div>
      ))}
      <p className="sq-empty-title">{title}</p>
      {description && <p className="sq-empty-desc">{description}</p>}
      {action && actionText && (
        <button onClick={action} className={`sq-btn sq-btn-${actionVariant}`}>
          {actionText}
        </button>
      )}
    </div>
  )
}
