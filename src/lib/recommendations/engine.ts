import { tmdbApi } from '@/lib/tmdb/client'
import { isUnreleased } from '@/lib/utils'
import type { LibraryItem, MediaType, TmdbMedia } from '@/types'
import { MOVIE_TO_TV_GENRE, TV_TO_MOVIE_GENRE } from './genre-map'
import type { PreferredGenres } from './preferred-genres'
import {
  buildTasteProfile,
  libraryExclusionSet,
  mediaExclusionKey,
  type TasteProfile,
  type TasteSeed,
} from './taste-profile'

export type RecommendationItem = {
  media: TmdbMedia
  score: number
  because: string
}

export type RecommendationResult = {
  profile: TasteProfile
  items: RecommendationItem[]
  genreNames: Map<number, string>
}

type CandidateAccum = {
  media: TmdbMedia
  score: number
  because: string
  becauseScore: number
}

const MEDIA_FILTERS: Array<MediaType | 'ALL'> = ['ALL', 'MOVIE', 'TV']
const MAX_REC_SEEDS = 8
const PRIMARY_LIKED_SEEDS = 4
const PRIMARY_WATCHING_SEEDS = 2

const matchesFilter = (mediaType: MediaType, filter: MediaType | 'ALL') =>
  filter === 'ALL' || mediaType === filter

const bumpCandidate = (
  map: Map<string, CandidateAccum>,
  media: TmdbMedia,
  delta: number,
  because: string,
  becauseScore: number,
) => {
  const key = mediaExclusionKey(media.mediaType, media.id)
  const existing = map.get(key)

  if (!existing) {
    map.set(key, {
      media,
      score: delta,
      because,
      becauseScore,
    })
    return
  }

  existing.score += delta
  if (becauseScore > existing.becauseScore) {
    existing.because = because
    existing.becauseScore = becauseScore
  }
}

const genreOverlapBonus = (
  genreIds: number[] | undefined,
  topGenreIds: Set<number>,
  antiGenreIds: Set<number>,
) => {
  if (!genreIds?.length) return 0

  let bonus = 0
  genreIds.forEach((id) => {
    if (topGenreIds.has(id)) bonus += 0.4
    if (antiGenreIds.has(id)) bonus -= 0.55
  })
  return bonus
}

const qualityScore = (media: TmdbMedia) => {
  const votes = media.voteCount ?? 0
  const rating = media.voteAverage
  let score = 0

  if (!media.posterPath) score -= 2.5
  if (isUnreleased(media.releaseDate)) score -= 2.2
  if (votes > 0 && votes < 40) score -= 0.35
  if (votes >= 150) score += 0.22
  if (rating >= 7.2 && (votes === 0 || votes >= 40)) score += 0.32
  if (rating >= 8 && votes >= 200) score += 0.2
  if (rating > 0 && rating < 5.4 && votes >= 60) score -= 0.6

  return score
}

const isUsableCandidate = (media: TmdbMedia) => {
  if (!media.posterPath) return false
  if (isUnreleased(media.releaseDate)) return false
  const votes = media.voteCount ?? 0
  if (media.voteAverage > 0 && media.voteAverage < 5 && votes >= 40) return false
  return true
}

const mapGenresForType = (
  genres: Array<{ id: number; weight: number }>,
  mediaType: MediaType,
) => {
  const table = mediaType === 'TV' ? MOVIE_TO_TV_GENRE : TV_TO_MOVIE_GENRE
  const mapped = new Map<number, number>()

  genres.forEach((genre) => {
    const id = table[genre.id] ?? genre.id
    mapped.set(id, (mapped.get(id) ?? 0) + genre.weight)
  })

  return [...mapped.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight)
}

const genresForDiscover = (
  profile: TasteProfile,
  mediaType: MediaType,
) => {
  const native =
    mediaType === 'MOVIE' ? profile.topMovieGenres : profile.topTvGenres
  if (native.length > 0) return native

  const fallbackSource =
    mediaType === 'MOVIE' ? profile.topTvGenres : profile.topMovieGenres
  if (fallbackSource.length > 0) {
    return mapGenresForType(fallbackSource, mediaType)
  }

  return mapGenresForType(profile.topGenres, mediaType)
}

const seedBecause = (
  seed: TasteSeed,
  title: string,
  likedKeys: Set<string>,
  watchingKeys: Set<string>,
) => {
  const key = mediaExclusionKey(seed.mediaType, seed.tmdbId)

  if (seed.reason === 'watching' && watchingKeys.has(key)) {
    return `Porque você está assistindo ${title}`
  }

  if (likedKeys.has(key)) {
    return `Porque você gostou de ${title}`
  }

  return seed.mediaType === 'TV'
    ? 'Mais séries como as que você curte'
    : 'Mais filmes como os que você curte'
}

const pickMixed = (
  entries: CandidateAccum[],
  limit: number,
  filter: MediaType | 'ALL',
) => {
  const ranked = [...entries].sort((a, b) => b.score - a.score)
  if (filter !== 'ALL') return ranked.slice(0, limit)

  const movies = ranked.filter((entry) => entry.media.mediaType === 'MOVIE')
  const shows = ranked.filter((entry) => entry.media.mediaType === 'TV')
  if (movies.length === 0 || shows.length === 0) return ranked.slice(0, limit)

  const minEach = Math.min(
    Math.floor(limit * 0.4),
    movies.length,
    shows.length,
  )
  const chosen = new Set<string>()
  const result: CandidateAccum[] = []

  const take = (entry: CandidateAccum) => {
    const key = mediaExclusionKey(entry.media.mediaType, entry.media.id)
    if (chosen.has(key)) return
    chosen.add(key)
    result.push(entry)
  }

  movies.slice(0, minEach).forEach(take)
  shows.slice(0, minEach).forEach(take)
  ranked.forEach((entry) => {
    if (result.length >= limit) return
    take(entry)
  })

  return result.sort((a, b) => b.score - a.score)
}

export const getRecommendations = async (
  library: LibraryItem[],
  options: {
    mediaFilter?: MediaType | 'ALL'
    limit?: number
    preferredGenres?: PreferredGenres | null
  } = {},
): Promise<RecommendationResult> => {
  const mediaFilter = options.mediaFilter ?? 'ALL'
  const limit = options.limit ?? 24
  const profile = buildTasteProfile(library, options.preferredGenres)
  const excluded = libraryExclusionSet(library)

  const genreLists = await Promise.all([
    tmdbApi.genres('MOVIE'),
    tmdbApi.genres('TV'),
  ])
  const genreNames = new Map<number, string>()
  genreLists.flat().forEach((genre) => {
    genreNames.set(genre.id, genre.name)
  })

  if (!profile.hasEnoughSignal) {
    return { profile, items: [], genreNames }
  }

  const recSeeds = profile.seeds
    .filter((seed) =>
      mediaFilter === 'ALL' ? true : seed.mediaType === mediaFilter,
    )
    .slice(0, MAX_REC_SEEDS)

  const likedKeys = new Set(
    recSeeds
      .filter((seed) => seed.reason === 'liked')
      .slice(0, PRIMARY_LIKED_SEEDS)
      .map((seed) => mediaExclusionKey(seed.mediaType, seed.tmdbId)),
  )
  const watchingKeys = new Set(
    recSeeds
      .filter((seed) => seed.reason === 'watching')
      .slice(0, PRIMARY_WATCHING_SEEDS)
      .map((seed) => mediaExclusionKey(seed.mediaType, seed.tmdbId)),
  )

  const candidates = new Map<string, CandidateAccum>()
  const topGenreIds = new Set([
    ...profile.topGenres.map((genre) => genre.id),
    ...profile.topMovieGenres.map((genre) => genre.id),
    ...profile.topTvGenres.map((genre) => genre.id),
    ...mapGenresForType(profile.topMovieGenres, 'TV').map((genre) => genre.id),
    ...mapGenresForType(profile.topTvGenres, 'MOVIE').map((genre) => genre.id),
  ])
  const antiGenreIds = new Set(profile.antiGenres.map((genre) => genre.id))
  const hasMovieSeeds = profile.seeds.some((seed) => seed.mediaType === 'MOVIE')
  const hasTvSeeds = profile.seeds.some((seed) => seed.mediaType === 'TV')

  await Promise.all(
    recSeeds.map(async (seed) => {
      try {
        const [details, recs, similar] = await Promise.all([
          tmdbApi.details(seed.mediaType, seed.tmdbId).catch(() => null),
          tmdbApi.recommendations(seed.mediaType, seed.tmdbId).catch(() => []),
          tmdbApi.similar(seed.mediaType, seed.tmdbId).catch(() => []),
        ])

        const seedTitle =
          details?.title ?? seed.titleHint ?? 'um título que você curtiu'
        const because = seedBecause(seed, seedTitle, likedKeys, watchingKeys)
        const base = seed.weight / 8

        const ingest = (
          list: TmdbMedia[],
          strength: number,
          becauseBoost: number,
        ) => {
          list.forEach((media, index) => {
            if (!matchesFilter(media.mediaType, mediaFilter)) return
            if (!isUsableCandidate(media)) return
            const key = mediaExclusionKey(media.mediaType, media.id)
            if (excluded.has(key)) return

            const rankDecay = 1 - index * 0.028
            const delta =
              base * strength * Math.max(rankDecay, 0.42) +
              media.voteAverage / 22 +
              qualityScore(media) +
              genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

            bumpCandidate(
              candidates,
              media,
              delta,
              because,
              base + becauseBoost,
            )
          })
        }

        ingest(recs, 1, 1.2)
        ingest(similar, 0.82, 1)
      } catch {
        // ignore seed failures
      }
    }),
  )

  const discoverTypes: MediaType[] =
    mediaFilter === 'ALL' ? ['MOVIE', 'TV'] : [mediaFilter]

  await Promise.all(
    discoverTypes.flatMap((mediaType) => {
      const genres = genresForDiscover(profile, mediaType).slice(0, 3)
      const typeBoost =
        (mediaType === 'MOVIE' && !hasMovieSeeds) ||
        (mediaType === 'TV' && !hasTvSeeds)
          ? 0.85
          : 0
      const voteFloor = mediaType === 'MOVIE' ? 120 : 50

      const qualityDiscovers = genres.slice(0, 2).map(async (genre) => {
        try {
          const results = await tmdbApi.discover({
            mediaType,
            genreIds: [genre.id],
            voteAverageGte: 6.8,
            voteCountGte: voteFloor,
            sortBy: 'vote_average.desc',
            maxPages: 1,
          })

          const genreName = genreNames.get(genre.id) ?? 'seu gosto'
          const because = `No seu gênero: ${genreName}`

          results.forEach((media, index) => {
            if (!isUsableCandidate(media)) return
            const key = mediaExclusionKey(media.mediaType, media.id)
            if (excluded.has(key)) return

            const delta =
              0.72 +
              typeBoost +
              genre.weight / 36 +
              media.voteAverage / 24 -
              index * 0.012 +
              qualityScore(media) +
              genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

            bumpCandidate(candidates, media, delta, because, 0.55)
          })
        } catch {
          // ignore discover failures
        }
      })

      const popularDiscover = genres.slice(0, 1).map(async (genre) => {
        try {
          const results = await tmdbApi.discover({
            mediaType,
            genreIds: [genre.id],
            voteAverageGte: 6.5,
            voteCountGte: Math.max(40, voteFloor - 40),
            sortBy: 'popularity.desc',
            maxPages: 1,
          })

          const genreName = genreNames.get(genre.id) ?? 'seu gosto'
          const because = `Em alta no seu gênero: ${genreName}`

          results.forEach((media, index) => {
            if (!isUsableCandidate(media)) return
            const key = mediaExclusionKey(media.mediaType, media.id)
            if (excluded.has(key)) return

            const delta =
              0.58 +
              typeBoost +
              genre.weight / 50 +
              media.voteAverage / 28 -
              index * 0.01 +
              qualityScore(media) +
              genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

            bumpCandidate(candidates, media, delta, because, 0.42)
          })
        } catch {
          // ignore discover failures
        }
      })

      const mixDiscover = async () => {
        if (genres.length < 2) return

        try {
          const [first, second] = genres
          const results = await tmdbApi.discover({
            mediaType,
            genreIds: [first.id, second.id],
            voteAverageGte: 6.6,
            voteCountGte: Math.max(40, voteFloor - 50),
            sortBy: 'vote_average.desc',
            maxPages: 1,
          })

          const firstName = genreNames.get(first.id)
          const secondName = genreNames.get(second.id)
          const because =
            firstName && secondName
              ? `Mistura de ${firstName} e ${secondName}`
              : 'No cruzamento dos seus gêneros'

          results.forEach((media, index) => {
            if (!isUsableCandidate(media)) return
            const key = mediaExclusionKey(media.mediaType, media.id)
            if (excluded.has(key)) return

            const delta =
              0.8 +
              typeBoost +
              media.voteAverage / 22 -
              index * 0.012 +
              qualityScore(media) +
              genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

            bumpCandidate(candidates, media, delta, because, 0.62)
          })
        } catch {
          // ignore discover failures
        }
      }

      return [...qualityDiscovers, ...popularDiscover, mixDiscover()]
    }),
  )

  const items = pickMixed(
    [...candidates.values()].filter((entry) => entry.score > 0),
    limit,
    mediaFilter,
  ).map((entry) => ({
    media: entry.media,
    score: entry.score,
    because: entry.because,
  }))

  return { profile, items, genreNames }
}

export { MEDIA_FILTERS }
