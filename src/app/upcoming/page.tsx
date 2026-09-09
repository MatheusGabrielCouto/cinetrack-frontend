'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MediaRow } from '@/components/media/media-poster'
import { tmdbApi } from '@/lib/tmdb/client'
import type { TmdbMedia } from '@/types'

const formatDate = (value: string | null) => {
  if (!value) return 'Data a confirmar'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function UpcomingPage() {
  const [upcoming, setUpcoming] = useState<TmdbMedia[]>([])
  const [airing, setAiring] = useState<TmdbMedia[]>([])
  const [onTheAir, setOnTheAir] = useState<TmdbMedia[]>([])
  const [anticipated, setAnticipated] = useState<TmdbMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const today = new Date()
        const in90 = new Date(today)
        in90.setDate(today.getDate() + 90)
        const toIso = (date: Date) => date.toISOString().slice(0, 10)

        const [movies, todayTv, airingTv, soonMovies] = await Promise.all([
          tmdbApi.upcoming(),
          tmdbApi.airingToday(),
          tmdbApi.onTheAir(),
          tmdbApi.discover({
            mediaType: 'MOVIE',
            sortBy: 'popularity.desc',
            primaryReleaseDateGte: toIso(today),
            primaryReleaseDateLte: toIso(in90),
          }),
        ])

        setUpcoming(movies)
        setAiring(todayTv)
        setOnTheAir(airingTv)
        setAnticipated(soonMovies)
      } catch {
        setError('Não foi possível carregar os próximos lançamentos')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Em breve
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Upcoming
            </h1>
            <p className="mt-2 max-w-xl text-mute">
              Próximos filmes, novas temporadas no ar e lançamentos aguardados.
            </p>
          </div>
          <Link
            href="/calendar"
            className="text-sm text-mute underline-offset-2 hover:text-ink hover:underline"
          >
            Ver calendário →
          </Link>
        </div>

        {error ? <p className="mt-6 text-sm text-accent">{error}</p> : null}

        {isLoading ? (
          <p className="mt-10 text-mute">Carregando lançamentos…</p>
        ) : (
          <div className="mt-10 space-y-10">
            <section>
              <h2 className="mb-1 text-2xl font-semibold">Filmes aguardados</h2>
              <p className="mb-4 text-sm text-mute">
                Populares com estreia nos próximos 90 dias
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {anticipated.slice(0, 6).map((media) => (
                  <Link
                    key={media.id}
                    href={`/title/movie/${media.id}`}
                    className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition hover:border-mute"
                  >
                    <span className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          media.posterPath
                            ? `https://image.tmdb.org/t/p/w185${media.posterPath}`
                            : undefined
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <div className="min-w-0 py-1">
                      <p className="truncate font-semibold">{media.title}</p>
                      <p className="mt-1 text-sm text-mute">
                        {formatDate(media.releaseDate)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-mute">
                        {media.overview || 'Sinopse indisponível.'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <MediaRow title="Próximos lançamentos" items={upcoming} />
            <MediaRow title="Novas temporadas / no ar" items={onTheAir} />
            <MediaRow title="No ar hoje" items={airing} />
          </div>
        )}
      </div>
    </RequireAuth>
  )
}
