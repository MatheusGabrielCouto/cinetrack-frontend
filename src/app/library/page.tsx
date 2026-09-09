'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { IconClose, IconPlay, IconSearch } from '@/components/icons'
import { LibraryPoster } from '@/components/library/library-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownItem } from '@/components/ui/dropdown'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { formatEpisodeCode } from '@/lib/library/progress'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn, statusLabel } from '@/lib/utils'
import type { LibraryItem, MediaType, TmdbMedia, WatchStatus } from '@/types'

type EnrichedItem = LibraryItem & { media: TmdbMedia | null }
type StatusFilter = WatchStatus | 'ALL'
type MediaFilter = MediaType | 'ALL'
type SortKey = 'recent' | 'added' | 'rating' | 'title' | 'year'

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Tudo' },
  { id: 'WATCHING', label: WATCH_STATUS_LABELS.WATCHING },
  { id: 'WANT_TO_WATCH', label: WATCH_STATUS_LABELS.WANT_TO_WATCH },
  { id: 'WATCHED', label: WATCH_STATUS_LABELS.WATCHED },
]

const TYPE_PILLS: Array<{ id: MediaFilter; label: string }> = [
  { id: 'ALL', label: 'Filmes e séries' },
  { id: 'MOVIE', label: 'Filmes' },
  { id: 'TV', label: 'Séries' },
]

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'recent', label: 'Recentes' },
  { id: 'added', label: 'Adicionados' },
  { id: 'rating', label: 'Minha nota' },
  { id: 'title', label: 'Título' },
  { id: 'year', label: 'Ano' },
]

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

export default function LibraryPage() {
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [mediaType, setMediaType] = useState<MediaFilter>('ALL')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const library = await libraryApi.list()
        const enriched = await Promise.all(
          library.map(async (item) => {
            try {
              const media = await tmdbApi.details(item.mediaType, item.tmdbId)
              return { ...item, media }
            } catch {
              return { ...item, media: null }
            }
          }),
        )
        setItems(enriched)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar a biblioteca',
        )
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [reloadKey])

  const counts = useMemo(() => {
    return {
      total: items.length,
      watching: items.filter((item) => item.status === 'WATCHING').length,
      want: items.filter((item) => item.status === 'WANT_TO_WATCH').length,
      watched: items.filter((item) => item.status === 'WATCHED').length,
      favorites: items.filter((item) => item.isFavorite).length,
      movies: items.filter((item) => item.mediaType === 'MOVIE').length,
      tv: items.filter((item) => item.mediaType === 'TV').length,
    }
  }, [items])

  const tabCount = (id: StatusFilter) => {
    if (id === 'ALL') return counts.total
    if (id === 'WATCHING') return counts.watching
    if (id === 'WANT_TO_WATCH') return counts.want
    return counts.watched
  }

  const normalizedQuery = query.trim().toLowerCase()

  const visibleItems = useMemo(() => {
    const next = items.filter((item) => {
      if (status !== 'ALL' && item.status !== status) return false
      if (mediaType !== 'ALL' && item.mediaType !== mediaType) return false
      if (favoriteOnly && !item.isFavorite) return false
      if (normalizedQuery) {
        const title = item.media?.title.toLowerCase() ?? ''
        if (!title.includes(normalizedQuery)) return false
      }
      return true
    })

    next.sort((left, right) => {
      if (sort === 'added') {
        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        )
      }
      if (sort === 'rating') {
        return (right.rating ?? -1) - (left.rating ?? -1)
      }
      if (sort === 'title') {
        return (left.media?.title ?? '').localeCompare(
          right.media?.title ?? '',
          'pt-BR',
        )
      }
      if (sort === 'year') {
        return (right.media?.releaseDate ?? '').localeCompare(
          left.media?.releaseDate ?? '',
        )
      }
      return (
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime()
      )
    })

    return next
  }, [favoriteOnly, items, mediaType, normalizedQuery, sort, status])

  const continueItems = useMemo(
    () =>
      visibleItems
        .filter((item) => item.status === 'WATCHING' && item.media)
        .slice(0, 12),
    [visibleItems],
  )

  const featured = useMemo(() => {
    const withArt = items.filter(
      (item) => item.media?.backdropPath || item.media?.posterPath,
    )
    const watching = withArt.filter((item) => item.status === 'WATCHING')
    const pool = watching.length > 0 ? watching : withArt
    return (
      [...pool].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0] ?? null
    )
  }, [items])

  const featuredContinue =
    featured?.status === 'WATCHING' && featured.media ? featured : null

  const hasActiveFilters =
    status !== 'ALL' ||
    mediaType !== 'ALL' ||
    favoriteOnly ||
    normalizedQuery.length > 0

  const handleRetry = () => {
    setReloadKey((value) => value + 1)
  }

  const handleClearFilters = () => {
    setStatus('ALL')
    setMediaType('ALL')
    setFavoriteOnly(false)
    setQuery('')
    setSort('recent')
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
  }

  const handleStatusChange = (value: StatusFilter) => {
    setStatus(value)
  }

  const handleMediaTypeChange = (value: MediaFilter) => {
    setMediaType(value)
  }

  const handleFavoriteToggle = () => {
    setFavoriteOnly((value) => !value)
  }

  const handleSortChange = (value: SortKey) => {
    setSort(value)
  }

  const sortLabel =
    SORT_OPTIONS.find((option) => option.id === sort)?.label ?? 'Recentes'

  const summary = isLoading
    ? 'Carregando seus títulos…'
    : items.length === 0
      ? 'Salve um filme ou série para acompanhar daqui.'
      : [
          countLabel(counts.movies, 'filme', 'filmes'),
          countLabel(counts.tv, 'série', 'séries'),
          counts.favorites
            ? countLabel(counts.favorites, 'favorito', 'favoritos')
            : null,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <RequireAuth>
      <div className="relative -mt-16 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          {featured?.media ? (
            <div className="absolute inset-0 opacity-40">
              <TmdbImage
                path={
                  featured.media.backdropPath ?? featured.media.posterPath
                }
                alt=""
                size="w1280"
                fill
                priority
                sizes="100vw"
                imgClassName="object-cover object-top"
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/88 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(229,9,20,0.18),_transparent_52%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(2.75rem,8vw,5rem)] font-extrabold leading-[0.9] tracking-tight">
                Minha lista
              </h1>
              <p className="mt-3 max-w-xl text-mute">{summary}</p>

              {featuredContinue?.media ? (
                <Link
                  href={`/title/${featuredContinue.mediaType.toLowerCase()}/${featuredContinue.tmdbId}`}
                  className="cta-light mt-5 inline-flex h-11 max-w-full items-center gap-2 rounded px-4 text-sm font-semibold transition"
                  aria-label={`Continuar ${featuredContinue.media.title}`}
                  tabIndex={0}
                >
                  <IconPlay className="size-4" />
                  <span className="truncate">
                    Continuar {featuredContinue.media.title}
                    {featuredContinue.mediaType === 'TV' &&
                    featuredContinue.currentSeason &&
                    featuredContinue.currentEpisode
                      ? ` · ${formatEpisodeCode(featuredContinue.currentSeason, featuredContinue.currentEpisode)}`
                      : ''}
                  </span>
                </Link>
              ) : null}
            </div>

            <Link href="/discover">
              <Button variant="ghost">Explorar catálogo</Button>
            </Link>
          </div>

          <div className="sticky top-16 z-30 mt-8 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
            <div className="flex items-center gap-2">
              <label className="relative block min-w-0 flex-1 lg:max-w-md">
                <span className="sr-only">Buscar na lista</span>
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Buscar na lista"
                  autoComplete="off"
                  className="h-11 w-full rounded border border-line bg-surface-2 py-2 pl-10 pr-10 text-sm text-ink placeholder:text-mute/70 transition focus:border-accent [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => handleQueryChange('')}
                    aria-label="Limpar busca"
                    className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-mute hover:text-ink"
                  >
                    <IconClose className="size-4" />
                  </button>
                ) : null}
              </label>

              <Dropdown
                ariaLabel="Ordenar lista"
                align="end"
                triggerClassName="h-11 rounded border border-line bg-surface-2 px-3 text-ink hover:bg-surface"
                trigger={<span>{sortLabel}</span>}
              >
                {SORT_OPTIONS.map((option) => (
                  <DropdownItem
                    key={option.id}
                    active={sort === option.id}
                    onClick={() => handleSortChange(option.id)}
                  >
                    {option.label}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>

            <div
              className="mt-3 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-transparent hide-scrollbar"
              role="tablist"
              aria-label="Status na lista"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  onClick={() => handleStatusChange(tab.id)}
                  className={cn(
                    '-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    status === tab.id
                      ? 'border-accent text-ink'
                      : 'border-transparent text-mute hover:text-ink',
                  )}
                  aria-selected={status === tab.id}
                >
                  {tab.label}
                  <span className="ml-1.5 tabular-nums text-mute">
                    {isLoading ? '–' : tabCount(tab.id)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto overflow-y-hidden hide-scrollbar">
              {TYPE_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleMediaTypeChange(pill.id)}
                  aria-pressed={mediaType === pill.id}
                  className={cn(
                    'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm transition duration-200',
                    mediaType === pill.id
                      ? 'border-ink bg-ink text-black'
                      : 'border-line text-mute hover:text-ink',
                  )}
                >
                  {pill.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleFavoriteToggle}
                aria-pressed={favoriteOnly}
                className={cn(
                  'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm transition duration-200',
                  favoriteOnly
                    ? 'border-spot bg-spot/20 text-ink'
                    : 'border-line text-mute hover:text-ink',
                )}
              >
                Favoritos
                {!isLoading && counts.favorites > 0 ? (
                  <span className="tabular-nums"> · {counts.favorites}</span>
                ) : null}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-8 border border-dashed border-line bg-surface/40 p-6">
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={handleRetry}
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <LibrarySkeleton />
          ) : items.length === 0 ? (
            <div className="mt-12 max-w-lg">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ainda não tem nada por aqui
              </h2>
              <p className="mt-2 text-mute">
                Salve um filme ou série em Início para acompanhar status, nota e
                progresso nesta lista.
              </p>
              <Link href="/discover" className="mt-6 inline-block">
                <Button>Explorar catálogo</Button>
              </Link>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="mt-12 max-w-lg">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Nada combina com esses filtros
              </h2>
              <p className="mt-2 text-mute">
                Tente outro status, tipo ou termo de busca — ou limpe tudo e
                veja a lista inteira.
              </p>
              {hasActiveFilters ? (
                <Button className="mt-6" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 space-y-10 catalog-enter">
              {status === 'ALL' && !normalizedQuery && continueItems.length > 0 ? (
                <ContinueShelf items={continueItems} />
              ) : null}

              <section>
                {status === 'ALL' && !normalizedQuery && continueItems.length > 0 ? (
                  <h2 className="mb-4 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                    Toda a lista
                  </h2>
                ) : null}

                <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {visibleItems.map((item) =>
                    item.media ? (
                      <li key={item.id}>
                        <LibraryPoster item={item} media={item.media} />
                      </li>
                    ) : (
                      <li
                        key={item.id}
                        className="aspect-[2/3] rounded-md border border-line bg-surface-2 p-4 text-sm text-mute"
                      >
                        TMDB #{item.tmdbId}
                        <br />
                        {statusLabel(item.status)}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}

const ContinueShelf = ({ items }: { items: EnrichedItem[] }) => {
  return (
    <section aria-label="Continue assistindo">
      <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
        Continue assistindo
      </h2>
      <p className="mt-1 text-sm text-mute">Retome de onde parou</p>

      <div className="hide-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
        {items.map((item) => {
          if (!item.media) return null
          const href = `/title/${item.mediaType.toLowerCase()}/${item.tmdbId}`
          const progress =
            item.mediaType === 'TV' && item.currentSeason && item.currentEpisode
              ? formatEpisodeCode(item.currentSeason, item.currentEpisode)
              : 'Em andamento'

          return (
            <Link
              key={item.id}
              href={href}
              className="group relative w-[260px] shrink-0 overflow-hidden rounded-md bg-surface transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] sm:w-[300px]"
              aria-label={`Continuar ${item.media.title}${item.mediaType === 'TV' ? ` em ${progress}` : ''}`}
              tabIndex={0}
            >
              <div className="relative aspect-video overflow-hidden bg-surface-2">
                <TmdbImage
                  path={item.media.backdropPath ?? item.media.posterPath}
                  alt=""
                  size="w780"
                  fill
                  sizes="300px"
                  imgClassName="transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-bg">
                    <IconPlay className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {item.media.title}
                    </p>
                    <p className="mt-0.5 text-sm text-white/80">{progress}</p>
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

const LibrarySkeleton = () => {
  return (
    <div className="mt-8 space-y-10" aria-hidden="true">
      <div>
        <div className="h-7 w-48 rounded bg-surface-2" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-video w-[260px] shrink-0 animate-pulse rounded-md bg-surface-2 sm:w-[300px]"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[2/3] animate-pulse rounded-md bg-surface-2" />
            <div className="h-4 w-4/5 rounded bg-surface-2" />
            <div className="h-3 w-1/2 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
