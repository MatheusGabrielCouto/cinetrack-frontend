import type { WatchStatus } from '@/types'
import { API_URL, WATCH_STATUS_LABELS } from '@/lib/constants'

export const toDisplayAssetUrl = (url: string | null | undefined) => {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed

  try {
    const apiOrigin = new URL(API_URL).origin
    const parsed = new URL(trimmed)
    if (
      parsed.origin === apiOrigin &&
      parsed.pathname.startsWith('/storage/')
    ) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return trimmed
  }

  return trimmed
}

export const formatYear = (date: string | null | undefined) => {
  if (!date) return null
  return date.slice(0, 4)
}

export const formatRating = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return value.toFixed(1)
}

export const statusLabel = (status: WatchStatus) => WATCH_STATUS_LABELS[status]

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
