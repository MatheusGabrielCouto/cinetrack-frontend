'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LandingHero } from '@/components/media/landing-hero'
import {
  MediaRow,
  MediaRowSkeleton,
} from '@/components/media/media-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'
import type { TmdbMedia } from '@/types'

const guestHref = (media: TmdbMedia) =>
  `/title/${media.mediaType.toLowerCase()}/${media.id}`

const LIST_STEPS = [
  {
    title: WATCH_STATUS_LABELS.WANT_TO_WATCH,
    body: 'O que você pretende ver. Entra no calendário quando tiver data de estreia.',
  },
  {
    title: WATCH_STATUS_LABELS.WATCHING,
    body: 'A série parada no meio. Você guarda temporada e episódio.',
  },
  {
    title: WATCH_STATUS_LABELS.WATCHED,
    body: 'O que já passou. Nota e favorito alimentam o Para você.',
  },
]

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

  const pitchPosters = trending.filter((item) => item.posterPath).slice(0, 3)

  return (
    <div>
      {ready ? (
        <LandingHero items={trending} />
      ) : (
        <section className="relative -mt-16 min-h-[88vh] overflow-hidden bg-surface sm:min-h-[90vh]">
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        </section>
      )}

      <section className="relative z-10 -mt-10 px-4 pb-6 sm:-mt-14 sm:px-8">
        <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Três estados. A lista inteira.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-mute">
              Cada título entra com um status. Nada reproduz nesta página. O
              catálogo serve para escolher o que você vai acompanhar.
            </p>
            <ol className="mt-8 divide-y divide-line border-y border-line">
              {LIST_STEPS.map((step) => (
                <li key={step.title} className="py-5">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-mute">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative mx-auto h-[340px] w-full max-w-sm lg:h-[400px] lg:max-w-none">
            {pitchPosters.length > 0 ? (
              pitchPosters.map((media, index) => (
                <Link
                  key={`${media.mediaType}-${media.id}`}
                  href={guestHref(media)}
                  aria-label={`Ficha de ${media.title}`}
                  tabIndex={0}
                  className={cn(
                    'absolute aspect-[2/3] w-[46%] overflow-hidden rounded-md bg-surface-2 shadow-[0_18px_48px_rgba(0,0,0,0.58)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-20 hover:scale-[1.03]',
                    index === 0 &&
                      'left-[4%] top-10 z-[1] -rotate-8 lg:left-[8%] lg:top-12',
                    index === 1 && 'left-[27%] top-0 z-10 lg:left-[30%]',
                    index === 2 &&
                      'right-[4%] top-12 z-[2] rotate-8 lg:right-[8%] lg:top-14',
                  )}
                >
                  <TmdbImage
                    path={media.posterPath}
                    alt=""
                    size="w342"
                    fill
                    sizes="220px"
                  />
                </Link>
              ))
            ) : (
              <div className="absolute inset-8 rounded-md bg-surface-2" />
            )}
          </div>
        </div>
      </section>

      <div className="relative z-10 space-y-4 pb-4 pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Escolha o que entra na lista
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute sm:text-base">
            Ficha, elenco e onde assistir nos streamings. O botão + guarda o
            título. O CineTrack não passa o filme.
          </p>
        </div>

        {ready ? (
          <div className="space-y-9 pt-4 catalog-enter">
            <MediaRow
              title="Em alta no catálogo"
              items={trending}
              getHref={guestHref}
            />
            <MediaRow
              title="Filmes para anotar"
              items={movies}
              getHref={guestHref}
            />
            <MediaRow
              title="Séries para acompanhar"
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

      <section className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(229,9,20,0.16),_transparent_58%)]" />
        <div className="relative mx-auto max-w-[720px] text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Comece pela lista.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-mute">
            Crie a conta, diga os gêneros que você curte e o CineTrack já
            monta o Para você. Lista, calendário e progresso entram depois.
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
