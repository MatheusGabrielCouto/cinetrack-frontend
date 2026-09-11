import type { TmdbGenre } from '@/lib/tmdb/client'
import { MOVIE_TO_TV_GENRE, TV_TO_MOVIE_GENRE } from './genre-map'

export const MIN_PREFERRED_GENRES = 3
export const MAX_PREFERRED_GENRES = 8

const STORAGE_PREFIX = 'cinetrack:preferred-genres:'

const SKIP_MOVIE_IDS = new Set([10770])
const SKIP_TV_IDS = new Set([10763, 10766, 10767])

export type GenreChoice = {
  id: string
  name: string
  movieId: number | null
  tvId: number | null
}

export type PreferredGenres = {
  names: string[]
  movieIds: number[]
  tvIds: number[]
}

const storageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`

const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const buildGenreChoices = (
  movies: TmdbGenre[],
  shows: TmdbGenre[],
): GenreChoice[] => {
  const tvById = new Map(shows.map((genre) => [genre.id, genre]))
  const tvByName = new Map(
    shows.map((genre) => [normalizeName(genre.name), genre]),
  )
  const usedTv = new Set<number>()
  const choices: GenreChoice[] = []

  movies.forEach((movie) => {
    if (SKIP_MOVIE_IDS.has(movie.id)) return

    const mappedId = MOVIE_TO_TV_GENRE[movie.id]
    const tvMatch =
      (mappedId ? tvById.get(mappedId) : undefined) ??
      tvByName.get(normalizeName(movie.name))

    if (tvMatch) usedTv.add(tvMatch.id)

    choices.push({
      id: `movie-${movie.id}`,
      name: movie.name,
      movieId: movie.id,
      tvId: tvMatch?.id ?? mappedId ?? null,
    })
  })

  shows.forEach((show) => {
    if (SKIP_TV_IDS.has(show.id) || usedTv.has(show.id)) return

    choices.push({
      id: `tv-${show.id}`,
      name: show.name,
      movieId: TV_TO_MOVIE_GENRE[show.id] ?? null,
      tvId: show.id,
    })
  })

  return choices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export const toPreferredGenres = (choices: GenreChoice[]): PreferredGenres => {
  const movieIds = [
    ...new Set(
      choices
        .map((choice) => choice.movieId)
        .filter((id): id is number => id !== null),
    ),
  ]
  const tvIds = [
    ...new Set(
      choices
        .map((choice) => choice.tvId)
        .filter((id): id is number => id !== null),
    ),
  ]

  return {
    names: choices.map((choice) => choice.name),
    movieIds,
    tvIds,
  }
}

export const readPreferredGenres = (
  userId: string,
): PreferredGenres | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PreferredGenres
    if (!Array.isArray(parsed.names)) return null
    return {
      names: parsed.names,
      movieIds: parsed.movieIds ?? [],
      tvIds: parsed.tvIds ?? [],
    }
  } catch {
    return null
  }
}

export const savePreferredGenres = (
  userId: string,
  genres: PreferredGenres,
) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify(genres))
}

export const hasPreferredGenres = (userId: string) => {
  const stored = readPreferredGenres(userId)
  return Boolean(stored && stored.names.length >= MIN_PREFERRED_GENRES)
}
