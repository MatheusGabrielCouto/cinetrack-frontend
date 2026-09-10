export type MediaType = 'MOVIE' | 'TV'

export type WatchStatus = 'WANT_TO_WATCH' | 'WATCHING' | 'WATCHED'

export type User = {
  id: string
  name: string
  email: string
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type LibraryItem = {
  id: string
  userId: string
  tmdbId: number
  mediaType: MediaType
  status: WatchStatus
  isFavorite: boolean
  rating: number | null
  review: string | null
  watchedAt: string | null
  currentSeason: number | null
  currentEpisode: number | null
  genreIds: number[]
  createdAt: string
  updatedAt: string
}

export type Stats = {
  totalItems: number
  movies: number
  tvShows: number
  watched: number
  watching: number
  wantToWatch: number
  favorites: number
  averageRating: number | null
}

export type Achievement = {
  code: string
  title: string
  description: string
  icon: string
  category: string
  target: number
  progress: number
  unlocked: boolean
  unlockedAt: string | null
}

export type AchievementsSummary = {
  unlockedCount: number
  totalCount: number
  achievements: Achievement[]
}

export type CreateLibraryItemInput = {
  tmdbId: number
  mediaType: MediaType
  status: WatchStatus
  isFavorite?: boolean
  rating?: number | null
  review?: string | null
  watchedAt?: string | null
  currentSeason?: number | null
  currentEpisode?: number | null
  genreIds?: number[]
}

export type UpdateLibraryItemInput = {
  status?: WatchStatus
  isFavorite?: boolean
  rating?: number | null
  review?: string | null
  watchedAt?: string | null
  currentSeason?: number | null
  currentEpisode?: number | null
  genreIds?: number[]
}

export type ListOwner = {
  id: string
  name: string
  avatar: string | null
}

export type ListSummary = {
  id: string
  userId: string
  name: string
  description: string | null
  coverUrl: string | null
  isPublic: boolean
  itemCount: number
  createdAt: string
  updatedAt: string
  owner?: ListOwner
}

export type ListItem = {
  id: string
  listId: string
  tmdbId: number
  mediaType: MediaType
  note: string | null
  position: number
  createdAt: string
}

export type ListDetail = ListSummary & {
  items: ListItem[]
}

export type CreateListInput = {
  name: string
  description?: string | null
  coverUrl?: string | null
  isPublic?: boolean
}

export type UpdateListInput = {
  name?: string
  description?: string | null
  coverUrl?: string | null
  isPublic?: boolean
}

export type AddListItemInput = {
  tmdbId: number
  mediaType: MediaType
  note?: string | null
}

export type TmdbMedia = {
  id: number
  mediaType: MediaType
  title: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  voteAverage: number
  genreIds?: number[]
}

export type TmdbWatchProvider = {
  id: number
  name: string
  logoPath: string | null
}

export type TmdbWatchProviders = {
  link: string | null
  flatrate: TmdbWatchProvider[]
  rent: TmdbWatchProvider[]
  buy: TmdbWatchProvider[]
}

export type TmdbDiscoverFilters = {
  mediaType?: MediaType
  year?: number
  voteAverageGte?: number
  voteCountGte?: number
  language?: string
  genreId?: number
  genreIds?: number[]
  withoutGenreIds?: number[]
  runtimeGte?: number
  runtimeLte?: number
  country?: string
  sortBy?: string
  primaryReleaseDateGte?: string
  primaryReleaseDateLte?: string
  firstAirDateGte?: string
  firstAirDateLte?: string
  keywordId?: number
  /** How many TMDB pages to fetch (20 items each). Caps at 10. */
  maxPages?: number
  page?: number
}

export type TmdbPagedMedia = {
  items: TmdbMedia[]
  page: number
  totalPages: number
}

export type TmdbKeyword = {
  id: number
  name: string
}

export type TmdbCollectionSummary = {
  id: number
  name: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
}

export type TmdbCollectionDetails = TmdbCollectionSummary & {
  parts: TmdbMedia[]
}

export type TmdbCredits = {
  cast: Array<{
    id: number
    name: string
    character: string
    profilePath: string | null
  }>
  crew: Array<{ id: number; name: string; job: string }>
}

export type TmdbVideo = {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
}

export type TmdbSeasonSummary = {
  id: number
  name: string
  overview: string
  posterPath: string | null
  seasonNumber: number
  episodeCount: number
  airDate: string | null
}

export type TmdbEpisode = {
  id: number
  name: string
  overview: string
  episodeNumber: number
  seasonNumber: number
  airDate: string | null
  runtime: number | null
  stillPath: string | null
  voteAverage: number
}

export type TmdbEpisodeDetails = TmdbEpisode & {
  voteCount: number
  productionCode: string | null
  guestStars: TmdbCredits['cast']
  cast: TmdbCredits['cast']
  crew: TmdbCredits['crew']
  stills: string[]
  videos: TmdbVideo[]
}

export type TmdbSeasonDetails = {
  id: number
  name: string
  overview: string
  posterPath: string | null
  seasonNumber: number
  airDate: string | null
  episodes: TmdbEpisode[]
}

export type TmdbMediaDetails = TmdbMedia & {
  tagline: string | null
  status: string | null
  genres: Array<{ id: number; name: string }>
  runtime: number | null
  episodeRunTime: number[]
  numberOfSeasons: number | null
  numberOfEpisodes: number | null
  budget: number | null
  revenue: number | null
  originalLanguage: string | null
  originalTitle: string | null
  popularity: number
  voteCount: number
  homepage: string | null
  productionCompanies: Array<{ id: number; name: string; logoPath: string | null }>
  productionCountries: Array<{ name: string }>
  spokenLanguages: Array<{ name: string }>
  networks: Array<{ id: number; name: string; logoPath: string | null }>
  createdBy: Array<{ id: number; name: string }>
  seasons: TmdbSeasonSummary[]
  lastAirDate: string | null
  inProduction: boolean | null
  credits: TmdbCredits
  videos: TmdbVideo[]
  similar: TmdbMedia[]
  recommendations: TmdbMedia[]
  keywords: TmdbKeyword[]
  belongsToCollection: TmdbCollectionSummary | null
}

export type TmdbPersonCredit = TmdbMedia & {
  character: string | null
  job: string | null
  department: string | null
  episodeCount: number | null
  popularity: number
  creditKind: 'cast' | 'crew'
}

export type TmdbPersonDetails = {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  placeOfBirth: string | null
  knownForDepartment: string | null
  gender: number
  biographyInEnglish: boolean
  alsoKnownAs: string[]
  homepage: string | null
  popularity: number
  profilePath: string | null
  imdbId: string | null
  instagramId: string | null
  twitterId: string | null
  facebookId: string | null
  photos: string[]
  credits: TmdbPersonCredit[]
}

