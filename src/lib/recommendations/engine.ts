import { tmdbApi } from '@/lib/tmdb/client'
import type { LibraryItem, MediaType, TmdbMedia } from '@/types'
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
    if (topGenreIds.has(id)) bonus += 0.35
    if (antiGenreIds.has(id)) bonus -= 0.9
  })
  return bonus
}

const resolveSeedTitles = async (seeds: TasteSeed[]) => {
  const titles = new Map<string, string>()

  await Promise.all(
    seeds.map(async (seed) => {
      const key = mediaExclusionKey(seed.mediaType, seed.tmdbId)
      try {
        const details = await tmdbApi.details(seed.mediaType, seed.tmdbId)
        titles.set(key, details.title)
      } catch {
        titles.set(key, seed.titleHint ?? 'um título que você curtiu')
      }
    }),
  )

  return titles
}

export const getRecommendations = async (
  library: LibraryItem[],
  options: {
    mediaFilter?: MediaType | 'ALL'
    limit?: number
  } = {},
): Promise<RecommendationResult> => {
  const mediaFilter = options.mediaFilter ?? 'ALL'
  const limit = options.limit ?? 24
  const profile = buildTasteProfile(library)
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

  const seeds = profile.seeds.filter((seed) =>
    matchesFilter(seed.mediaType, mediaFilter),
  )
  const seedTitles = await resolveSeedTitles(seeds)

  const candidates = new Map<string, CandidateAccum>()
  const topGenreIds = new Set(profile.topGenres.map((genre) => genre.id))
  const antiGenreIds = new Set(profile.antiGenres.map((genre) => genre.id))
  const withoutGenreIds = profile.antiGenres.slice(0, 2).map((genre) => genre.id)

  await Promise.all(
    seeds.map(async (seed) => {
      try {
        const recs = await tmdbApi.recommendations(seed.mediaType, seed.tmdbId)
        const seedKey = mediaExclusionKey(seed.mediaType, seed.tmdbId)
        const seedTitle = seedTitles.get(seedKey) ?? 'um título que você curtiu'
        const because = `Porque você gostou de ${seedTitle}`
        const base = seed.weight / 10

        recs.forEach((media, index) => {
          if (!matchesFilter(media.mediaType, mediaFilter)) return
          const key = mediaExclusionKey(media.mediaType, media.id)
          if (excluded.has(key)) return

          const rankDecay = 1 - index * 0.03
          const delta =
            base * Math.max(rankDecay, 0.4) +
            media.voteAverage / 20 +
            genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

          bumpCandidate(candidates, media, delta, because, base + 1)
        })
      } catch {
        // ignore seed failures
      }
    }),
  )

  const discoverTypes: MediaType[] =
    mediaFilter === 'ALL' ? ['MOVIE', 'TV'] : [mediaFilter]

  const topGenrePairs = profile.topGenres.slice(0, 2)

  await Promise.all(
    discoverTypes.flatMap((mediaType) =>
      topGenrePairs.map(async (genre) => {
        try {
          const results = await tmdbApi.discover({
            mediaType,
            genreIds: [genre.id],
            withoutGenreIds:
              withoutGenreIds.length > 0 ? withoutGenreIds : undefined,
            voteAverageGte: 6.5,
            sortBy: 'popularity.desc',
            maxPages: 1,
          })

          const genreName = genreNames.get(genre.id) ?? 'seu gosto'
          const because = `No seu gênero: ${genreName}`

          results.forEach((media, index) => {
            const key = mediaExclusionKey(media.mediaType, media.id)
            if (excluded.has(key)) return

            const delta =
              0.55 +
              genre.weight / 40 +
              media.voteAverage / 25 -
              index * 0.01 +
              genreOverlapBonus(media.genreIds, topGenreIds, antiGenreIds)

            bumpCandidate(candidates, media, delta, because, 0.5)
          })
        } catch {
          // ignore discover failures
        }
      }),
    ),
  )

  const items = [...candidates.values()]
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      media: entry.media,
      score: entry.score,
      because: entry.because,
    }))

  return { profile, items, genreNames }
}

export { MEDIA_FILTERS }
