'use client'

// ─── Base Skeleton Block ───

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

function Bone({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} style={style} />
}

// ─── Stock Card Skeleton (for homepage grid) ───

export function StockCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Bone className="rounded-2xl" style={{ width: 64, height: 64 }} />
      <Bone style={{ width: 36, height: 10 }} />
    </div>
  )
}

// ─── Stock Grid Skeleton (homepage) ───

export function StockGridSkeleton({ count = 40 }: { count?: number }) {
  return (
    <div
      className="grid justify-center gap-4 sm:gap-8"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 72px))' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StockCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Mover Card Skeleton (top gainers/losers) ───

export function MoverCardSkeleton() {
  return (
    <div
      className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        minWidth: 120,
      }}
    >
      <Bone className="rounded-full" style={{ width: 24, height: 24 }} />
      <div className="flex flex-col gap-1.5">
        <Bone style={{ width: 40, height: 11 }} />
        <Bone style={{ width: 60, height: 10 }} />
      </div>
    </div>
  )
}

// ─── Movers Row Skeleton ───

export function MoversRowSkeleton() {
  return (
    <div className="flex gap-2.5 overflow-hidden pb-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <MoverCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Chart Skeleton (for stock detail / fundamentals) ───

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div className="px-6 pt-5 pb-3 flex items-center gap-3">
        <Bone className="rounded-full" style={{ width: 32, height: 32 }} />
        <div className="flex flex-col gap-1.5">
          <Bone style={{ width: 120, height: 14 }} />
          <Bone style={{ width: 80, height: 10 }} />
        </div>
      </div>
      <div className="px-6 pb-4">
        <Bone style={{ width: '100%', height }} />
      </div>
    </div>
  )
}

// ─── Table Row Skeleton ───

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Bone key={i} style={{ width: i === 0 ? 100 : 60, height: 12, flex: i === 0 ? 2 : 1 }} />
      ))}
    </div>
  )
}

// ─── Table Skeleton ───

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Bone key={i} style={{ width: i === 0 ? 80 : 50, height: 10, flex: i === 0 ? 2 : 1, opacity: 0.5 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

// ─── Stat Card Skeleton ───

export function StatCardSkeleton() {
  return (
    <div
      className="flex-1 rounded-lg px-3 py-2.5"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <Bone className="mb-1.5" style={{ width: 40, height: 9 }} />
      <Bone style={{ width: 56, height: 14 }} />
    </div>
  )
}

// ─── Stock Detail Header Skeleton ───

export function StockDetailHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Bone className="rounded-2xl" style={{ width: 56, height: 56 }} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Bone style={{ width: 60, height: 18 }} />
          <Bone className="rounded-full" style={{ width: 70, height: 16 }} />
        </div>
        <Bone style={{ width: 140, height: 12 }} />
      </div>
      <div className="text-right">
        <Bone className="mb-1.5 ml-auto" style={{ width: 90, height: 24 }} />
        <Bone className="ml-auto" style={{ width: 60, height: 14 }} />
      </div>
    </div>
  )
}

// ─── News Card Skeleton ───

export function NewsCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <Bone className="mb-2" style={{ width: '90%', height: 14 }} />
      <Bone className="mb-3" style={{ width: '60%', height: 11 }} />
      <Bone style={{ width: '100%', height: 10 }} />
      <Bone className="mt-1" style={{ width: '80%', height: 10 }} />
    </div>
  )
}

// ─── Insider Trade Skeleton ───

export function InsiderTradeSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
      <Bone className="rounded-full" style={{ width: 32, height: 32 }} />
      <div className="flex-1">
        <Bone className="mb-1.5" style={{ width: 100, height: 12 }} />
        <Bone style={{ width: 70, height: 10 }} />
      </div>
      <div className="text-right">
        <Bone className="mb-1.5 ml-auto" style={{ width: 60, height: 12 }} />
        <Bone className="ml-auto" style={{ width: 40, height: 10 }} />
      </div>
    </div>
  )
}

// ─── Full Page Loading ───

export function PageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-8">
        <Bone className="rounded-2xl" style={{ width: 48, height: 48 }} />
        <div>
          <Bone className="mb-2" style={{ width: 140, height: 18 }} />
          <Bone style={{ width: 200, height: 12 }} />
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton />
    </div>
  )
}

export { Bone }
