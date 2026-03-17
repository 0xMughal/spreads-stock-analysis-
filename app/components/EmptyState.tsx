'use client'

interface EmptyStateProps {
  icon?: 'search' | 'list' | 'chart' | 'alert'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const ICONS: Record<string, string> = {
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chart: 'M3 3v18h18M7 16V8m4 8V4m4 12v-5m4 5V7',
  alert: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2',
}

export default function EmptyState({ icon = 'search', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICONS[icon]} />
        </svg>
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      {message && (
        <p className="text-xs text-center max-w-[260px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200 active:scale-95"
          style={{
            backgroundColor: 'var(--accent, var(--spreads-green))',
            color: '#fff',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
