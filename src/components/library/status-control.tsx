'use client'

import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { WatchStatus } from '@/types'
import { useTitleLibrary } from './title-library-context'

const OPTIONS: WatchStatus[] = ['WANT_TO_WATCH', 'WATCHING', 'WATCHED']

type StatusControlProps = {
  size?: 'hero' | 'panel' | 'bar'
}

export const StatusControl = ({ size = 'panel' }: StatusControlProps) => {
  const { item, status, isSaving, persist } = useTitleLibrary()

  const handleStatusChange = (next: WatchStatus) => {
    void persist({ status: next })
  }

  if (size === 'hero') {
    return (
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Status de acompanhamento"
      >
        {OPTIONS.map((option) => {
          const active = Boolean(item) && status === option
          return (
            <button
              key={option}
              type="button"
              disabled={isSaving}
              onClick={() => handleStatusChange(option)}
              aria-pressed={active}
              className={cn(
                'rounded px-4 py-2.5 text-sm font-semibold transition duration-200',
                active
                  ? 'bg-ink text-bg'
                  : 'bg-white/12 text-white hover:bg-white/20',
              )}
            >
              {WATCH_STATUS_LABELS[option]}
            </button>
          )
        })}
      </div>
    )
  }

  if (size === 'bar') {
    return (
      <div
        className="grid grid-cols-3 overflow-hidden rounded border border-line"
        role="group"
        aria-label="Status de acompanhamento"
      >
        {OPTIONS.map((option) => {
          const active = Boolean(item) && status === option
          return (
            <button
              key={option}
              type="button"
              disabled={isSaving}
              onClick={() => handleStatusChange(option)}
              aria-pressed={active}
              className={cn(
                'px-2 py-2 text-[11px] font-semibold leading-tight transition duration-150',
                active ? 'bg-ink text-bg' : 'bg-surface text-mute hover:text-ink',
              )}
            >
              {WATCH_STATUS_LABELS[option]}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-3 overflow-hidden rounded-lg border border-line"
      role="group"
      aria-label="Status de acompanhamento"
    >
      {OPTIONS.map((option) => {
        const active = Boolean(item) && status === option
        return (
          <button
            key={option}
            type="button"
            disabled={isSaving}
            onClick={() => handleStatusChange(option)}
            aria-pressed={active}
            className={cn(
              'px-2 py-2.5 text-center text-xs font-semibold leading-snug transition duration-150 sm:text-sm',
              active
                ? 'bg-ink text-bg'
                : 'bg-surface-2 text-mute hover:text-ink',
            )}
          >
            {WATCH_STATUS_LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
