'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MediaRow, MediaRowSkeleton } from '@/components/media/media-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'
import type { MediaType, TmdbMedia } from '@/types'

type ContentFilter = 'ALL' | MediaType

type DayBucket = {
  dateKey: string
  items: TmdbMedia[]
}

const MS_DAY = 86_400_000
const NEAR_TERM_DAYS = 14
const HORIZON_DAYS = 90

const toIsoLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateKey = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`)

const daysUntil = (value: string | null) => {
  if (!value) return null
  const target = parseDateKey(value)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  )
  return Math.round((start.getTime() - today.getTime()) / MS_DAY)
}

const isFutureRelease = (item: TmdbMedia) => {
  const days = daysUntil(item.releaseDate)
  return days !== null && days >= 0
}

const uniqueMedia = (items: TmdbMedia[]) => {
  const seen = new Set<string>()
  const next: TmdbMedia[] = []
  items.forEach((item) => {
    const key = `${item.mediaType}-${item.id}`
    if (seen.has(key)) return
    seen.add(key)
    next.push(item)
  })
  return next
}

const matchesFilter = (item: TmdbMedia, filter: ContentFilter) =>
  filter === 'ALL' || item.mediaType === filter

const formatLongDate = (value: string | null) => {
  if (!value) return 'Data a confirmar'
  return parseDateKey(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
}

const weekdayShort = (dateKey: string) =>
  parseDateKey(dateKey)
    .toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '')

const countdownPhrase = (value: string | null) => {
  const days = daysUntil(value)
  if (days === null) return 'Data a confirmar'
  if (days === 0) return 'Estreia hoje'
  if (days === 1) return 'Estreia amanhã'
  return `Estreia em ${days} dias`
}

const countdownBadge = (value: string | null) => {
  const days = daysUntil(value)
  if (days === null) return 'A confirmar'
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `${days} dias`
}

export default function UpcomingPage() {
  const [filter, setFilter] = useState<ContentFilter>('ALL')
  const [upcoming, setUpcoming] = useState<TmdbMedia[]>([])
  const [airing, setAiring] = useState<TmdbMedia[]>([])
  const [onTheAir, setOnTheAir] = useState<TmdbMedia[]>([])
  const [releases, setReleases] = useState<TmdbMedia[]>([])
  const [nearTerm, setNearTerm] = useState<TmdbMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const today = new Date()
        const in14 = new Date(today)
        in14.setDate(today.getDate() + NEAR_TERM_DAYS)
        const in90 = new Date(today)
        in90.setDate(today.getDate() + HORIZON_DAYS)
        const from = toIsoLocal(today)
        const nearTo = toIsoLocal(in14)
        const to = toIsoLocal(in90)

        const [
          movies,
          todayTv,
          airingTv,
          soonMovies,
          soonSeries,
          nearMovies,
          nearSeries,
        ] = await Promise.all([
          tmdbApi.upcoming(),
          tmdbApi.airingToday(),
          tmdbApi.onTheAir(),
          tmdbApi.discover({
            mediaType: 'MOVIE',
            sortBy: 'popularity.desc',
            primaryReleaseDateGte: from,
            primaryReleaseDateLte: to,
            maxPages: 3,
          }),
          tmdbApi.discover({
            mediaType: 'TV',
            sortBy: 'popularity.desc',
            firstAirDateGte: from,
            firstAirDateLte: to,
            maxPages: 3,
          }),
          tmdbApi.discover({
            mediaType: 'MOVIE',
            sortBy: 'popularity.desc',
            primaryReleaseDateGte: from,
            primaryReleaseDateLte: nearTo,
            maxPages: 2,
          }),
          tmdbApi.discover({
            mediaType: 'TV',
            sortBy: 'popularity.desc',
            firstAirDateGte: from,
            firstAirDateLte: nearTo,
            maxPages: 2,
          }),
        ])

        setUpcoming(movies.filter(isFutureRelease))
        setAiring(todayTv)
        setOnTheAir(airingTv)
        setReleases(
          uniqueMedia([...soonMovies, ...soonSeries]).filter(isFutureRelease),
        )
        setNearTerm(
          uniqueMedia([...nearMovies, ...nearSeries]).filter(isFutureRelease),
        )
      } catch {
        setError('Não foi possível carregar os próximos lançamentos')
        setUpcoming([])
        setAiring([])
        setOnTheAir([])
        setReleases([])
        setNearTerm([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [reloadKey])

  const visibleReleases = useMemo(
    () => releases.filter((item) => matchesFilter(item, filter)),
    [filter, releases],
  )

  const featured = useMemo(() => {
    const withArt = visibleReleases.filter(
      (item) => item.backdropPath || item.posterPath,
    )
    const top = withArt.slice(0, 12)
    return (
      [...top].sort((a, b) => {
        const nextA = daysUntil(a.releaseDate) ?? 99
        const nextB = daysUntil(b.releaseDate) ?? 99
        if (nextA !== nextB) return nextA - nextB
        return b.voteAverage - a.voteAverage
      })[0] ?? null
    )
  }, [visibleReleases])

  const featuredDays = featured ? daysUntil(featured.releaseDate) : null

  const nearTermBuckets = useMemo(() => {
    const buckets = new Map<string, TmdbMedia[]>()

    nearTerm
      .filter((item) => matchesFilter(item, filter))
      .forEach((item) => {
        if (!item.releaseDate) return
        const days = daysUntil(item.releaseDate)
        if (days === null || days > NEAR_TERM_DAYS) return
        const dateKey = item.releaseDate.slice(0, 10)
        const list = buckets.get(dateKey) ?? []
        if (
          list.some(
            (entry) =>
              entry.id === item.id && entry.mediaType === item.mediaType,
          )
        ) {
          return
        }
        list.push(item)
        buckets.set(dateKey, list)
      })

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([dateKey, items]): DayBucket => ({
          dateKey,
          items: items
            .sort((a, b) => b.voteAverage - a.voteAverage)
            .slice(0, 4),
        }),
      )
  }, [filter, nearTerm])

  const anticipated = useMemo(
    () =>
      visibleReleases
        .filter(
          (item) =>
            item.id !== featured?.id || item.mediaType !== featured?.mediaType,
        )
        .slice(0, 8),
    [featured?.id, featured?.mediaType, visibleReleases],
  )

  const movieCount = visibleReleases.filter(
    (item) => item.mediaType === 'MOVIE',
  ).length
  const tvCount = visibleReleases.length - movieCount
  const horizonSummary =
    filter === 'MOVIE'
      ? `${movieCount} filme${movieCount === 1 ? '' : 's'} nos próximos ${HORIZON_DAYS} dias`
      : filter === 'TV'
        ? `${tvCount} série${tvCount === 1 ? '' : 's'} nos próximos ${HORIZON_DAYS} dias`
        : `${movieCount} filme${movieCount === 1 ? '' : 's'} · ${tvCount} série${tvCount === 1 ? '' : 's'} nos próximos ${HORIZON_DAYS} dias`

  const handleRetry = () => {
    setReloadKey((value) => value + 1)
  }

  const handleFilterChange = (value: ContentFilter) => {
    setFilter(value)
  }

  const countdownDisplay =
    featuredDays === null
      ? null
      : featuredDays === 0
        ? 'Hoje'
        : featuredDays === 1
          ? 'Amanhã'
          : String(featuredDays).padStart(2, '0')

  const countdownCaption =
    featuredDays === null || !featured
      ? 'Nos próximos 90 dias'
      : featuredDays === 0
        ? featured.title
        : featuredDays === 1
          ? featured.title
          : `dias até ${featured.title}`

  return (
    <RequireAuth>
      <div className="relative -mt-16 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] overflow-hidden">
          {featured?.backdropPath || featured?.posterPath ? (
            <div className="absolute inset-0 opacity-45">
              <TmdbImage
                path={featured.backdropPath ?? featured.posterPath}
                alt=""
                size="w1280"
                fill
                priority
                sizes="100vw"
                imgClassName="object-cover object-top"
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/50 via-bg/88 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(229,9,20,0.2),_transparent_52%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-mute">Em breve</p>
              {isLoading ? (
                <>
                  <h1 className="mt-1 font-display text-[clamp(3rem,9vw,5.5rem)] font-extrabold leading-[0.9] tracking-tight">
                    Próximas estreias
                  </h1>
                  <p className="mt-4 text-mute">Carregando lançamentos…</p>
                </>
              ) : featured && countdownDisplay ? (
                <>
                  <h1
                    className="mt-1 font-display text-[clamp(4.5rem,14vw,8.5rem)] font-extrabold leading-[0.85] tracking-tight text-accent"
                    aria-label={`${countdownPhrase(featured.releaseDate)}: ${featured.title}`}
                  >
                    {countdownDisplay}
                  </h1>
                  <p className="mt-3 max-w-lg text-lg leading-snug text-ink sm:text-xl">
                    {countdownCaption}
                  </p>
                  <p className="mt-3 text-sm text-mute">{horizonSummary}</p>
                </>
              ) : (
                <>
                  <h1 className="mt-1 font-display text-[clamp(3rem,9vw,5.5rem)] font-extrabold leading-[0.9] tracking-tight">
                    Próximas estreias
                  </h1>
                  <p className="mt-4 max-w-lg text-mute">
                    {visibleReleases.length > 0
                      ? horizonSummary
                      : 'Nenhuma estreia em destaque neste período.'}
                  </p>
                </>
              )}
            </div>

            <Link href="/calendar">
              <Button variant="ghost" size="sm">
                Ver calendário
              </Button>
            </Link>
          </div>

          <div
            className="mt-8 flex gap-6 border-b border-line"
            role="tablist"
            aria-label="Tipo de estreia"
          >
            {(
              [
                { id: 'ALL', label: 'Tudo' },
                { id: 'MOVIE', label: 'Filmes' },
                { id: 'TV', label: 'Séries' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                onClick={() => handleFilterChange(option.id)}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-medium transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  filter === option.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-mute hover:text-ink',
                )}
                aria-selected={filter === option.id}
              >
                {option.label}
              </button>
            ))}
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
            <UpcomingSkeleton />
          ) : (
            <div className="mt-10 space-y-14 catalog-enter">
              {featured ? <FeaturedRelease media={featured} /> : null}

              {nearTermBuckets.length > 0 ? (
                <section aria-label="Estreias nos próximos 14 dias">
                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Próximos 14 dias
                    </h2>
                    <p className="mt-1 text-sm text-mute">
                      O que estreia a partir de hoje
                    </p>
                  </div>

                  <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                    {nearTermBuckets.map((bucket) => (
                      <div
                        key={bucket.dateKey}
                        className="w-[220px] shrink-0 sm:w-[248px]"
                      >
                        <p className="flex items-end gap-2">
                          <span className="font-display text-4xl font-extrabold leading-none tracking-tight">
                            {String(
                              Number(bucket.dateKey.slice(8, 10)),
                            ).padStart(2, '0')}
                          </span>
                          <span className="mb-1 capitalize text-xs text-mute">
                            {weekdayShort(bucket.dateKey)}
                            {daysUntil(bucket.dateKey) === 0 ? ' · hoje' : ''}
                          </span>
                        </p>

                        <ul className="mt-3 space-y-2">
                          {bucket.items.map((item) => (
                            <li key={`${item.mediaType}-${item.id}`}>
                              <Link
                                href={`/title/${item.mediaType.toLowerCase()}/${item.id}`}
                                className="group flex gap-2.5 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90"
                                aria-label={`${item.title}. ${countdownPhrase(item.releaseDate)}`}
                                tabIndex={0}
                              >
                                <span className="relative h-[72px] w-12 shrink-0 overflow-hidden bg-surface-2">
                                  <TmdbImage
                                    path={item.posterPath}
                                    alt=""
                                    size="w185"
                                    fill
                                    sizes="48px"
                                  />
                                </span>
                                <span className="min-w-0 pt-0.5">
                                  <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-white">
                                    {item.title}
                                  </span>
                                  <span
                                    className={cn(
                                      'mt-1 block text-[11px]',
                                      item.mediaType === 'TV'
                                        ? 'text-spot'
                                        : 'text-mute',
                                    )}
                                  >
                                    {MEDIA_TYPE_LABELS[item.mediaType]}
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {anticipated.length > 0 ? (
                <section>
                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Mais aguardados
                    </h2>
                    <p className="mt-1 text-sm text-mute">
                      Populares com estreia nos próximos 90 dias
                    </p>
                  </div>

                  <ul className="grid gap-3 sm:grid-cols-2">
                    {anticipated.map((media) => (
                      <li key={`${media.mediaType}-${media.id}`}>
                        <AnticipatedCard media={media} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!featured &&
              nearTermBuckets.length === 0 &&
              anticipated.length === 0 &&
              !error ? (
                <div className="border border-dashed border-line bg-surface/40 p-8">
                  <h2 className="font-display text-2xl font-semibold">
                    Nada neste filtro
                  </h2>
                  <p className="mt-2 max-w-lg text-mute">
                    Não há estreias para mostrar aqui. Veja o calendário ou
                    troque o filtro.
                  </p>
                  <div className="mt-6">
                    <Link href="/calendar">
                      <Button variant="ghost" size="sm">
                        Abrir calendário
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!isLoading ? (
          <div className="relative mt-14 space-y-8">
            {filter !== 'TV' ? (
              <MediaRow title="Estreias nos cinemas" items={upcoming} />
            ) : null}
            {filter !== 'MOVIE' ? (
              <MediaRow title="No ar nesta semana" items={onTheAir} />
            ) : null}
            {filter !== 'MOVIE' ? (
              <MediaRow title="Episódios hoje" items={airing} />
            ) : null}
          </div>
        ) : (
          <div className="relative mt-14 space-y-8">
            <MediaRowSkeleton />
            <MediaRowSkeleton />
          </div>
        )}
      </div>
    </RequireAuth>
  )
}

const FeaturedRelease = ({ media }: { media: TmdbMedia }) => {
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`
  const days = daysUntil(media.releaseDate)

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${media.title}. ${countdownPhrase(media.releaseDate)}`}
      tabIndex={0}
    >
      <article className="relative aspect-[16/10] sm:aspect-[21/9]">
        <TmdbImage
          path={media.backdropPath ?? media.posterPath}
          alt=""
          size="w1280"
          fill
          priority
          sizes="(max-width: 1400px) 100vw, 1400px"
          imgClassName="transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                'text-[11px] font-semibold',
                media.mediaType === 'TV' ? 'text-spot' : 'text-accent',
              )}
            >
              {MEDIA_TYPE_LABELS[media.mediaType]}
            </span>
            <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
              {countdownBadge(media.releaseDate)}
            </span>
            {days !== null && days > 1 ? (
              <span className="text-mute">{formatLongDate(media.releaseDate)}</span>
            ) : null}
            {media.voteAverage > 0 ? (
              <span className="text-spot">★ {media.voteAverage.toFixed(1)}</span>
            ) : null}
          </div>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-none tracking-tight sm:text-5xl">
            {media.title}
          </h2>
          {media.overview ? (
            <p className="mt-3 max-w-xl line-clamp-2 text-sm leading-relaxed text-ink/85 sm:text-base">
              {media.overview}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  )
}

const AnticipatedCard = ({ media }: { media: TmdbMedia }) => {
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`

  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-md border border-line bg-surface p-3 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${media.title}. ${countdownPhrase(media.releaseDate)}`}
      tabIndex={0}
    >
      <span className="relative h-[120px] w-[80px] shrink-0 overflow-hidden rounded bg-surface-2">
        <TmdbImage
          path={media.posterPath}
          alt=""
          size="w185"
          fill
          sizes="80px"
          imgClassName="transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-[11px] font-semibold',
              media.mediaType === 'TV' ? 'text-spot' : 'text-accent',
            )}
          >
            {MEDIA_TYPE_LABELS[media.mediaType]}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-ink">
            {countdownBadge(media.releaseDate)}
          </span>
        </span>
        <span className="mt-1.5 block font-semibold leading-snug group-hover:text-white">
          {media.title}
        </span>
        <span className="mt-1 block text-sm text-mute">
          {formatLongDate(media.releaseDate)}
          {media.voteAverage > 0 ? ` · ★ ${media.voteAverage.toFixed(1)}` : ''}
        </span>
        <span className="mt-2 line-clamp-2 text-sm text-mute">
          {media.overview || 'Sinopse indisponível.'}
        </span>
      </span>
    </Link>
  )
}

const UpcomingSkeleton = () => {
  return (
    <div className="mt-10 space-y-10" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-surface-2 sm:aspect-[21/9]" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="w-[220px] shrink-0 space-y-3">
            <div className="h-10 w-16 animate-pulse bg-surface-2" />
            <div className="h-[72px] animate-pulse bg-surface-2" />
            <div className="h-[72px] animate-pulse bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[148px] animate-pulse rounded-md bg-surface-2"
          />
        ))}
      </div>
    </div>
  )
}
