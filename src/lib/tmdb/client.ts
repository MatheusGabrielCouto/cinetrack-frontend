import { TMDB_API_KEY, TMDB_IMAGE_BASE } from '@/lib/constants'
import type {
  MediaType,
  TmdbCredits,
  TmdbDiscoverFilters,
  TmdbEpisode,
  TmdbMedia,
  TmdbMediaDetails,
  TmdbSeasonDetails,
  TmdbSeasonSummary,
  TmdbVideo,
  TmdbWatchProvider,
  TmdbWatchProviders,
} from '@/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export type TmdbGenre = {
  id: number
  name: string
}

type TmdbMovieResult = {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  media_type?: 'movie' | 'tv' | 'person'
  genre_ids?: number[]
}

type TmdbDetailsRaw = TmdbMovieResult & {
  tagline?: string
  status?: string
  genres?: Array<{ id: number; name: string }>
  runtime?: number | null
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  budget?: number
  revenue?: number
  original_language?: string
  original_title?: string
  original_name?: string
  popularity?: number
  vote_count?: number
  homepage?: string | null
  production_companies?: Array<{
    id: number
    name: string
    logo_path: string | null
  }>
  production_countries?: Array<{ name: string }>
  spoken_languages?: Array<{ english_name?: string; name: string }>
  networks?: Array<{ id: number; name: string; logo_path: string | null }>
  created_by?: Array<{ id: number; name: string }>
  seasons?: Array<{
    id: number
    name: string
    overview: string
    poster_path: string | null
    season_number: number
    episode_count: number
    air_date: string | null
  }>
  last_air_date?: string | null
  in_production?: boolean
  credits?: {
    cast: Array<{
      id: number
      name: string
      character: string
      profile_path: string | null
    }>
    crew: Array<{ id: number; name: string; job: string }>
  }
  videos?: {
    results: Array<{
      id: string
      key: string
      name: string
      site: string
      type: string
      official: boolean
    }>
  }
  similar?: { results: TmdbMovieResult[] }
  recommendations?: { results: TmdbMovieResult[] }
}

const ensureKey = () => {
  if (!TMDB_API_KEY) {
    throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY')
  }
}

const tmdbFetch = async <T>(path: string, params: Record<string, string> = {}) => {
  ensureKey()

  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  url.searchParams.set('language', 'pt-BR')

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('Falha ao buscar no TMDB')
  }

  return (await response.json()) as T
}

const mapMedia = (
  item: TmdbMovieResult,
  fallbackType?: MediaType,
): TmdbMedia | null => {
  const rawType = item.media_type
  let mediaType: MediaType | null = fallbackType ?? null

  if (rawType === 'movie') mediaType = 'MOVIE'
  if (rawType === 'tv') mediaType = 'TV'
  if (rawType === 'person') return null
  if (!mediaType) return null

  return {
    id: item.id,
    mediaType,
    title: item.title ?? item.name ?? 'Sem título',
    overview: item.overview ?? '',
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? item.first_air_date ?? null,
    voteAverage: item.vote_average ?? 0,
    genreIds: item.genre_ids ?? undefined,
  }
}

const mapList = (
  results: TmdbMovieResult[],
  fallbackType?: MediaType,
  limit = 20,
) =>
  results
    .map((item) => mapMedia(item, fallbackType))
    .filter((item): item is TmdbMedia => item !== null)
    .slice(0, limit)

const mapCredits = (credits?: TmdbDetailsRaw['credits']): TmdbCredits => ({
  cast: (credits?.cast ?? []).slice(0, 18).map((person) => ({
    id: person.id,
    name: person.name,
    character: person.character,
    profilePath: person.profile_path,
  })),
  crew: (credits?.crew ?? [])
    .filter((person) =>
      [
        'Director',
        'Diretor',
        'Writer',
        'Roteirista',
        'Screenplay',
        'Creator',
        'Executive Producer',
        'Producer',
        'Novel',
        'Characters',
      ].includes(person.job),
    )
    .slice(0, 12)
    .map((person) => ({
      id: person.id,
      name: person.name,
      job: person.job,
    })),
})

const mapVideos = (videos?: TmdbDetailsRaw['videos']): TmdbVideo[] =>
  (videos?.results ?? [])
    .filter((video) => video.site === 'YouTube')
    .sort((a, b) => {
      const rank = (type: string) =>
        type === 'Trailer' ? 0 : type === 'Teaser' ? 1 : 2
      return rank(a.type) - rank(b.type)
    })
    .slice(0, 8)
    .map((video) => ({
      id: video.id,
      key: video.key,
      name: video.name,
      site: video.site,
      type: video.type,
      official: video.official,
    }))

const mapSeasons = (
  seasons?: TmdbDetailsRaw['seasons'],
): TmdbSeasonSummary[] =>
  (seasons ?? [])
    .filter((season) => season.season_number > 0)
    .map((season) => ({
      id: season.id,
      name: season.name,
      overview: season.overview ?? '',
      posterPath: season.poster_path,
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
      airDate: season.air_date,
    }))

export const tmdbImage = (
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w342',
) => {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export const formatRuntime = (minutes: number | null | undefined) => {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
}

export const formatMoney = (value: number | null | undefined) => {
  if (!value) return null
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export const tmdbApi = {
  search: async (
    query: string,
    mediaFilter: 'all' | MediaType = 'all',
  ): Promise<TmdbMedia[]> => {
    if (!query.trim()) return []

    const path =
      mediaFilter === 'MOVIE'
        ? '/search/movie'
        : mediaFilter === 'TV'
          ? '/search/tv'
          : '/search/multi'

    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(path, {
      query: query.trim(),
      include_adult: 'false',
    })

    const fallback = mediaFilter === 'all' ? undefined : mediaFilter

    return mapList(
      data.results.map((item) =>
        mediaFilter === 'MOVIE'
          ? { ...item, media_type: 'movie' }
          : mediaFilter === 'TV'
            ? { ...item, media_type: 'tv' }
            : item,
      ),
      fallback,
      24,
    )
  },

  trending: async (media: 'all' | 'movie' | 'tv' = 'all'): Promise<TmdbMedia[]> => {
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(
      `/trending/${media}/week`,
    )
    return mapList(data.results)
  },

  popular: async (mediaType: MediaType): Promise<TmdbMedia[]> => {
    const path = mediaType === 'MOVIE' ? '/movie/popular' : '/tv/popular'
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(path)
    return mapList(data.results, mediaType)
  },

  topRated: async (mediaType: MediaType): Promise<TmdbMedia[]> => {
    const path = mediaType === 'MOVIE' ? '/movie/top_rated' : '/tv/top_rated'
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(path)
    return mapList(data.results, mediaType)
  },

  nowPlaying: async (): Promise<TmdbMedia[]> => {
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>('/movie/now_playing')
    return mapList(data.results, 'MOVIE')
  },

  onTheAir: async (): Promise<TmdbMedia[]> => {
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>('/tv/on_the_air')
    return mapList(data.results, 'TV')
  },

  upcoming: async (): Promise<TmdbMedia[]> => {
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>('/movie/upcoming')
    return mapList(data.results, 'MOVIE', 24)
  },

  airingToday: async (): Promise<TmdbMedia[]> => {
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>('/tv/airing_today')
    return mapList(data.results, 'TV', 24)
  },

  discover: async (filters: TmdbDiscoverFilters = {}): Promise<TmdbMedia[]> => {
    const mediaType = filters.mediaType ?? 'MOVIE'
    const path = mediaType === 'MOVIE' ? '/discover/movie' : '/discover/tv'
    const params: Record<string, string> = {
      sort_by: filters.sortBy ?? 'popularity.desc',
      include_adult: 'false',
    }

    if (filters.genreId) params.with_genres = String(filters.genreId)
    if (filters.genreIds?.length) {
      params.with_genres = filters.genreIds.join(',')
    }
    if (filters.withoutGenreIds?.length) {
      params.without_genres = filters.withoutGenreIds.join(',')
    }
    if (filters.language) params.with_original_language = filters.language
    if (filters.country) params.with_origin_country = filters.country
    if (filters.voteAverageGte !== undefined) {
      params['vote_average.gte'] = String(filters.voteAverageGte)
    }
    if (filters.voteCountGte !== undefined) {
      params['vote_count.gte'] = String(filters.voteCountGte)
    }

    if (mediaType === 'MOVIE') {
      if (filters.year) params.primary_release_year = String(filters.year)
      if (filters.runtimeGte !== undefined) {
        params['with_runtime.gte'] = String(filters.runtimeGte)
      }
      if (filters.runtimeLte !== undefined) {
        params['with_runtime.lte'] = String(filters.runtimeLte)
      }
      if (filters.primaryReleaseDateGte) {
        params['primary_release_date.gte'] = filters.primaryReleaseDateGte
      }
      if (filters.primaryReleaseDateLte) {
        params['primary_release_date.lte'] = filters.primaryReleaseDateLte
      }
    } else {
      if (filters.year) params.first_air_date_year = String(filters.year)
      if (filters.firstAirDateGte) {
        params['first_air_date.gte'] = filters.firstAirDateGte
      }
      if (filters.firstAirDateLte) {
        params['first_air_date.lte'] = filters.firstAirDateLte
      }
    }

    const maxPages = Math.min(Math.max(filters.maxPages ?? 1, 1), 10)
    const merged: TmdbMedia[] = []
    const seen = new Set<string>()

    for (let page = 1; page <= maxPages; page += 1) {
      const data = await tmdbFetch<{
        results: TmdbMovieResult[]
        total_pages?: number
      }>(path, { ...params, page: String(page) })

      data.results.forEach((item) => {
        const mapped = mapMedia(item, mediaType)
        if (!mapped) return
        const key = `${mapped.mediaType}-${mapped.id}`
        if (seen.has(key)) return
        seen.add(key)
        merged.push(mapped)
      })

      const totalPages = data.total_pages ?? 1
      if (page >= totalPages) break
    }

    return merged
  },

  watchProviders: async (
    mediaType: MediaType,
    id: number,
    region = 'BR',
  ): Promise<TmdbWatchProviders> => {
    const path =
      mediaType === 'MOVIE'
        ? `/movie/${id}/watch/providers`
        : `/tv/${id}/watch/providers`

    const data = await tmdbFetch<{
      results?: Record<
        string,
        {
          link?: string
          flatrate?: Array<{
            provider_id: number
            provider_name: string
            logo_path: string | null
          }>
          rent?: Array<{
            provider_id: number
            provider_name: string
            logo_path: string | null
          }>
          buy?: Array<{
            provider_id: number
            provider_name: string
            logo_path: string | null
          }>
        }
      >
    }>(path)

    const regionData = data.results?.[region] ?? data.results?.US

    const mapProviders = (
      list?: Array<{
        provider_id: number
        provider_name: string
        logo_path: string | null
      }>,
    ): TmdbWatchProvider[] =>
      (list ?? []).map((provider) => ({
        id: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path,
      }))

    return {
      link: regionData?.link ?? null,
      flatrate: mapProviders(regionData?.flatrate),
      rent: mapProviders(regionData?.rent),
      buy: mapProviders(regionData?.buy),
    }
  },

  genres: async (mediaType: MediaType): Promise<TmdbGenre[]> => {
    const path =
      mediaType === 'MOVIE' ? '/genre/movie/list' : '/genre/tv/list'
    const data = await tmdbFetch<{ genres: TmdbGenre[] }>(path)
    return data.genres
  },

  byGenre: async (
    mediaType: MediaType,
    genreId: number,
  ): Promise<TmdbMedia[]> => {
    const path =
      mediaType === 'MOVIE' ? '/discover/movie' : '/discover/tv'
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(path, {
      with_genres: String(genreId),
      sort_by: 'popularity.desc',
    })
    return mapList(data.results, mediaType)
  },

  recommendations: async (
    mediaType: MediaType,
    id: number,
  ): Promise<TmdbMedia[]> => {
    const path =
      mediaType === 'MOVIE'
        ? `/movie/${id}/recommendations`
        : `/tv/${id}/recommendations`
    const data = await tmdbFetch<{ results: TmdbMovieResult[] }>(path)
    return mapList(data.results, mediaType, 16)
  },

  details: async (mediaType: MediaType, id: number): Promise<TmdbMedia> => {
    const path = mediaType === 'MOVIE' ? `/movie/${id}` : `/tv/${id}`
    const data = await tmdbFetch<TmdbMovieResult>(path)
    const mapped = mapMedia(data, mediaType)

    if (!mapped) {
      throw new Error('Mídia não encontrada')
    }

    return mapped
  },

  fullDetails: async (
    mediaType: MediaType,
    id: number,
  ): Promise<TmdbMediaDetails> => {
    const path = mediaType === 'MOVIE' ? `/movie/${id}` : `/tv/${id}`
    const data = await tmdbFetch<TmdbDetailsRaw>(path, {
      append_to_response: 'credits,videos,similar,recommendations',
    })

    const base = mapMedia(data, mediaType)
    if (!base) {
      throw new Error('Mídia não encontrada')
    }

    return {
      ...base,
      tagline: data.tagline || null,
      status: data.status ?? null,
      genres: data.genres ?? [],
      genreIds: (data.genres ?? []).map((genre) => genre.id),
      runtime: data.runtime ?? null,
      episodeRunTime: data.episode_run_time ?? [],
      numberOfSeasons: data.number_of_seasons ?? null,
      numberOfEpisodes: data.number_of_episodes ?? null,
      budget: data.budget ?? null,
      revenue: data.revenue ?? null,
      originalLanguage: data.original_language ?? null,
      originalTitle: data.original_title ?? data.original_name ?? null,
      popularity: data.popularity ?? 0,
      voteCount: data.vote_count ?? 0,
      homepage: data.homepage ?? null,
      productionCompanies: (data.production_companies ?? []).map((company) => ({
        id: company.id,
        name: company.name,
        logoPath: company.logo_path,
      })),
      productionCountries: data.production_countries ?? [],
      spokenLanguages: (data.spoken_languages ?? []).map((lang) => ({
        name: lang.english_name || lang.name,
      })),
      networks: (data.networks ?? []).map((network) => ({
        id: network.id,
        name: network.name,
        logoPath: network.logo_path,
      })),
      createdBy: data.created_by ?? [],
      seasons: mapSeasons(data.seasons),
      lastAirDate: data.last_air_date ?? null,
      inProduction: data.in_production ?? null,
      credits: mapCredits(data.credits),
      videos: mapVideos(data.videos),
      similar: mapList(data.similar?.results ?? [], mediaType, 12),
      recommendations: mapList(
        data.recommendations?.results ?? [],
        mediaType,
        12,
      ),
    }
  },

  seasonDetails: async (
    tvId: number,
    seasonNumber: number,
  ): Promise<TmdbSeasonDetails> => {
    const data = await tmdbFetch<{
      id: number
      name: string
      overview: string
      poster_path: string | null
      season_number: number
      air_date: string | null
      episodes: Array<{
        id: number
        name: string
        overview: string
        episode_number: number
        season_number: number
        air_date: string | null
        runtime: number | null
        still_path: string | null
        vote_average: number
      }>
    }>(`/tv/${tvId}/season/${seasonNumber}`)

    return {
      id: data.id,
      name: data.name,
      overview: data.overview ?? '',
      posterPath: data.poster_path,
      seasonNumber: data.season_number,
      airDate: data.air_date,
      episodes: data.episodes.map(
        (episode): TmdbEpisode => ({
          id: episode.id,
          name: episode.name,
          overview: episode.overview ?? '',
          episodeNumber: episode.episode_number,
          seasonNumber: episode.season_number,
          airDate: episode.air_date,
          runtime: episode.runtime,
          stillPath: episode.still_path,
          voteAverage: episode.vote_average,
        }),
      ),
    }
  },

  credits: async (mediaType: MediaType, id: number): Promise<TmdbCredits> => {
    const path =
      mediaType === 'MOVIE' ? `/movie/${id}/credits` : `/tv/${id}/credits`
    const data = await tmdbFetch<TmdbDetailsRaw['credits'] & object>(path)
    return mapCredits(data)
  },
}
