'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MediaPoster } from '@/components/media/media-poster'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { tmdbApi, type TmdbGenre } from '@/lib/tmdb/client'
import { cn, formatYear } from '@/lib/utils'
import type { MediaType, TmdbMedia } from '@/types'

const LANGUAGES = [
  { value: '', label: 'Qualquer idioma' },
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'ja', label: 'Japonês' },
  { value: 'ko', label: 'Coreano' },
]

const COUNTRIES = [
  { value: '', label: 'Qualquer país' },
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'EUA' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'JP', label: 'Japão' },
  { value: 'KR', label: 'Coreia do Sul' },
  { value: 'FR', label: 'França' },
]

const RATING_PRESETS = [
  { value: '', label: 'Qualquer nota' },
  { value: '6', label: '6+' },
  { value: '7', label: '7+' },
  { value: '8', label: '8+' },
]

const RUNTIME_PRESETS = [
  { value: '', label: 'Qualquer duração' },
  { value: 'short', label: 'Até 100 min' },
  { value: 'medium', label: '100–140 min' },
  { value: 'long', label: '140+ min' },
] as const

type RuntimePreset = (typeof RUNTIME_PRESETS)[number]['value']

type QuickPreset = {
  id: string
  label: string
  hint: string
  mediaType: MediaType | 'ALL'
  genreName?: string
  minRating?: string
  year?: string
  language?: string
  country?: string
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'scifi',
    label: 'Sci-Fi afiado',
    hint: 'Nota 7+',
    mediaType: 'MOVIE',
    genreName: 'Ficção científica',
    minRating: '7',
  },
  {
    id: 'terror',
    label: 'Terror',
    hint: 'Filmes',
    mediaType: 'MOVIE',
    genreName: 'Terror',
  },
  {
    id: 'br',
    label: 'Produção BR',
    hint: 'Brasil',
    mediaType: 'ALL',
    country: 'BR',
  },
  {
    id: 'anime',
    label: 'Animação JP',
    hint: 'Japonês',
    mediaType: 'ALL',
    genreName: 'Animação',
    language: 'ja',
  },
  {
    id: '2024',
    label: 'Lançados em 2024',
    hint: 'Recentes',
    mediaType: 'MOVIE',
    year: '2024',
  },
  {
    id: 'top',
    label: 'Muito bem avaliados',
    hint: 'Nota 8+',
    mediaType: 'ALL',
    minRating: '8',
  },
]

const fieldClass =
  'h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-ink placeholder:text-mute/70 transition focus:border-accent'

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [mediaType, setMediaType] = useState<MediaType | 'ALL'>('ALL')
  const [year, setYear] = useState('')
  const [minRating, setMinRating] = useState('')
  const [language, setLanguage] = useState('')
  const [genreId, setGenreId] = useState('')
  const [runtimePreset, setRuntimePreset] = useState<RuntimePreset>('')
  const [country, setCountry] = useState('')
  const [sortBy, setSortBy] = useState('popularity.desc')
  const [genres, setGenres] = useState<TmdbGenre[]>([])
  const [results, setResults] = useState<TmdbMedia[]>([])
  const [trending, setTrending] = useState<TmdbMedia[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enterKey, setEnterKey] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setTrending(await tmdbApi.trending('all'))
      } catch {
        setTrending([])
      }
    }
    void loadTrending()
  }, [])

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const type = mediaType === 'TV' ? 'TV' : 'MOVIE'
        setGenres(await tmdbApi.genres(type))
      } catch {
        setGenres([])
      }
    }
    void loadGenres()
  }, [mediaType])

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = []

    if (mediaType !== 'ALL') {
      chips.push({
        key: 'type',
        label: mediaType === 'MOVIE' ? 'Filmes' : 'Séries',
        clear: () => setMediaType('ALL'),
      })
    }
    if (genreId) {
      const genre = genres.find((item) => String(item.id) === genreId)
      chips.push({
        key: 'genre',
        label: genre?.name ?? 'Gênero',
        clear: () => setGenreId(''),
      })
    }
    if (year) {
      chips.push({
        key: 'year',
        label: `Ano ${year}`,
        clear: () => setYear(''),
      })
    }
    if (minRating) {
      chips.push({
        key: 'rating',
        label: `Nota ${minRating}+`,
        clear: () => setMinRating(''),
      })
    }
    if (language) {
      const lang = LANGUAGES.find((item) => item.value === language)
      chips.push({
        key: 'lang',
        label: lang?.label ?? language,
        clear: () => setLanguage(''),
      })
    }
    if (country) {
      const item = COUNTRIES.find((entry) => entry.value === country)
      chips.push({
        key: 'country',
        label: item?.label ?? country,
        clear: () => setCountry(''),
      })
    }
    if (runtimePreset) {
      const preset = RUNTIME_PRESETS.find((item) => item.value === runtimePreset)
      chips.push({
        key: 'runtime',
        label: preset?.label ?? 'Duração',
        clear: () => setRuntimePreset(''),
      })
    }

    return chips
  }, [
    mediaType,
    genreId,
    genres,
    year,
    minRating,
    language,
    country,
    runtimePreset,
  ])

  const hasFilters = activeChips.length > 0

  const runSearch = async (overrides?: {
    query?: string
    mediaType?: MediaType | 'ALL'
    year?: string
    minRating?: string
    language?: string
    genreId?: string
    country?: string
    runtimePreset?: RuntimePreset
  }) => {
    const nextQuery = overrides?.query ?? query
    const nextType = overrides?.mediaType ?? mediaType
    const nextYear = overrides?.year ?? year
    const nextRating = overrides?.minRating ?? minRating
    const nextLanguage = overrides?.language ?? language
    const nextGenreId = overrides?.genreId ?? genreId
    const nextCountry = overrides?.country ?? country
    const nextRuntime = overrides?.runtimePreset ?? runtimePreset

    const runtime =
      nextRuntime === 'short'
        ? { min: undefined, max: 100 }
        : nextRuntime === 'medium'
          ? { min: 100, max: 140 }
          : nextRuntime === 'long'
            ? { min: 140, max: undefined }
            : { min: undefined, max: undefined }

    const filtersOn = Boolean(
      nextYear ||
        nextRating ||
        nextLanguage ||
        nextGenreId ||
        nextCountry ||
        nextRuntime ||
        nextType !== 'ALL',
    )

    setIsLoading(true)
    setError(null)
    setSearched(true)

    try {
      if (nextQuery.trim() && !filtersOn) {
        const type = nextType === 'ALL' ? 'all' : (nextType as MediaType)
        setResults(await tmdbApi.search(nextQuery.trim(), type))
        setEnterKey((value) => value + 1)
        return
      }

      if (!nextQuery.trim() && !filtersOn) {
        setResults(await tmdbApi.trending('all'))
        setEnterKey((value) => value + 1)
        return
      }

      const primaryType: MediaType = nextType === 'TV' ? 'TV' : 'MOVIE'
      let discovered = await tmdbApi.discover({
        mediaType: primaryType,
        year: nextYear ? Number(nextYear) : undefined,
        voteAverageGte: nextRating ? Number(nextRating) : undefined,
        language: nextLanguage || undefined,
        genreId: nextGenreId ? Number(nextGenreId) : undefined,
        runtimeGte: runtime.min,
        runtimeLte: runtime.max,
        country: nextCountry || undefined,
        sortBy,
      })

      if (nextType === 'ALL') {
        const tv = await tmdbApi.discover({
          mediaType: 'TV',
          year: nextYear ? Number(nextYear) : undefined,
          voteAverageGte: nextRating ? Number(nextRating) : undefined,
          language: nextLanguage || undefined,
          genreId: nextGenreId ? Number(nextGenreId) : undefined,
          country: nextCountry || undefined,
          sortBy,
        })
        discovered = [...discovered, ...tv]
      }

      if (nextQuery.trim()) {
        const q = nextQuery.trim().toLowerCase()
        discovered = discovered.filter((item) =>
          item.title.toLowerCase().includes(q),
        )
      }

      discovered = [...discovered].sort((a, b) => {
        if (sortBy.includes('vote_average')) return b.voteAverage - a.voteAverage
        return b.voteAverage - a.voteAverage
      })

      setResults(discovered.slice(0, 36))
      setEnterKey((value) => value + 1)
    } catch {
      setError('Não foi possível buscar no TMDB')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (event?: FormEvent) => {
    event?.preventDefault()
    void runSearch()
  }

  const handleClear = () => {
    setQuery('')
    setMediaType('ALL')
    setYear('')
    setMinRating('')
    setLanguage('')
    setGenreId('')
    setRuntimePreset('')
    setCountry('')
    setSortBy('popularity.desc')
    setResults([])
    setSearched(false)
    setError(null)
    setShowAdvanced(false)
    inputRef.current?.focus()
  }

  const handlePreset = async (preset: QuickPreset) => {
    let genreList = genres
    const needsGenreList =
      Boolean(preset.genreName) &&
      (preset.mediaType === 'TV' ? 'TV' : 'MOVIE') !==
        (mediaType === 'TV' ? 'TV' : 'MOVIE')

    if (preset.genreName && (needsGenreList || genres.length === 0)) {
      try {
        const type = preset.mediaType === 'TV' ? 'TV' : 'MOVIE'
        genreList = await tmdbApi.genres(type)
        setGenres(genreList)
      } catch {
        genreList = genres
      }
    }

    const needle = (preset.genreName ?? '').toLowerCase()
    const foundGenre = needle
      ? genreList.find((genre) => {
          const name = genre.name.toLowerCase()
          if (name === needle) return true
          if (needle.includes('ficção') || needle.includes('sci')) {
            return name.includes('ficção') || name.includes('science')
          }
          return name.includes(needle)
        })
      : undefined

    const nextGenreId = foundGenre ? String(foundGenre.id) : ''

    setQuery('')
    setMediaType(preset.mediaType)
    setYear(preset.year ?? '')
    setMinRating(preset.minRating ?? '')
    setLanguage(preset.language ?? '')
    setCountry(preset.country ?? '')
    setGenreId(nextGenreId)
    setRuntimePreset('')
    setShowAdvanced(true)

    await runSearch({
      query: '',
      mediaType: preset.mediaType,
      year: preset.year ?? '',
      minRating: preset.minRating ?? '',
      language: preset.language ?? '',
      country: preset.country ?? '',
      genreId: nextGenreId,
      runtimePreset: '',
    })
  }

  const handleGenreToggle = (id: number) => {
    const next = genreId === String(id) ? '' : String(id)
    setGenreId(next)
  }

  return (
    <RequireAuth>
      <div className="relative pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(ellipse_at_top,_rgba(229,9,20,0.18),_transparent_60%)]" />

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 pb-24 sm:px-8 sm:pt-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent">
            EXPLORAR
          </p>
          <h1 className="mt-3 font-display text-[2.35rem] font-bold leading-none tracking-tight sm:text-6xl">
            Busca
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-mute">
            Encontre por nome ou refine por gênero, ano, nota, idioma e mais.
          </p>

          <form
            className="mt-10"
            onSubmit={handleSearch}
            role="search"
            aria-label="Busca de títulos"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Nome do título</span>
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
                  aria-hidden
                >
                  ⌕
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Matrix, Breaking Bad, Studio Ghibli…"
                  className="h-14 w-full rounded-xl border border-line bg-black/55 pl-11 pr-4 text-base text-ink placeholder:text-mute/70 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm transition focus:border-accent"
                  autoComplete="off"
                />
              </label>
              <div className="flex gap-3">
                <Button type="submit" size="lg" disabled={isLoading} className="min-w-0 flex-1 sm:min-w-[120px] sm:flex-none">
                  {isLoading ? 'Buscando…' : 'Buscar'}
                </Button>
                {(searched || hasFilters || query) && (
                  <Button type="button" size="lg" variant="ghost" className="min-w-0 flex-1 sm:flex-none" onClick={handleClear}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-7 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 hide-scrollbar">
              {(['ALL', 'MOVIE', 'TV'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMediaType(value)}
                  className={cn(
                    'min-h-11 shrink-0 rounded-full border px-4 text-sm transition',
                    mediaType === value
                      ? 'border-ink bg-ink text-black'
                      : 'border-line text-mute hover:border-mute hover:text-ink',
                  )}
                  aria-pressed={mediaType === value}
                >
                  {value === 'ALL'
                    ? 'Tudo'
                    : value === 'MOVIE'
                      ? 'Filmes'
                      : 'Séries'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className={cn(
                'mt-4 min-h-11 rounded-full border px-4 text-sm transition',
                showAdvanced
                  ? 'border-accent bg-accent/15 text-ink'
                  : 'border-line text-mute hover:text-ink',
              )}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? 'Ocultar filtros' : 'Mais filtros'}
            </button>

            {genres.length > 0 ? (
              <div className="hide-scrollbar mt-6 flex gap-2.5 overflow-x-auto overflow-y-hidden pb-2">
                <button
                  type="button"
                  onClick={() => setGenreId('')}
                  className={cn(
                    'min-h-10 shrink-0 rounded-full px-3.5 text-sm transition',
                    !genreId
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-mute hover:text-ink',
                  )}
                >
                  Todos os gêneros
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleGenreToggle(genre.id)}
                    className={cn(
                      'min-h-10 shrink-0 rounded-full px-3.5 text-sm transition',
                      genreId === String(genre.id)
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 text-mute hover:text-ink',
                    )}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            ) : null}

            {showAdvanced ? (
              <div className="mt-6 grid gap-5 rounded-xl border border-line bg-surface/80 p-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-mute">Ano</span>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    placeholder="Ex: 2010"
                    className={fieldClass}
                  />
                </label>

                <Select
                  label="Nota mínima"
                  name="rating"
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                  options={RATING_PRESETS}
                />

                <Select
                  label="Idioma original"
                  name="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  options={LANGUAGES}
                />

                <Select
                  label="País"
                  name="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  options={COUNTRIES}
                />

                <Select
                  label="Duração"
                  name="runtime"
                  value={runtimePreset}
                  onChange={(event) =>
                    setRuntimePreset(event.target.value as RuntimePreset)
                  }
                  options={[...RUNTIME_PRESETS]}
                />

                <Select
                  label="Ordenar por"
                  name="sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  options={[
                    { value: 'popularity.desc', label: 'Popularidade' },
                    { value: 'vote_average.desc', label: 'Melhor nota' },
                    {
                      value:
                        mediaType === 'TV'
                          ? 'first_air_date.desc'
                          : 'primary_release_date.desc',
                      label: 'Mais recentes',
                    },
                  ]}
                />

                <div className="flex items-end sm:col-span-2 lg:col-span-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            ) : null}

            {activeChips.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-mute">Ativos:</span>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-ink transition hover:bg-accent/20"
                    aria-label={`Remover filtro ${chip.label}`}
                  >
                    {chip.label}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>

          {error ? (
            <p className="mt-6 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          {!searched && !isLoading ? (
            <section className="mt-10">
              <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden px-4 pb-1 sm:mx-0 sm:px-0">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => void handlePreset(preset)}
                    aria-label={`${preset.label}. ${preset.hint}`}
                    className="min-h-10 shrink-0 rounded-full border border-line px-4 text-sm text-ink transition hover:border-mute hover:bg-surface-2"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {trending.length > 0 ? (
                <div className="mt-10">
                  <h2 className="mb-5 font-display text-2xl font-semibold">
                    Em alta agora
                  </h2>
                  <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    {trending.slice(0, 12).map((media) => (
                      <MediaPoster
                        key={`trend-${media.mediaType}-${media.id}`}
                        media={media}
                        compact
                        badge={formatYear(media.releaseDate) ?? undefined}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {isLoading ? (
            <div className="mt-14">
              <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
              </div>
              <p className="mt-4 text-mute">Buscando no catálogo…</p>
            </div>
          ) : null}

          {searched && !isLoading ? (
            <section className="mt-14">
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    {results.length === 0
                      ? 'Nenhum resultado'
                      : `${results.length} resultado${results.length === 1 ? '' : 's'}`}
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    {query.trim()
                      ? `Para “${query.trim()}”`
                      : hasFilters
                        ? 'Com os filtros selecionados'
                        : 'Sugestões do catálogo'}
                  </p>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-surface/50 p-8">
                  <p className="text-mute">
                    Tente outro nome, remova algum filtro ou use um atalho
                    rápido.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-4"
                    onClick={handleClear}
                  >
                    Limpar busca
                  </Button>
                </div>
              ) : (
                <div
                  key={enterKey}
                  className="catalog-enter grid grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:flex-wrap sm:gap-4"
                >
                  {results.map((media) => (
                    <MediaPoster
                      key={`${media.mediaType}-${media.id}`}
                      media={media}
                      fill
                      badge={
                        media.voteAverage
                          ? `★ ${media.voteAverage.toFixed(1)}`
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </RequireAuth>
  )
}
