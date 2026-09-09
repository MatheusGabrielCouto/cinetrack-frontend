'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MediaPoster } from '@/components/media/media-poster'
import { Button } from '@/components/ui/button'
import { libraryApi, statsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { formatRuntime, tmdbApi } from '@/lib/tmdb/client'
import { cn, formatRating } from '@/lib/utils'
import type { LibraryItem, Stats, TmdbMedia, TmdbMediaDetails } from '@/types'

type EnrichedItem = LibraryItem & {
  media: TmdbMedia | null
  details: TmdbMediaDetails | null
}

const LINKS = [
  { href: '/achievements', label: 'Conquistas' },
  { href: '/wrapped', label: 'Wrapped' },
  { href: '/library', label: 'Minha lista' },
]

const percent = (part: number, total: number) => {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

const ProgressBar = ({
  value,
  max,
  colorClass,
}: {
  value: number
  max: number
  colorClass: string
}) => {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', colorClass)}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

const HorizontalBars = ({
  data,
  colorClass,
}: {
  data: Array<{ label: string; value: number }>
  colorClass: string
}) => {
  const max = Math.max(...data.map((item) => item.value), 1)

  if (!data.length) {
    return <p className="text-sm text-mute">Sem dados suficientes.</p>
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 tabular-nums text-mute">{item.value}</span>
          </div>
          <ProgressBar value={item.value} max={max} colorClass={colorClass} />
        </div>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [library, setLibrary] = useState<EnrichedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [statsData, items] = await Promise.all([
          statsApi.get(),
          libraryApi.list(),
        ])

        setStats(statsData)

        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const details = await tmdbApi.fullDetails(
                item.mediaType,
                item.tmdbId,
              )
              return { ...item, media: details, details }
            } catch {
              try {
                const media = await tmdbApi.details(item.mediaType, item.tmdbId)
                return { ...item, media, details: null }
              } catch {
                return { ...item, media: null, details: null }
              }
            }
          }),
        )

        setLibrary(enriched)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as estatísticas',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [reloadKey])

  const favorites = useMemo(
    () => library.filter((item) => item.isFavorite).slice(0, 12),
    [library],
  )

  const topRated = useMemo(
    () =>
      [...library]
        .filter((item) => item.rating !== null && item.media)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 10),
    [library],
  )

  const heroMedia = useMemo(() => {
    return (
      favorites.find((item) => item.media)?.media ??
      topRated[0]?.media ??
      library.find((item) => item.media)?.media ??
      null
    )
  }, [favorites, library, topRated])

  const completion = useMemo(() => {
    if (!stats || stats.totalItems === 0) return 0
    return percent(stats.watched, stats.totalItems)
  }, [stats])

  const statusBars = useMemo(() => {
    if (!stats) return []

    return [
      {
        label: 'Assistidos',
        value: stats.watched,
        pct: percent(stats.watched, stats.totalItems),
        color: 'bg-ok',
      },
      {
        label: 'Assistindo',
        value: stats.watching,
        pct: percent(stats.watching, stats.totalItems),
        color: 'bg-spot',
      },
      {
        label: 'Quero assistir',
        value: stats.wantToWatch,
        pct: percent(stats.wantToWatch, stats.totalItems),
        color: 'bg-accent',
      },
    ]
  }, [stats])

  const mediaSplit = useMemo(() => {
    if (!stats || stats.totalItems === 0) {
      return { moviesPct: 0, tvPct: 0 }
    }

    return {
      moviesPct: percent(stats.movies, stats.totalItems),
      tvPct: percent(stats.tvShows, stats.totalItems),
    }
  }, [stats])

  const byYear = useMemo(() => {
    const counts = new Map<string, number>()
    library.forEach((item) => {
      const year = item.media?.releaseDate?.slice(0, 4)
      if (!year) return
      counts.set(year, (counts.get(year) ?? 0) + 1)
    })
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.label.localeCompare(a.label))
      .slice(0, 8)
  }, [library])

  const byGenre = useMemo(() => {
    const counts = new Map<string, number>()
    library.forEach((item) => {
      item.details?.genres.forEach((genre) => {
        counts.set(genre.name, (counts.get(genre.name) ?? 0) + 1)
      })
    })
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [library])

  const watchTimeMinutes = useMemo(() => {
    return library.reduce((total, item) => {
      if (item.status !== 'WATCHED' && item.status !== 'WATCHING') return total
      if (item.mediaType === 'MOVIE') {
        return total + (item.details?.runtime ?? 0)
      }
      const epRuntime = item.details?.episodeRunTime[0] ?? 45
      if (item.status === 'WATCHING') {
        const season = item.currentSeason ?? 1
        const episode = item.currentEpisode ?? 1
        return total + epRuntime * Math.max(episode + (season - 1) * 10, 1)
      }
      return total + epRuntime * Math.min(item.details?.numberOfEpisodes ?? 10, 24)
    }, 0)
  }, [library])

  const ratingDistribution = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, index) => ({
      label: `${index + 1}`,
      value: 0,
    }))
    library.forEach((item) => {
      if (item.rating === null) return
      buckets[item.rating - 1].value += 1
    })
    return buckets.filter((bucket) => bucket.value > 0)
  }, [library])

  const summary = stats
    ? [
        `${stats.totalItems} ${stats.totalItems === 1 ? 'título' : 'títulos'}`,
        `${completion}% assistido`,
        formatRuntime(watchTimeMinutes),
        byGenre[0] ? byGenre[0].label : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Gráficos da sua lista: ano, gênero, notas e tempo assistido.'

  const handleRetry = () => {
    setReloadKey((value) => value + 1)
  }

  return (
    <RequireAuth>
      <div className="relative -mt-16 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          {heroMedia ? (
            <div className="absolute inset-0 opacity-40">
              <TmdbImage
                path={heroMedia.backdropPath ?? heroMedia.posterPath}
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(229,9,20,0.18),_transparent_52%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-8">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2.35rem,10vw,5rem)] font-extrabold leading-[0.9] tracking-tight">
              Estatísticas
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-mute">
              {isLoading ? 'Carregando a sua lista…' : summary}
            </p>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 hide-scrollbar">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line px-4 text-sm text-mute transition hover:border-mute hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-10 space-y-8">
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 min-w-[200px] flex-1 animate-pulse rounded-lg bg-surface-2"
                  />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-lg bg-surface-2" />
            </div>
          ) : error ? (
            <div className="mt-10 border border-dashed border-line bg-surface/40 p-6">
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
          ) : !stats || stats.totalItems === 0 ? (
            <div className="mt-10 border border-dashed border-line bg-surface/40 px-6 py-14 text-center">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Sua lista ainda está vazia
              </h2>
              <p className="mx-auto mt-3 max-w-md text-mute">
                Adicione filmes e séries para ver progresso, notas e favoritos
                por aqui.
              </p>
              <Link href="/discover" className="mt-6 inline-block">
                <Button>Explorar catálogo</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              <section
                className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4"
                aria-label="Resumo"
              >
                <article className="min-w-[210px] shrink-0 rounded-lg bg-surface p-5 sm:min-w-0">
                  <p className="text-sm text-mute">Na lista</p>
                  <p className="mt-3 font-display text-5xl font-extrabold tracking-tight">
                    {stats.totalItems}
                  </p>
                  <p className="mt-2 text-sm text-mute">
                    {stats.movies} filmes · {stats.tvShows} séries
                  </p>
                </article>

                <article className="min-w-[210px] shrink-0 rounded-lg bg-surface p-5 sm:min-w-0">
                  <p className="text-sm text-mute">Assistido</p>
                  <p className="mt-3 font-display text-5xl font-extrabold tracking-tight text-ok">
                    {completion}%
                  </p>
                  <div className="mt-4">
                    <ProgressBar
                      value={stats.watched}
                      max={stats.totalItems}
                      colorClass="bg-ok"
                    />
                  </div>
                  <p className="mt-2 text-sm text-mute">
                    {stats.watched} de {stats.totalItems}
                  </p>
                </article>

                <article className="min-w-[210px] shrink-0 rounded-lg bg-surface p-5 sm:min-w-0">
                  <p className="text-sm text-mute">Nota média</p>
                  <p className="mt-3 font-display text-5xl font-extrabold tracking-tight text-spot">
                    {formatRating(stats.averageRating)}
                  </p>
                  <p className="mt-2 text-sm text-mute">
                    {stats.averageRating === null
                      ? 'Ainda sem notas'
                      : 'Das suas avaliações'}
                  </p>
                </article>

                <article className="min-w-[210px] shrink-0 rounded-lg bg-surface p-5 sm:min-w-0">
                  <p className="text-sm text-mute">Tempo</p>
                  <p className="mt-3 font-display text-4xl font-extrabold tracking-tight text-accent sm:text-5xl">
                    {formatRuntime(watchTimeMinutes) ?? '0min'}
                  </p>
                  <p className="mt-2 text-sm text-mute">Estimativa TMDB</p>
                </article>
              </section>

              <section className="grid gap-10 lg:grid-cols-2">
                <article>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Status da lista
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    Como seus títulos estão agora
                  </p>

                  <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10">
                    {statusBars.map((bar) =>
                      bar.pct > 0 ? (
                        <div
                          key={bar.label}
                          className={cn('h-full', bar.color)}
                          style={{ width: `${bar.pct}%` }}
                          title={`${bar.label}: ${bar.pct}%`}
                        />
                      ) : null,
                    )}
                  </div>

                  <ul className="mt-5 space-y-3">
                    {statusBars.map((bar) => (
                      <li
                        key={bar.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn('size-2.5 rounded-full', bar.color)}
                          />
                          {bar.label}
                        </span>
                        <span className="tabular-nums text-mute">
                          {bar.value} · {bar.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-mute">
                      Filmes e séries
                    </h3>
                    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
                      {mediaSplit.moviesPct > 0 ? (
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${mediaSplit.moviesPct}%` }}
                        />
                      ) : null}
                      {mediaSplit.tvPct > 0 ? (
                        <div
                          className="h-full bg-spot"
                          style={{ width: `${mediaSplit.tvPct}%` }}
                        />
                      ) : null}
                    </div>
                    <div className="mt-3 flex gap-5 text-sm text-mute">
                      <span>
                        <span className="text-ink">{stats.movies}</span> filmes
                        · {mediaSplit.moviesPct}%
                      </span>
                      <span>
                        <span className="text-ink">{stats.tvShows}</span> séries
                        · {mediaSplit.tvPct}%
                      </span>
                    </div>
                  </div>
                </article>

                <article>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Distribuição de notas
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    Quantas vezes você deu cada nota
                  </p>
                  <div className="mt-6">
                    <HorizontalBars
                      data={ratingDistribution}
                      colorClass="bg-ok"
                    />
                  </div>
                </article>
              </section>

              <section className="grid gap-10 lg:grid-cols-2">
                <article>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Por ano
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    Lançamento dos títulos na lista
                  </p>
                  <div className="mt-6">
                    <HorizontalBars data={byYear} colorClass="bg-accent" />
                  </div>
                </article>

                <article>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Por gênero
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    O que mais aparece na sua lista
                  </p>
                  <div className="mt-6">
                    <HorizontalBars data={byGenre} colorClass="bg-spot" />
                  </div>
                </article>
              </section>

              {topRated.length > 0 ? (
                <section>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Suas melhores notas
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    Os títulos que você mais curtiu
                  </p>
                  <div className="hide-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                    {topRated.map((item) =>
                      item.media ? (
                        <MediaPoster
                          key={item.id}
                          media={item.media}
                          compact
                          badge={`★ ${formatRating(item.rating)}`}
                        />
                      ) : null,
                    )}
                  </div>
                </section>
              ) : null}

              {favorites.length > 0 ? (
                <section>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Favoritos
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    {stats.favorites}{' '}
                    {stats.favorites === 1 ? 'título salvo' : 'títulos salvos'}
                  </p>
                  <div className="hide-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                    {favorites.map((item) =>
                      item.media ? (
                        <MediaPoster
                          key={item.id}
                          media={item.media}
                          compact
                          badge="Favorito"
                        />
                      ) : null,
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}
