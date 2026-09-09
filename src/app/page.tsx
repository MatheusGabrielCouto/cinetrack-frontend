'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LandingHero } from '@/components/media/landing-hero'
import { MediaRow, MediaRowSkeleton } from '@/components/media/media-poster'
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/discover')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const load = async () => {
      try {
        const [nextTrending, nextMovies, nextSeries] = await Promise.all([
          tmdbApi.trending(),
          tmdbApi.popular('MOVIE'),
          tmdbApi.popular('TV'),
        ])
        setTrending(nextTrending)
        setMovies(nextMovies)
        setSeries(nextSeries)
      } catch {
        setTrending([])
        setMovies([])
        setSeries([])
      } finally {
        setReady(true)
      }
    }

    void load()
  }, [])

  return (
    <div className="pb-0">
      {ready ? (
        <LandingHero items={trending} />
      ) : (
        <section className="relative -mt-16 min-h-[88vh] overflow-hidden bg-surface">
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </section>
      )}

      <div className="relative z-10 -mt-16 space-y-8 pb-6 sm:-mt-20">
        {ready ? (
          <div className="space-y-8 catalog-enter">
            <MediaRow
              title="Em alta nesta semana"
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
          </div>
        ) : (
          <>
            <MediaRowSkeleton />
            <MediaRowSkeleton />
            <MediaRowSkeleton />
          </>
        )}
      </div>

      <section className="border-t border-white/10 px-4 py-16 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Monte a lista. Acompanhe o ritmo.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-mute">
              Salve o que quer ver, marque o que está no meio e registre o que
              já terminou. O catálogo vem na hora; o tracking fica com você.
            </p>
          </div>
          <Link href="/register">
            <Button variant="primary" size="lg">
              Criar conta
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
