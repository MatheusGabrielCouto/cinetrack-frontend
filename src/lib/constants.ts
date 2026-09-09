export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? ''

export const TMDB_IMAGE_BASE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? 'https://image.tmdb.org/t/p'

export const ACCESS_TOKEN_KEY = 'cinetrack_access_token'
export const REFRESH_TOKEN_KEY = 'cinetrack_refresh_token'

export const WATCH_STATUS_LABELS = {
  WANT_TO_WATCH: 'Quero assistir',
  WATCHING: 'Assistindo',
  WATCHED: 'Assistido',
} as const

export const MEDIA_TYPE_LABELS = {
  MOVIE: 'Filme',
  TV: 'Série',
} as const
