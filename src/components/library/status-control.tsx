'use client'

import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { WatchStatus } from '@/types'
import { useTitleLibrary } from './title-library-context'

const OPTIONS: WatchStatus[] = ['WANT_TO_WATCH', 'WATCHING', 'WATCHED']

export const StatusControl = () => {
  const { item, status, isSaving, persist } = useTitleLibrary()

  const handleStatusChange = (next: WatchStatus) => {
    void persist({ status: next })
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
