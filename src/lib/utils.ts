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

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const toDateKey = (value: string | null | undefined) => {
  if (!value) return null
  const key = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  return key
}

export const isUnreleased = (releaseDate: string | null | undefined) => {
  const key = toDateKey(releaseDate)
  if (!key) return false
  return key > localDateKey()
}

export const formatLongDate = (value: string | null | undefined) => {
  const key = toDateKey(value)
  if (!key) return null
  const date = new Date(`${key}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR')
}

export const formatRating = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return value.toFixed(1)
}

export const statusLabel = (status: WatchStatus) => WATCH_STATUS_LABELS[status]

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
