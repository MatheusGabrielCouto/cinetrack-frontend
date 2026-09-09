'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTitleLibrary } from './title-library-context'

export const RatingPicker = () => {
  const { rating, isSaving, persist } = useTitleLibrary()
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const display = hoverRating ?? rating

  const handleRatingClick = (value: number) => {
    const next = rating === value ? null : value
    void persist({ rating: next })
  }

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="text-sm font-medium text-mute">Sua nota</p>
        <p className="font-display text-2xl font-semibold leading-none tabular-nums">
          {display ? (
            <>
              {display}
              <span className="text-sm font-medium text-mute">/10</span>
            </>
          ) : (
            <span className="text-sm font-medium text-mute">Sem nota</span>
          )}
        </p>
      </div>

      <div
        className="flex gap-1"
        onMouseLeave={() => setHoverRating(null)}
        role="radiogroup"
        aria-label="Nota de 1 a 10"
      >
        {Array.from({ length: 10 }, (_, index) => {
          const value = index + 1
          const active = (display ?? 0) >= value

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`Nota ${value}`}
              disabled={isSaving}
              onMouseEnter={() => setHoverRating(value)}
              onFocus={() => setHoverRating(value)}
              onBlur={() => setHoverRating(null)}
              onClick={() => handleRatingClick(value)}
              className={cn(
                'h-8 flex-1 rounded-sm transition duration-150',
                active ? 'bg-spot' : 'bg-surface-2 hover:bg-line',
              )}
            />
          )
        })}
      </div>

      {rating ? (
        <button
          type="button"
          className="mt-2 text-xs text-mute hover:text-ink disabled:opacity-40"
          disabled={isSaving}
          onClick={() => void persist({ rating: null })}
        >
          Limpar nota
        </button>
      ) : null}
    </div>
  )
}
