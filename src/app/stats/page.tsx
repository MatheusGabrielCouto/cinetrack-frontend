'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
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
    <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
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
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-mute">{item.value}</span>
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
  }, [])

  const favorites = useMemo(
    () => library.filter((item) => item.isFavorite).slice(0, 12),
    [library],
  )

  const topRated = useMemo(
    () =>
      [...library]
        .filter((item) => item.rating !== null)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 8),
    [library],
  )

  const completion = useMemo(() => {
    if (!stats || stats.totalItems === 0) return 0
    return percent(stats.watched, stats.totalItems)
  }, [stats])

  const statusBars = useMemo(() => {
    if (!stats) return []
    const max = Math.max(stats.watched, stats.watching, stats.wantToWatch, 1)

    return [
      {
        label: 'Assistidos',
        value: stats.watched,
        pct: percent(stats.watched, stats.totalItems),
        max,
        color: 'bg-ok',
      },
      {
        label: 'Assistindo',
        value: stats.watching,
        pct: percent(stats.watching, stats.totalItems),
        max,
        color: 'bg-spot',
      },
      {
        label: 'Quero assistir',
        value: stats.wantToWatch,
        pct: percent(stats.wantToWatch, stats.totalItems),
        max,
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
      label: String(index + 1),
      value: 0,
    }))
    library.forEach((item) => {
      if (item.rating === null) return
      buckets[item.rating - 1].value += 1
    })
    return buckets.filter((bucket) => bucket.value > 0)
  }, [library])

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Dashboard
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Estatísticas
            </h1>
            <p className="mt-2 max-w-xl text-mute">
              Gráficos da sua lista: ano, gênero, notas e tempo assistido.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/achievements">
              <Button variant="ghost">Conquistas</Button>
            </Link>
            <Link href="/wrapped">
              <Button variant="ghost">Wrapped</Button>
            </Link>
            <Link href="/library">
              <Button variant="ghost">Ver minha lista</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 text-sm text-accent">{error}</p>
        ) : !stats || stats.totalItems === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">
              Sua lista ainda está vazia
            </h2>
            <p className="mx-auto mt-2 max-w-md text-mute">
              Adicione filmes e séries para ver progresso, notas e favoritos por
              aqui.
            </p>
            <Link href="/discover" className="mt-6 inline-block">
              <Button>Explorar catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-line bg-gradient-to-br from-accent/20 via-surface to-surface p-6">
                <p className="text-sm text-mute">Total na lista</p>
                <p className="mt-3 font-display text-5xl font-bold tracking-tight">
                  {stats.totalItems}
                </p>
                <p className="mt-2 text-sm text-mute">
                  {stats.movies} filmes · {stats.tvShows} séries
                </p>
              </article>

              <article className="rounded-xl border border-line bg-surface p-6">
                <p className="text-sm text-mute">Progresso assistido</p>
                <p className="mt-3 font-display text-5xl font-bold tracking-tight text-ok">
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
                  {stats.watched} de {stats.totalItems} títulos
                </p>
              </article>

              <article className="rounded-xl border border-line bg-surface p-6">
                <p className="text-sm text-mute">Nota média</p>
                <p className="mt-3 font-display text-5xl font-bold tracking-tight text-spot">
                  {formatRating(stats.averageRating)}
                </p>
                <p className="mt-2 text-sm text-mute">
                  {stats.averageRating === null
                    ? 'Ainda sem notas salvas'
                    : 'Média das suas avaliações'}
                </p>
              </article>

              <article className="rounded-xl border border-line bg-surface p-6">
                <p className="text-sm text-mute">Tempo assistido</p>
                <p className="mt-3 font-display text-4xl font-bold tracking-tight text-accent">
                  {formatRuntime(watchTimeMinutes) ?? '0min'}
                </p>
                <p className="mt-2 text-sm text-mute">
                  Estimativa com base no runtime TMDB
                </p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-line bg-surface p-6">
                <h2 className="text-xl font-semibold">Por ano de lançamento</h2>
                <p className="mt-1 text-sm text-mute">Distribuição da sua lista</p>
                <div className="mt-6">
                  <HorizontalBars data={byYear} colorClass="bg-accent" />
                </div>
              </article>

              <article className="rounded-xl border border-line bg-surface p-6">
                <h2 className="text-xl font-semibold">Por gênero</h2>
                <p className="mt-1 text-sm text-mute">Gêneros que mais aparecem</p>
                <div className="mt-6">
                  <HorizontalBars data={byGenre} colorClass="bg-spot" />
                </div>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-line bg-surface p-6">
                <h2 className="text-xl font-semibold">Distribuição de notas</h2>
                <p className="mt-1 text-sm text-mute">Quantas vezes você deu cada nota</p>
                <div className="mt-6">
                  <HorizontalBars data={ratingDistribution} colorClass="bg-ok" />
                </div>
              </article>

              <article className="rounded-xl border border-line bg-surface p-6">
                <h2 className="text-xl font-semibold">Status da lista</h2>
                <p className="mt-1 text-sm text-mute">
                  Como seus títulos estão distribuídos
                </p>
                <div className="mt-6 space-y-5">
                  {statusBars.map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{bar.label}</span>
                        <span className="text-mute">
                          {bar.value} · {bar.pct}%
                        </span>
                      </div>
                      <ProgressBar
                        value={bar.value}
                        max={bar.max}
                        colorClass={bar.color}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-end gap-6">
                  <div className="flex-1">
                    <div className="flex h-28 items-end rounded-lg bg-surface-2 p-3">
                      <div
                        className="w-full rounded-md bg-accent transition-all duration-700"
                        style={{
                          height: `${Math.max(mediaSplit.moviesPct, stats.movies > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold">Filmes</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex h-28 items-end rounded-lg bg-surface-2 p-3">
                      <div
                        className="w-full rounded-md bg-spot transition-all duration-700"
                        style={{
                          height: `${Math.max(mediaSplit.tvPct, stats.tvShows > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold">Séries</p>
                  </div>
                </div>
              </article>
            </section>

            {topRated.length > 0 ? (
              <section className="rounded-xl border border-line bg-surface p-6">
                <h2 className="text-xl font-semibold">Suas melhores notas</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {topRated.map((item, index) => (
                    <Link
                      key={item.id}
                      href={
                        item.media
                          ? `/title/${item.media.mediaType.toLowerCase()}/${item.media.id}`
                          : '/library'
                      }
                      className="rounded-lg border border-line bg-surface-2 p-4 transition hover:border-mute"
                    >
                      <p className="text-xs text-mute">#{index + 1}</p>
                      <p className="mt-1 line-clamp-2 font-semibold">
                        {item.media?.title ?? `TMDB #${item.tmdbId}`}
                      </p>
                      <p className="mt-2 text-sm text-spot">
                        ★ {formatRating(item.rating)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {favorites.length > 0 ? (
              <section>
                <div className="mb-4 px-1">
                  <h2 className="text-xl font-semibold">Favoritos</h2>
                </div>
                <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
                  {favorites.map((item) =>
                    item.media ? (
                      <MediaPoster
                        key={item.id}
                        media={item.media}
                        badge="Favorito"
                        compact
                      />
                    ) : null,
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </RequireAuth>
  )
}
