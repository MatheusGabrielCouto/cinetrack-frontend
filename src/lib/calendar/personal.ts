import { episodePath, nextEpisode } from '@/lib/library/progress'
import { tmdbApi } from '@/lib/tmdb/client'
import type { LibraryItem, TmdbMedia } from '@/types'

export type CalendarEntry = TmdbMedia & {
  kind: 'want' | 'episode' | 'catalog'
  episodeLabel?: string
  href: string
}

const inRange = (date: string | null | undefined, start: string, end: string) => {
  if (!date) return false
  const key = date.slice(0, 10)
  return key >= start && key <= end
}

const toEntry = (
  media: TmdbMedia,
  kind: CalendarEntry['kind'],
  extra?: Pick<CalendarEntry, 'episodeLabel' | 'href' | 'releaseDate'>,
): CalendarEntry => ({
  ...media,
  kind,
  episodeLabel: extra?.episodeLabel,
  href:
    extra?.href ??
    `/title/${media.mediaType.toLowerCase()}/${media.id}`,
  releaseDate: extra?.releaseDate ?? media.releaseDate,
})

export const calendarEntryKey = (item: CalendarEntry) =>
  item.episodeLabel
    ? `${item.mediaType}-${item.id}-${item.episodeLabel}`
    : `${item.mediaType}-${item.id}`

export const loadCatalogReleases = async (range: {
  start: string
  end: string
}): Promise<CalendarEntry[]> => {
  const [movies, series] = await Promise.all([
    tmdbApi.discover({
      mediaType: 'MOVIE',
      sortBy: 'popularity.desc',
      primaryReleaseDateGte: range.start,
      primaryReleaseDateLte: range.end,
      maxPages: 5,
    }),
    tmdbApi.discover({
      mediaType: 'TV',
      sortBy: 'popularity.desc',
      firstAirDateGte: range.start,
      firstAirDateLte: range.end,
      maxPages: 5,
    }),
  ])

  return [...movies, ...series]
    .filter((item) => inRange(item.releaseDate, range.start, range.end))
    .map((item) => toEntry(item, 'catalog'))
}

export const loadPersonalReleases = async (
  library: LibraryItem[],
  range: { start: string; end: string },
): Promise<CalendarEntry[]> => {
  const tracked = library.filter(
    (item) => item.status === 'WANT_TO_WATCH' || item.status === 'WATCHING',
  )
  const limited = tracked.slice(0, 48)
  const entries: CalendarEntry[] = []
  const seen = new Set<string>()

  const push = (entry: CalendarEntry) => {
    if (!inRange(entry.releaseDate, range.start, range.end)) return
    const key = calendarEntryKey(entry)
    if (seen.has(key)) return
    seen.add(key)
    entries.push(entry)
  }

  await Promise.all(
    limited.map(async (item) => {
      try {
        if (item.mediaType === 'MOVIE') {
          if (item.status !== 'WANT_TO_WATCH') return
          const media = await tmdbApi.details('MOVIE', item.tmdbId)
          push(toEntry(media, 'want'))
          return
        }

        const details = await tmdbApi.fullDetails('TV', item.tmdbId)
        const media: TmdbMedia = {
          id: details.id,
          mediaType: details.mediaType,
          title: details.title,
          overview: details.overview,
          posterPath: details.posterPath,
          backdropPath: details.backdropPath,
          releaseDate: details.releaseDate,
          voteAverage: details.voteAverage,
          genreIds: details.genreIds,
        }

        if (item.status === 'WANT_TO_WATCH' && inRange(details.releaseDate, range.start, range.end)) {
          push(toEntry(media, 'want'))
        }

        const cursor =
          item.status === 'WATCHING'
            ? nextEpisode(
                details.seasons,
                item.currentSeason ?? 1,
                item.currentEpisode ?? 1,
              )
            : { season: 1, episode: 1 }

        if (!cursor) return

        const season = await tmdbApi.seasonDetails(details.id, cursor.season)
        const episode = season.episodes.find(
          (entry) => entry.episodeNumber === cursor.episode,
        )
        if (!episode?.airDate) return

        push(
          toEntry(media, 'episode', {
            episodeLabel: `T${cursor.season} · E${cursor.episode}`,
            href: episodePath(details.id, cursor.season, cursor.episode),
            releaseDate: episode.airDate,
          }),
        )
      } catch {
        // skip titles TMDB fails to resolve
      }
    }),
  )

  return entries
}
