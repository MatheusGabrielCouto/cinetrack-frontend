'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LandingHero } from '@/components/media/landing-hero'
import {
  MediaRow,
  MediaRowSkeleton,
} from '@/components/media/media-poster'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { tmdbApi } from '@/lib/tmdb/client'
import type { TmdbMedia } from '@/types'

const guestHref = (media: TmdbMedia) =>
  `/register?next=${encodeURIComponent(
    `/title/${media.mediaType.toLowerCase()}/${media.id}`,
  )}`

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [trending, setTrending] = useState<TmdbMedia[]>([])
  const [movies, setMovies] = useState<TmdbMedia[]>([])
  const [series, setSeries] = useState<TmdbMedia[]>([])
  const [nowPlaying, setNowPlaying] = useState<TmdbMedia[]>([])
  const [onTheAir, setOnTheAir] = useState<TmdbMedia[]>([])
  const [topMovies, setTopMovies] = useState<TmdbMedia[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/discover')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const load = async () => {
      try {
        const [
          nextTrending,
          nextMovies,
          nextSeries,
          nextNowPlaying,
          nextOnTheAir,
          nextTopMovies,
        ] = await Promise.all([
          tmdbApi.trending(),
          tmdbApi.popular('MOVIE'),
          tmdbApi.popular('TV'),
          tmdbApi.nowPlaying(),
          tmdbApi.onTheAir(),
          tmdbApi.topRated('MOVIE'),
        ])
        setTrending(nextTrending)
        setMovies(nextMovies)
        setSeries(nextSeries)
        setNowPlaying(nextNowPlaying)
        setOnTheAir(nextOnTheAir)
        setTopMovies(nextTopMovies)
      } catch {
        setTrending([])
        setMovies([])
        setSeries([])
        setNowPlaying([])
        setOnTheAir([])
        setTopMovies([])
      } finally {
        setReady(true)
      }
    }

    void load()
  }, [])

  return (
    <div>
      {ready ? (
        <LandingHero items={trending} />
      ) : (
        <section className="relative -mt-16 min-h-[92vh] overflow-hidden bg-surface sm:min-h-[96vh]">
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </section>
      )}

      <div className="relative z-10 -mt-20 space-y-9 pb-8 sm:-mt-28">
        {ready ? (
          <div className="space-y-9 catalog-enter">
            <MediaRow
              title="Em alta agora"
              items={trending}
              getHref={guestHref}
            />
            <MediaRow
              title="Filmes populares"
              items={movies}
              getHref={guestHref}
            />
            <MediaRow
              title="Séries populares"
              items={series}
              getHref={guestHref}
            />
            <MediaRow
              title="Nos cinemas"
              items={nowPlaying}
              getHref={guestHref}
            />
            <MediaRow
              title="No ar esta semana"
              items={onTheAir}
              getHref={guestHref}
            />
            <MediaRow
              title="Filmes mais bem avaliados"
              items={topMovies}
              getHref={guestHref}
            />
          </div>
        ) : (
          <>
            <MediaRowSkeleton />
            <MediaRowSkeleton />
            <MediaRowSkeleton />
          </>
        )}
      </div>

      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(229,9,20,0.16),_transparent_58%)]" />
        <div className="relative mx-auto max-w-[720px] text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Pronto para começar?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-mute">
            Crie sua conta, salve o que quer ver e acompanhe o que está no meio.
            O catálogo entra na hora.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button variant="primary" size="lg" className="h-12 min-w-[11rem] px-8">
                Criar conta
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
