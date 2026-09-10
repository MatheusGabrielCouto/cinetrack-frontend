import type { TmdbSeasonSummary, WatchStatus } from '@/types'

export type SeasonRef = Pick<TmdbSeasonSummary, 'seasonNumber' | 'episodeCount'>

export type EpisodeCursor = {
  season: number
  episode: number
}

export type EpisodeMark = 'watched' | 'current' | 'upcoming'

export const regularSeasons = (seasons: SeasonRef[]) =>
  seasons.filter((season) => season.seasonNumber > 0 && season.episodeCount > 0)

export const countWatchableEpisodes = (seasons: SeasonRef[]) =>
  regularSeasons(seasons).reduce((sum, season) => sum + season.episodeCount, 0)

export const formatEpisodeCode = (season: number, episode: number) =>
  `T${season} · E${episode}`

export const episodePath = (tvId: number, season: number, episode: number) =>
  `/title/tv/${tvId}/season/${season}/episode/${episode}`

export const compareEpisode = (
  leftSeason: number,
  leftEpisode: number,
  rightSeason: number,
  rightEpisode: number,
) => {
  if (leftSeason !== rightSeason) return leftSeason - rightSeason
  return leftEpisode - rightEpisode
}

export const nextEpisode = (
  seasons: SeasonRef[],
  seasonNumber: number,
  episodeNumber: number,
): EpisodeCursor | null => {
  const list = seasons
    .filter((season) => season.episodeCount > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)

  const current = list.find((season) => season.seasonNumber === seasonNumber)

  if (current && episodeNumber < current.episodeCount) {
    return { season: seasonNumber, episode: episodeNumber + 1 }
  }

  const following = list.find((season) => season.seasonNumber > seasonNumber)
  if (following) {
    return { season: following.seasonNumber, episode: 1 }
  }

  return null
}

export const previousEpisode = (
  seasons: SeasonRef[],
  seasonNumber: number,
  episodeNumber: number,
): EpisodeCursor | null => {
  if (episodeNumber > 1) {
    return { season: seasonNumber, episode: episodeNumber - 1 }
  }

  const previous = seasons
    .filter((season) => season.episodeCount > 0 && season.seasonNumber < seasonNumber)
    .sort((a, b) => b.seasonNumber - a.seasonNumber)[0]

  if (!previous) return null
  return { season: previous.seasonNumber, episode: previous.episodeCount }
}

export const lastEpisodeOfSeason = (
  seasons: SeasonRef[],
  seasonNumber: number,
): EpisodeCursor | null => {
  const season = seasons.find((item) => item.seasonNumber === seasonNumber)
  if (!season || season.episodeCount < 1) return null
  return { season: seasonNumber, episode: season.episodeCount }
}

export const firstEpisodeAfterSeason = (
  seasons: SeasonRef[],
  seasonNumber: number,
): EpisodeCursor | null => {
  const following = seasons
    .filter((season) => season.episodeCount > 0 && season.seasonNumber > seasonNumber)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)[0]

  if (!following) return null
  return { season: following.seasonNumber, episode: 1 }
}

export const watchedEpisodeCount = ({
  status,
  seasons,
  currentSeason,
  currentEpisode,
}: {
  status: WatchStatus | null
  seasons: SeasonRef[]
  currentSeason: number | null
  currentEpisode: number | null
}) => {
  const total = countWatchableEpisodes(seasons)
  if (!status || total === 0) return 0
  if (status === 'WATCHED') return total

  const season = currentSeason ?? 1
  const episode = currentEpisode ?? 1
  const hasStarted =
    status === 'WATCHING' || season > 1 || episode > 1

  if (!hasStarted) return 0

  let watched = 0
  for (const item of regularSeasons(seasons)) {
    if (item.seasonNumber < season) {
      watched += item.episodeCount
      continue
    }
    if (item.seasonNumber === season) {
      watched += Math.max(0, episode - 1)
    }
    break
  }

  return Math.min(watched, total)
}

export const seasonWatchedCount = ({
  status,
  seasonNumber,
  episodeCount,
  currentSeason,
  currentEpisode,
}: {
  status: WatchStatus | null
  seasonNumber: number
  episodeCount: number
  currentSeason: number | null
  currentEpisode: number | null
}) => {
  if (!status || episodeCount < 1) return 0
  if (status === 'WATCHED' && seasonNumber > 0) return episodeCount

  const season = currentSeason ?? 1
  const episode = currentEpisode ?? 1
  const hasStarted =
    status === 'WATCHING' || season > 1 || episode > 1

  if (!hasStarted) return 0
  if (seasonNumber < season) return episodeCount
  if (seasonNumber > season) return 0
  return Math.max(0, Math.min(episodeCount, episode - 1))
}

export const episodeMark = ({
  status,
  seasonNumber,
  episodeNumber,
  currentSeason,
  currentEpisode,
}: {
  status: WatchStatus | null
  seasonNumber: number
  episodeNumber: number
  currentSeason: number | null
  currentEpisode: number | null
}): EpisodeMark => {
  if (status === 'WATCHED' && seasonNumber > 0) return 'watched'

  const season = currentSeason ?? 1
  const episode = currentEpisode ?? 1
  const hasStarted =
    status === 'WATCHING' ||
    status === 'WATCHED' ||
    season > 1 ||
    episode > 1

  if (!hasStarted || !status) return 'upcoming'

  const cmp = compareEpisode(seasonNumber, episodeNumber, season, episode)
  if (cmp < 0) return 'watched'
  if (cmp === 0) return 'current'
  return 'upcoming'
}

export const seriesProgressRatio = ({
  status,
  seasons,
  currentSeason,
  currentEpisode,
}: {
  status: WatchStatus | null
  seasons: SeasonRef[]
  currentSeason: number | null
  currentEpisode: number | null
}) => {
  const total = countWatchableEpisodes(seasons)
  if (total === 0) return 0
  return watchedEpisodeCount({
    status,
    seasons,
    currentSeason,
    currentEpisode,
  }) / total
}
