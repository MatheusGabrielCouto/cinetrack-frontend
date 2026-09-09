import type { LibraryItem, MediaType } from '@/types'

export type TasteSeed = {
  tmdbId: number
  mediaType: MediaType
  titleHint?: string
  weight: number
}

export type TasteGenre = {
  id: number
  weight: number
}

export type TasteProfile = {
  seeds: TasteSeed[]
  topGenres: TasteGenre[]
  antiGenres: TasteGenre[]
  signalCount: number
  hasEnoughSignal: boolean
}

const MIN_SIGNAL = 3
const MAX_SEEDS = 8
const LIKED_RATING = 7
const DISLIKED_RATING = 4

const itemWeight = (item: LibraryItem) => {
  const rating = item.rating ?? (item.isFavorite ? 8 : 0)
  return rating + (item.isFavorite ? 1 : 0)
}

const libraryKey = (item: Pick<LibraryItem, 'tmdbId' | 'mediaType'>) =>
  `${item.mediaType}:${item.tmdbId}`

export const buildTasteProfile = (library: LibraryItem[]): TasteProfile => {
  const withSignal = library.filter(
    (item) =>
      item.isFavorite ||
      (item.rating !== null && item.rating > 0) ||
      item.status === 'WATCHED' ||
      item.status === 'WATCHING',
  )

  const liked = library.filter(
    (item) =>
      item.isFavorite ||
      (item.rating !== null && item.rating >= LIKED_RATING),
  )

  const disliked = library.filter(
    (item) => item.rating !== null && item.rating <= DISLIKED_RATING,
  )

  const seeds: TasteSeed[] = [...liked]
    .sort((a, b) => itemWeight(b) - itemWeight(a))
    .slice(0, MAX_SEEDS)
    .map((item) => ({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      weight: itemWeight(item),
    }))

  const topGenreWeights = new Map<number, number>()
  liked.forEach((item) => {
    const weight = itemWeight(item)
    ;(item.genreIds ?? []).forEach((genreId) => {
      topGenreWeights.set(genreId, (topGenreWeights.get(genreId) ?? 0) + weight)
    })
  })

  const antiGenreWeights = new Map<number, number>()
  disliked.forEach((item) => {
    const weight = Math.max(1, DISLIKED_RATING + 1 - (item.rating ?? 0))
    ;(item.genreIds ?? []).forEach((genreId) => {
      antiGenreWeights.set(
        genreId,
        (antiGenreWeights.get(genreId) ?? 0) + weight,
      )
    })
  })

  const topGenres = [...topGenreWeights.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)

  const topIds = new Set(topGenres.slice(0, 3).map((genre) => genre.id))

  const antiGenres = [...antiGenreWeights.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .filter((genre) => !topIds.has(genre.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)

  const signalCount = withSignal.filter(
    (item) => item.isFavorite || (item.rating !== null && item.rating > 0),
  ).length

  return {
    seeds,
    topGenres,
    antiGenres,
    signalCount,
    hasEnoughSignal: signalCount >= MIN_SIGNAL,
  }
}

export const libraryExclusionSet = (library: LibraryItem[]) =>
  new Set(library.map((item) => libraryKey(item)))

export const mediaExclusionKey = (mediaType: MediaType, tmdbId: number) =>
  `${mediaType}:${tmdbId}`
