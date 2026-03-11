'use client'

import { useState } from 'react'

function symbolColor(symbol: string): string {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 35%)`
}

interface StockLogoProps {
  symbol: string
  logo?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
}

const SIZE_PX: Record<string, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
  '2xl': 80,
  '3xl': 96,
}

export default function StockLogo({ symbol, logo, size = 'md', className = '' }: StockLogoProps) {
  const [imageError, setImageError] = useState(false)
  const px = SIZE_PX[size] || 32

  if (!logo || imageError) {
    const bg = symbolColor(symbol)
    return (
      <div
        className={`rounded-2xl flex items-center justify-center font-bold text-white select-none ${className}`}
        style={{
          width: px,
          height: px,
          backgroundColor: bg,
          fontSize: px * 0.35,
          letterSpacing: '0.02em',
        }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt={`${symbol} logo`}
      className={`rounded-2xl object-contain ${className}`}
      style={{ width: px, height: px, backgroundColor: 'white' }}
      onError={() => setImageError(true)}
      loading="lazy"
      draggable={false}
    />
  )
}
