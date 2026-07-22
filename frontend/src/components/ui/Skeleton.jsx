/**
 * SyncQuiz Skeleton Loaders
 * Consistent loading states for cards, rows, stats
 * All sizing/colors derive from theme tokens so they work in light + dark mode
 */
export function Skeleton({ className = '', ...props }) {
  return <div className={`sq-skeleton ${className}`} {...props} />
}

export function SkeletonCard() {
  return (
    <div className="sq-card">
      <Skeleton className="w-full h-32 rounded-lg mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <div className="flex items-center gap-4 p-4 sq-border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? '200px' : '100px' }} />
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="sq-stat">
      <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-4 w-12 mb-1" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  )
}

export function SkeletonQuizCard() {
  return (
    <div className="sq-card">
      <Skeleton className="w-full h-32 rounded-xl mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? lastWidth : '100%' }}
        />
      ))}
    </div>
  )
}