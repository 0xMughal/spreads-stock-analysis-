'use client'

import { useWatchlist } from '@/app/hooks/useWatchlist'

interface WatchlistButtonProps {
  symbol: string
  size?: 'sm' | 'md'
}

export default function WatchlistButton({ symbol, size = 'sm' }: WatchlistButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const active = isInWatchlist(symbol)

  const px = size === 'sm' ? 20 : 26
  const btnSize = size === 'sm' ? 28 : 36

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWatchlist(symbol)
      }}
      className="flex items-center justify-center rounded-full transition-all duration-200"
      style={{
        width: btnSize,
        height: btnSize,
        backgroundColor: active ? 'rgba(var(--bg-primary-rgb), 0.85)' : 'rgba(var(--bg-primary-rgb), 0.7)',
        backdropFilter: 'blur(8px)',
        animation: active ? 'watchlistPop 0.3s ease-out' : undefined,
      }}
      title={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      aria-label={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill={active ? 'var(--accent)' : 'none'}
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'all 0.2s ease-out',
          filter: active ? 'drop-shadow(0 0 3px var(--accent))' : 'none',
        }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
