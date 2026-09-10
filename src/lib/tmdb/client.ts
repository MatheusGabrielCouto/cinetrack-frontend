import { TMDB_API_KEY, TMDB_IMAGE_BASE } from '@/lib/constants'
import type {
  MediaType,
  TmdbCredits,
  TmdbDiscoverFilters,
  TmdbEpisode,
  TmdbEpisodeDetails,
  TmdbKeyword,
  TmdbCollectionDetails,
  TmdbCollectionSummary,
  TmdbMedia,
  TmdbMediaDetails,
  TmdbPersonDetails,
  TmdbPersonCredit,
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
  keywords?: {
    keywords?: Array<{ id: number; name: string }>
    results?: Array<{ id: number; name: string }>
  }
  belongs_to_collection?: {
    id: number
    name: string
    poster_path: string | null
    backdrop_path: string | null
  } | null
}

const ensureKey = () => {
  if (!TMDB_API_KEY) {
    throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY')
  }
}

const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string> = {},
  language = 'pt-BR',
) => {
  ensureKey()

  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  url.searchParams.set('language', language)

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
  cast: (credits?.cast ?? []).slice(0, 24).map((person) => ({
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

const mapKeywords = (keywords?: TmdbDetailsRaw['keywords']): TmdbKeyword[] => {
  const list = keywords?.keywords ?? keywords?.results ?? []
  return list
    .filter((item) => item.id && item.name)
    .slice(0, 24)
    .map((item) => ({ id: item.id, name: item.name }))
}

const mapCollectionSummary = (
  collection?: TmdbDetailsRaw['belongs_to_collection'],
): TmdbCollectionSummary | null => {
  if (!collection?.id || !collection.name) return null

  return {
    id: collection.id,
    name: collection.name,
    overview: '',
    posterPath: collection.poster_path,
    backdropPath: collection.backdrop_path,
  }
}

const sortByReleaseDate = (items: TmdbMedia[]) =>
  [...items].sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0
    if (!a.releaseDate) return 1
    if (!b.releaseDate) return -1
    return a.releaseDate.localeCompare(b.releaseDate)
  })

type TmdbPersonCreditRaw = TmdbMovieResult & {
  character?: string
  job?: string
  department?: string
  episode_count?: number
  popularity?: number
}

type TmdbPersonRaw = {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  known_for_department: string | null
  gender: number
  also_known_as: string[]
  homepage: string | null
  popularity: number
  profile_path: string | null
  imdb_id?: string | null
  external_ids?: {
    imdb_id: string | null
    instagram_id: string | null
    twitter_id: string | null
    facebook_id: string | null
  }
  images?: {
    profiles: Array<{
      file_path: string
      vote_average: number
    }>
  }
  combined_credits?: {
    cast: TmdbPersonCreditRaw[]
    crew: TmdbPersonCreditRaw[]
  }
}

const mergePersonCredits = (credits: TmdbPersonCredit[]) => {
  const merged = new Map<string, TmdbPersonCredit>()

  for (const credit of credits) {
    const key = `${credit.mediaType}-${credit.id}-${credit.creditKind}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, credit)
      continue
    }

    const characters = [existing.character, credit.character]
      .filter((value): value is string => Boolean(value))
      .filter((value, index, list) => list.indexOf(value) === index)
    const jobs = [existing.job, credit.job]
      .filter((value): value is string => Boolean(value))
      .filter((value, index, list) => list.indexOf(value) === index)

    merged.set(key, {
      ...existing,
      character: characters.join(' / ') || existing.character,
      job: jobs.join(' / ') || existing.job,
      popularity: Math.max(existing.popularity, credit.popularity),
      episodeCount:
        (existing.episodeCount ?? 0) > (credit.episodeCount ?? 0)
          ? existing.episodeCount
          : credit.episodeCount,
    })
  }

  return [...merged.values()]
}

const mapPersonCredit = (
  item: TmdbPersonCreditRaw,
  kind: 'cast' | 'crew',
): TmdbPersonCredit | null => {
  const media = mapMedia(item)
  if (!media) return null

  return {
    ...media,
    character: item.character?.trim() || null,
    job: item.job?.trim() || null,
    department: item.department?.trim() || null,
    episodeCount: item.episode_count ?? null,
    popularity: item.popularity ?? 0,
    creditKind: kind,
  }
}

export const tmdbImage = (
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'h632' | 'original' = 'w342',
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

  searchCollections: async (query: string): Promise<TmdbCollectionSummary[]> => {
    if (!query.trim()) return []

    const data = await tmdbFetch<{
      results: Array<{
        id: number
        name: string
        overview?: string
        poster_path: string | null
        backdrop_path: string | null
      }>
    }>('/search/collection', {
      query: query.trim(),
      include_adult: 'false',
    })

    return data.results
      .filter((item) => item.id && item.name)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        overview: item.overview ?? '',
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
      }))
  },

  collection: async (id: number): Promise<TmdbCollectionDetails> => {
    const data = await tmdbFetch<{
      id: number
      name: string
      overview: string
      poster_path: string | null
      backdrop_path: string | null
      parts: TmdbMovieResult[]
    }>(`/collection/${id}`)

    return {
      id: data.id,
      name: data.name,
      overview: data.overview ?? '',
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      parts: sortByReleaseDate(mapList(data.parts ?? [], 'MOVIE', 40)),
    }
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
    if (filters.keywordId) params.with_keywords = String(filters.keywordId)
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
      append_to_response: 'credits,videos,similar,recommendations,keywords',
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
      keywords: mapKeywords(data.keywords),
      belongsToCollection: mapCollectionSummary(data.belongs_to_collection),
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

  episodeDetails: async (
    tvId: number,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<TmdbEpisodeDetails> => {
    type EpisodePersonRaw = {
      id: number
      name: string
      character?: string
      job?: string
      profile_path: string | null
    }

    const data = await tmdbFetch<{
      id: number
      name: string
      overview: string
      episode_number: number
      season_number: number
      air_date: string | null
      runtime: number | null
      still_path: string | null
      vote_average: number
      vote_count?: number
      production_code?: string | null
      guest_stars?: EpisodePersonRaw[]
      crew?: EpisodePersonRaw[]
      credits?: {
        cast?: EpisodePersonRaw[]
        crew?: EpisodePersonRaw[]
        guest_stars?: EpisodePersonRaw[]
      }
      images?: { stills?: Array<{ file_path: string }> }
      videos?: TmdbDetailsRaw['videos']
    }>(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`, {
      append_to_response: 'credits,images,videos',
    })

    let overview = data.overview?.trim() ?? ''

    if (!overview) {
      try {
        const english = await tmdbFetch<{ overview: string }>(
          `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
          {},
          'en-US',
        )
        overview = english.overview?.trim() ?? ''
      } catch {
        overview = ''
      }
    }

    const mapPeople = (
      list: EpisodePersonRaw[] | undefined,
      withCharacter: boolean,
    ) =>
      (list ?? [])
        .filter((person) => person.id && person.name)
        .slice(0, 18)
        .map((person) => ({
          id: person.id,
          name: person.name,
          character: withCharacter ? person.character ?? '' : person.job ?? '',
          profilePath: person.profile_path,
        }))

    const guestStars = mapPeople(
      data.credits?.guest_stars ?? data.guest_stars,
      true,
    )
    const seenGuests = new Set(guestStars.map((person) => person.id))
    const cast = mapPeople(data.credits?.cast, true).filter(
      (person) => !seenGuests.has(person.id),
    )

    const crewSource = data.credits?.crew ?? data.crew ?? []
    const crew = crewSource
      .filter((person) =>
        ['Director', 'Writer', 'Screenplay', 'Teleplay'].includes(person.job ?? ''),
      )
      .slice(0, 12)
      .map((person) => ({
        id: person.id,
        name: person.name,
        job: person.job ?? '',
      }))

    const stills = (data.images?.stills ?? [])
      .map((still) => still.file_path)
      .filter(Boolean)
      .slice(0, 12)

    return {
      id: data.id,
      name: data.name,
      overview,
      episodeNumber: data.episode_number,
      seasonNumber: data.season_number,
      airDate: data.air_date,
      runtime: data.runtime,
      stillPath: data.still_path,
      voteAverage: data.vote_average ?? 0,
      voteCount: data.vote_count ?? 0,
      productionCode: data.production_code || null,
      guestStars,
      cast,
      crew,
      stills,
      videos: mapVideos(data.videos),
    }
  },

  credits: async (mediaType: MediaType, id: number): Promise<TmdbCredits> => {
    const path =
      mediaType === 'MOVIE' ? `/movie/${id}/credits` : `/tv/${id}/credits`
    const data = await tmdbFetch<TmdbDetailsRaw['credits'] & object>(path)
    return mapCredits(data)
  },

  person: async (id: number): Promise<TmdbPersonDetails> => {
    const data = await tmdbFetch<TmdbPersonRaw>(`/person/${id}`, {
      append_to_response: 'combined_credits,images,external_ids',
    })

    let biography = data.biography?.trim() ?? ''
    let biographyInEnglish = false

    if (!biography) {
      try {
        const english = await tmdbFetch<{ biography: string }>(
          `/person/${id}`,
          {},
          'en-US',
        )
        biography = english.biography?.trim() ?? ''
        biographyInEnglish = Boolean(biography)
      } catch {
        biography = ''
      }
    }

    const credits = mergePersonCredits([
      ...(data.combined_credits?.cast ?? []).map((item) =>
        mapPersonCredit(item, 'cast'),
      ),
      ...(data.combined_credits?.crew ?? []).map((item) =>
        mapPersonCredit(item, 'crew'),
      ),
    ].filter((item): item is TmdbPersonCredit => item !== null))

    const photos = (data.images?.profiles ?? [])
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .map((photo) => photo.file_path)
      .filter((path, index, list) => list.indexOf(path) === index)
      .slice(0, 16)

    return {
      id: data.id,
      name: data.name,
      biography,
      biographyInEnglish,
      birthday: data.birthday,
      deathday: data.deathday,
      placeOfBirth: data.place_of_birth,
      knownForDepartment: data.known_for_department,
      gender: data.gender,
      alsoKnownAs: data.also_known_as ?? [],
      homepage: data.homepage,
      popularity: data.popularity ?? 0,
      profilePath: data.profile_path,
      imdbId: data.external_ids?.imdb_id ?? data.imdb_id ?? null,
      instagramId: data.external_ids?.instagram_id ?? null,
      twitterId: data.external_ids?.twitter_id ?? null,
      facebookId: data.external_ids?.facebook_id ?? null,
      photos,
      credits,
    }
  },
}
