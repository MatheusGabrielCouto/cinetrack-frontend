import { safeInternalPath } from '@/lib/safe-path'

export const currentLocationPath = () => {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

export const withNext = (path: string, next?: string | null) => {
  const safe = safeInternalPath(next)
  if (!safe || safe === '/' || safe.startsWith('/login') || safe.startsWith('/register')) {
    return path
  }

  return `${path}?next=${encodeURIComponent(safe)}`
}

export const loginHref = (next?: string | null) => withNext('/login', next)

export const registerHref = (next?: string | null) => withNext('/register', next)
