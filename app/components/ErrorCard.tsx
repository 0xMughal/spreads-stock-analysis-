'use client'

interface ErrorCardProps {
  title?: string
  message?: string
  onRetry?: () => void
  compact?: boolean
}

export default function ErrorCard({
  title = 'Unable to load data',
  message = 'Something went wrong. Please try again.',
  onRetry,
  compact = false,
}: ErrorCardProps) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="text-xs mb-4 text-center max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200 active:scale-95"
          style={{
            backgroundColor: 'var(--accent, var(--spreads-green))',
            color: '#fff',
          }}
        >
          Try again
        </button>
      )}
    </div>
  )
}
