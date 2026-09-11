import type { LibraryItem, MediaType } from '@/types'
import type { PreferredGenres } from './preferred-genres'

export type TasteSeedReason = 'liked' | 'watching' | 'watched'

export type TasteSeed = {
  tmdbId: number
  mediaType: MediaType
  titleHint?: string
  weight: number
  reason: TasteSeedReason
}

export type TasteGenre = {
  id: number
  weight: number
}

export type TasteProfile = {
  seeds: TasteSeed[]
  topGenres: TasteGenre[]
  topMovieGenres: TasteGenre[]
  topTvGenres: TasteGenre[]
  antiGenres: TasteGenre[]
  signalCount: number
  preferredGenreCount: number
  hasEnoughSignal: boolean
}

export const MIN_SIGNAL = 3
const MAX_SEEDS = 10
const LIKED_RATING = 7
const DISLIKED_RATING = 4

const libraryKey = (item: Pick<LibraryItem, 'tmdbId' | 'mediaType'>) =>
  `${item.mediaType}:${item.tmdbId}`

const recencyMultiplier = (item: LibraryItem) => {
  const stamp = Date.parse(item.updatedAt || item.createdAt)
  if (Number.isNaN(stamp)) return 1
  const days = (Date.now() - stamp) / 86_400_000
  if (days <= 21) return 1.45
  if (days <= 90) return 1.2
  if (days <= 365) return 1
  return 0.85
}

export const hasTasteSignal = (item: LibraryItem) =>
  item.isFavorite ||
  (item.rating !== null && item.rating > 0) ||
  item.status === 'WATCHED' ||
  item.status === 'WATCHING'

const isLiked = (item: LibraryItem) =>
  item.isFavorite || (item.rating !== null && item.rating >= LIKED_RATING)

const seedReason = (item: LibraryItem): TasteSeedReason => {
  if (isLiked(item)) return 'liked'
  if (item.status === 'WATCHING') return 'watching'
  return 'watched'
}

const fallbackRating = (item: LibraryItem) => {
  if (item.rating !== null && item.rating > 0) return item.rating
  if (item.isFavorite) return 8
  if (item.status === 'WATCHING') return 7
  if (item.status === 'WATCHED') return 6.2
  return 0
}

const itemWeight = (item: LibraryItem) => {
  const extras =
    (item.isFavorite ? 1.5 : 0) +
    (item.status === 'WATCHING' ? 0.7 : 0) +
    (item.status === 'WATCHED' && isLiked(item) ? 0.3 : 0)

  return (fallbackRating(item) + extras) * recencyMultiplier(item)
}

const rankGenres = (weights: Map<number, number>, limit: number) =>
  [...weights.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)

const addGenreWeights = (
  target: Map<number, number>,
  item: LibraryItem,
  weight: number,
) => {
  ;(item.genreIds ?? []).forEach((genreId) => {
    target.set(genreId, (target.get(genreId) ?? 0) + weight)
  })
}

const pickBalancedSeeds = (items: LibraryItem[], max: number) => {
  const sorted = [...items].sort((a, b) => itemWeight(b) - itemWeight(a))
  const movies = sorted.filter((item) => item.mediaType === 'MOVIE')
  const shows = sorted.filter((item) => item.mediaType === 'TV')
  const picked: LibraryItem[] = []
  const seen = new Set<string>()

  const push = (item: LibraryItem | undefined) => {
    if (!item) return
    const key = libraryKey(item)
    if (seen.has(key)) return
    seen.add(key)
    picked.push(item)
  }

  let movieIndex = 0
  let showIndex = 0
  while (picked.length < max && (movieIndex < movies.length || showIndex < shows.length)) {
    if (movieIndex < movies.length) push(movies[movieIndex++])
    if (picked.length >= max) break
    if (showIndex < shows.length) push(shows[showIndex++])
  }

  return picked
}

const addPreferredWeights = (
  movieGenreWeights: Map<number, number>,
  tvGenreWeights: Map<number, number>,
  combinedGenreWeights: Map<number, number>,
  preferred?: PreferredGenres | null,
) => {
  if (!preferred) return

  const weight = 14
  preferred.movieIds.forEach((id) => {
    movieGenreWeights.set(id, (movieGenreWeights.get(id) ?? 0) + weight)
    combinedGenreWeights.set(id, (combinedGenreWeights.get(id) ?? 0) + weight)
  })
  preferred.tvIds.forEach((id) => {
    tvGenreWeights.set(id, (tvGenreWeights.get(id) ?? 0) + weight)
    combinedGenreWeights.set(id, (combinedGenreWeights.get(id) ?? 0) + weight)
  })
}

export const buildTasteProfile = (
  library: LibraryItem[],
  preferred?: PreferredGenres | null,
): TasteProfile => {
  const withSignal = library.filter(hasTasteSignal)
  const liked = library.filter(isLiked)
  const disliked = library.filter(
    (item) => item.rating !== null && item.rating <= DISLIKED_RATING,
  )

  const extras = withSignal.filter((item) => !isLiked(item))
  const seedPool = liked.length >= 2 ? [...liked, ...extras] : withSignal

  const seeds: TasteSeed[] = pickBalancedSeeds(seedPool, MAX_SEEDS).map((item) => ({
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    weight: itemWeight(item),
    reason: seedReason(item),
  }))

  const genreSource = liked.length > 0 ? liked : withSignal
  const movieGenreWeights = new Map<number, number>()
  const tvGenreWeights = new Map<number, number>()
  const combinedGenreWeights = new Map<number, number>()

  genreSource.forEach((item) => {
    const weight = itemWeight(item)
    addGenreWeights(combinedGenreWeights, item, weight)
    if (item.mediaType === 'MOVIE') {
      addGenreWeights(movieGenreWeights, item, weight)
      return
    }
    addGenreWeights(tvGenreWeights, item, weight)
  })

  addPreferredWeights(
    movieGenreWeights,
    tvGenreWeights,
    combinedGenreWeights,
    preferred,
  )

  const topMovieGenres = rankGenres(movieGenreWeights, 4)
  const topTvGenres = rankGenres(tvGenreWeights, 4)
  const topGenres = rankGenres(combinedGenreWeights, 5)
  const topIds = new Set(topGenres.slice(0, 3).map((genre) => genre.id))

  const antiGenreWeights = new Map<number, number>()
  disliked.forEach((item) => {
    const weight = Math.max(1, DISLIKED_RATING + 1 - (item.rating ?? 0))
    addGenreWeights(antiGenreWeights, item, weight)
  })

  const antiGenres = rankGenres(antiGenreWeights, 4).filter(
    (genre) => !topIds.has(genre.id),
  )

  const preferredGenreCount = preferred?.names.length ?? 0

  return {
    seeds,
    topGenres,
    topMovieGenres,
    topTvGenres,
    antiGenres,
    signalCount: withSignal.length,
    preferredGenreCount,
    hasEnoughSignal:
      withSignal.length >= MIN_SIGNAL || preferredGenreCount >= MIN_SIGNAL,
  }
}

export const libraryExclusionSet = (library: LibraryItem[]) =>
  new Set(library.map((item) => libraryKey(item)))

export const mediaExclusionKey = (mediaType: MediaType, tmdbId: number) =>
  `${mediaType}:${tmdbId}`
