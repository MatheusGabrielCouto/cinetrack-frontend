'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { formatRuntime, tmdbApi } from '@/lib/tmdb/client'
import { cn, formatRating } from '@/lib/utils'
import type { LibraryItem, TmdbMediaDetails } from '@/types'

type Enriched = LibraryItem & { details: TmdbMediaDetails | null }

type SlideId =
  | 'intro'
  | 'counts'
  | 'time'
  | 'genre'
  | 'director'
  | 'rating'
  | 'marathon'
  | 'tops'
  | 'outro'

const SLIDE_ORDER: SlideId[] = [
  'intro',
  'counts',
  'time',
  'genre',
  'director',
  'rating',
  'marathon',
  'tops',
  'outro',
]

const useCountUp = (target: number, active: boolean, durationMs = 900) => {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }

    if (target <= 0) {
      setValue(0)
      return
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setValue(target)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, durationMs, target])

  return value
}

const PosterStack = ({
  posters,
  className,
}: {
  posters: Array<string | null>
  className?: string
}) => {
  const visible = posters.filter(Boolean).slice(0, 5)

  if (!visible.length) return null

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#050505_72%)]" />
      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-40 blur-[1px] sm:gap-5">
        {visible.map((path, index) => (
          <div
            key={`${path}-${index}`}
            className="relative h-[48vh] w-[28vw] max-w-[180px] shrink-0 overflow-hidden rounded-md shadow-2xl sm:max-w-[220px]"
            style={{
              transform: `rotate(${(index - 2) * 6}deg) translateY(${Math.abs(index - 2) * 12}px)`,
            }}
          >
            <TmdbImage path={path} alt="" size="w500" fill sizes="220px" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-bg" />
    </div>
  )
}

const SlideShell = ({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'spot' | 'ok'
  className?: string
}) => {
  const wash =
    tone === 'accent'
      ? 'from-accent/35 via-black/40 to-bg'
      : tone === 'spot'
        ? 'from-spot/25 via-black/45 to-bg'
        : tone === 'ok'
          ? 'from-ok/20 via-black/45 to-bg'
          : 'from-white/5 via-black/50 to-bg'

  return (
    <div
      className={cn(
        'relative flex min-h-[calc(100vh-8rem)] flex-col justify-center px-4 py-10 sm:px-8',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-b',
          wash,
        )}
      />
      <div className="relative mx-auto w-full max-w-3xl animate-rise">{children}</div>
    </div>
  )
}

export default function WrappedPage() {
  const year = new Date().getFullYear()
  const [items, setItems] = useState<Enriched[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const library = await libraryApi.list({ status: 'WATCHED' })
        const inYear = library.filter((item) => {
          const date = item.watchedAt ?? item.updatedAt
          return new Date(date).getFullYear() === year
        })

        const enriched = await Promise.all(
          inYear.map(async (item) => {
            try {
              const details = await tmdbApi.fullDetails(
                item.mediaType,
                item.tmdbId,
              )
              return { ...item, details }
            } catch {
              return { ...item, details: null }
            }
          }),
        )

        setItems(enriched)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível gerar seu Wrapped',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [year])

  const summary = useMemo(() => {
    const movies = items.filter((item) => item.mediaType === 'MOVIE')
    const shows = items.filter((item) => item.mediaType === 'TV')
    const posters = items
      .map((item) => item.details?.posterPath ?? null)
      .filter(Boolean)

    const genreCount = new Map<string, number>()
    const directorCount = new Map<string, number>()
    let totalMinutes = 0
    let ratingSum = 0
    let ratingCount = 0
    let marathonTitle = ''
    let marathonMinutes = -1
    let marathonPoster: string | null = null

    items.forEach((item) => {
      if (item.rating !== null) {
        ratingSum += item.rating
        ratingCount += 1
      }

      item.details?.genres.forEach((genre) => {
        genreCount.set(genre.name, (genreCount.get(genre.name) ?? 0) + 1)
      })

      const directors =
        item.details?.credits.crew.filter((person) =>
          ['Director', 'Diretor'].includes(person.job),
        ) ?? []

      directors.forEach((person) => {
        directorCount.set(
          person.name,
          (directorCount.get(person.name) ?? 0) + 1,
        )
      })

      let minutes = 0
      if (item.mediaType === 'MOVIE') {
        minutes = item.details?.runtime ?? 0
      } else {
        const epRuntime = item.details?.episodeRunTime[0] ?? 45
        const episodes = item.details?.numberOfEpisodes ?? 10
        minutes = epRuntime * Math.min(episodes, 24)
      }

      totalMinutes += minutes

      if (minutes > marathonMinutes) {
        marathonMinutes = minutes
        marathonTitle = item.details?.title ?? `TMDB #${item.tmdbId}`
        marathonPoster = item.details?.posterPath ?? null
      }
    })

    const topGenres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const topDirector = [...directorCount.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]

    const topRated = [...items]
      .filter((item) => item.rating !== null && item.details)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)

    const daysOnCouch = Math.max(1, Math.round(totalMinutes / (60 * 24)))

    return {
      movies: movies.length,
      shows: shows.length,
      total: items.length,
      posters,
      topGenre: topGenres[0]?.[0] ?? '—',
      topGenreCount: topGenres[0]?.[1] ?? 0,
      topGenres,
      topDirector: topDirector?.[0] ?? '—',
      topDirectorCount: topDirector?.[1] ?? 0,
      averageRating:
        ratingCount > 0
          ? Math.round((ratingSum / ratingCount) * 10) / 10
          : null,
      ratingCount,
      watchTime: formatRuntime(totalMinutes) ?? '0min',
      totalMinutes,
      daysOnCouch,
      marathonTitle: marathonMinutes >= 0 ? marathonTitle : null,
      marathonMinutes: marathonMinutes >= 0 ? marathonMinutes : null,
      marathonPoster,
      topRated,
    }
  }, [items])

  const slides = useMemo(() => {
    if (summary.total === 0) return ['intro'] as SlideId[]
    return SLIDE_ORDER.filter((id) => {
      if (id === 'director' && summary.topDirector === '—') return false
      if (id === 'rating' && summary.averageRating === null) return false
      if (id === 'marathon' && !summary.marathonTitle) return false
      if (id === 'tops' && summary.topRated.length === 0) return false
      return true
    })
  }, [summary])

  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)] ?? 'intro'

  const handlePrev = useCallback(() => {
    setSlideIndex((index) => Math.max(0, index - 1))
  }, [])

  const handleNext = useCallback(() => {
    setSlideIndex((index) => Math.min(slides.length - 1, index + 1))
  }, [slides.length])

  useEffect(() => {
    setSlideIndex(0)
  }, [slides.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        handleNext()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  const moviesCount = useCountUp(summary.movies, currentSlide === 'counts')
  const showsCount = useCountUp(summary.shows, currentSlide === 'counts')
  const totalCount = useCountUp(summary.total, currentSlide === 'intro' && summary.total > 0)

  return (
    <RequireAuth>
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-bg">
        <PosterStack posters={summary.posters} />

        {isLoading ? (
          <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
            <div className="text-center">
              <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
              </div>
              <p className="mt-6 font-display text-2xl font-bold">
                Revelando seu {year}…
              </p>
              <p className="mt-2 text-mute">Montando cenas, notas e maratonas</p>
            </div>
          </div>
        ) : error ? (
          <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
            <p className="text-accent">{error}</p>
          </div>
        ) : summary.total === 0 ? (
          <SlideShell>
            <p className="text-sm font-semibold tracking-[0.2em] text-accent">
              CINETRACK WRAPPED
            </p>
            <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
              Ainda sem sessões
              <br />
              em {year}
            </h1>
            <p className="mt-5 max-w-md text-lg text-mute">
              Marque títulos como assistidos e volte aqui — o Wrapped ganha vida
              com a sua lista.
            </p>
            <Link href="/discover" className="mt-8 inline-block">
              <Button size="lg">Explorar catálogo</Button>
            </Link>
          </SlideShell>
        ) : (
          <>
            <div key={currentSlide}>
              {currentSlide === 'intro' ? (
                <SlideShell tone="accent">
                  <p className="text-sm font-semibold tracking-[0.22em] text-accent">
                    CINETRACK WRAPPED · {year}
                  </p>
                  <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
                    Seu ano
                    <br />
                    em tela
                  </h1>
                  <p className="mt-6 max-w-lg text-lg text-mute sm:text-xl">
                    Você fechou{' '}
                    <span className="font-semibold text-ink">{totalCount}</span>{' '}
                    {totalCount === 1 ? 'título' : 'títulos'} em {year}. Vamos
                    rever a temporada.
                  </p>
                </SlideShell>
              ) : null}

              {currentSlide === 'counts' ? (
                <SlideShell>
                  <p className="text-sm text-mute">Você assistiu</p>
                  <div className="mt-8 grid gap-10 sm:grid-cols-2">
                    <div>
                      <p className="font-display text-7xl font-extrabold tracking-tight sm:text-8xl">
                        {moviesCount}
                      </p>
                      <p className="mt-2 text-xl text-mute">filmes</p>
                    </div>
                    <div>
                      <p className="font-display text-7xl font-extrabold tracking-tight text-accent sm:text-8xl">
                        {showsCount}
                      </p>
                      <p className="mt-2 text-xl text-mute">séries</p>
                    </div>
                  </div>
                </SlideShell>
              ) : null}

              {currentSlide === 'time' ? (
                <SlideShell tone="spot">
                  <p className="text-sm text-mute">Tempo de tela estimado</p>
                  <p className="mt-4 font-display text-6xl font-extrabold tracking-tight text-spot sm:text-8xl">
                    {summary.watchTime}
                  </p>
                  <p className="mt-6 max-w-md text-lg text-mute">
                    Isso dá cerca de{' '}
                    <span className="font-semibold text-ink">
                      {summary.daysOnCouch}{' '}
                      {summary.daysOnCouch === 1 ? 'dia' : 'dias'}
                    </span>{' '}
                    seguidos no sofá — sem pausa para pipoca.
                  </p>
                </SlideShell>
              ) : null}

              {currentSlide === 'genre' ? (
                <SlideShell tone="accent">
                  <p className="text-sm text-mute">Gênero favorito</p>
                  <h2 className="mt-4 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
                    {summary.topGenre}
                  </h2>
                  <p className="mt-4 text-lg text-mute">
                    Apareceu em {summary.topGenreCount}{' '}
                    {summary.topGenreCount === 1 ? 'título' : 'títulos'}
                  </p>
                  {summary.topGenres.length > 1 ? (
                    <ul className="mt-10 flex flex-wrap gap-2">
                      {summary.topGenres.map(([name, count], index) => (
                        <li
                          key={name}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm',
                            index === 0
                              ? 'border-accent bg-accent/20 text-ink'
                              : 'border-white/15 text-mute',
                          )}
                        >
                          {name} · {count}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SlideShell>
              ) : null}

              {currentSlide === 'director' ? (
                <SlideShell>
                  <p className="text-sm text-mute">Diretor favorito</p>
                  <h2 className="mt-4 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
                    {summary.topDirector}
                  </h2>
                  <p className="mt-5 max-w-md text-lg text-mute">
                    Assinou {summary.topDirectorCount}{' '}
                    {summary.topDirectorCount === 1
                      ? 'trabalho'
                      : 'trabalhos'}{' '}
                    na sua lista deste ano.
                  </p>
                </SlideShell>
              ) : null}

              {currentSlide === 'rating' ? (
                <SlideShell tone="spot">
                  <p className="text-sm text-mute">Sua nota média</p>
                  <p className="mt-4 font-display text-8xl font-extrabold tracking-tight text-spot sm:text-9xl">
                    {formatRating(summary.averageRating)}
                  </p>
                  <p className="mt-6 text-lg text-mute">
                    Em {summary.ratingCount}{' '}
                    {summary.ratingCount === 1 ? 'avaliação' : 'avaliações'} —
                    critério afiado.
                  </p>
                </SlideShell>
              ) : null}

              {currentSlide === 'marathon' && summary.marathonTitle ? (
                <SlideShell tone="accent">
                  <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
                    {summary.marathonPoster ? (
                      <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:mx-0 sm:w-48">
                        <TmdbImage
                          path={summary.marathonPoster}
                          alt={summary.marathonTitle}
                          size="w500"
                          fill
                          sizes="192px"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold tracking-[0.18em] text-accent">
                        MAIOR MARATONA
                      </p>
                      <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
                        {summary.marathonTitle}
                      </h2>
                      <p className="mt-4 text-lg text-mute">
                        ~{formatRuntime(summary.marathonMinutes)} de imersão
                      </p>
                    </div>
                  </div>
                </SlideShell>
              ) : null}

              {currentSlide === 'tops' ? (
                <SlideShell>
                  <p className="text-sm text-mute">Suas notas mais altas</p>
                  <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                    O top da temporada
                  </h2>
                  <ol className="mt-8 space-y-3">
                    {summary.topRated.map((item, index) => (
                      <li key={item.id}>
                        <Link
                          href={`/title/${item.mediaType.toLowerCase()}/${item.tmdbId}`}
                          className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/35 p-3 transition hover:border-white/25 hover:bg-black/50"
                        >
                          <span className="w-8 font-display text-2xl font-bold text-mute">
                            {index + 1}
                          </span>
                          <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-2">
                            <TmdbImage
                              path={item.details?.posterPath}
                              alt=""
                              size="w185"
                              fill
                              sizes="44px"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                              {item.details?.title}
                            </span>
                            <span className="text-sm text-mute">
                              {item.mediaType === 'TV' ? 'Série' : 'Filme'}
                            </span>
                          </span>
                          <span className="shrink-0 font-display text-xl font-bold text-spot">
                            {formatRating(item.rating)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </SlideShell>
              ) : null}

              {currentSlide === 'outro' ? (
                <SlideShell tone="accent">
                  <p className="text-sm font-semibold tracking-[0.22em] text-accent">
                    FIM DA TEMPORADA · {year}
                  </p>
                  <h2 className="mt-5 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
                    Até a próxima
                    <br />
                    sessão
                  </h2>
                  <p className="mt-5 max-w-md text-lg text-mute">
                    {summary.total} títulos, {summary.watchTime} de tela e um
                    gosto claro por {summary.topGenre}.
                  </p>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <Link href="/stats">
                      <Button size="lg">Ver estatísticas</Button>
                    </Link>
                    <Link href="/discover">
                      <Button size="lg" variant="ghost">
                        Continuar explorando
                      </Button>
                    </Link>
                  </div>
                </SlideShell>
              ) : null}
            </div>

            <div className="sticky bottom-0 z-20 border-t border-white/10 bg-bg/85 px-4 py-4 backdrop-blur-md sm:px-8">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={slideIndex === 0}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-30"
                  aria-label="Slide anterior"
                >
                  Anterior
                </button>

                <div
                  className="flex items-center gap-1.5"
                  role="tablist"
                  aria-label="Progresso do Wrapped"
                >
                  {slides.map((slide, index) => (
                    <button
                      key={slide}
                      type="button"
                      role="tab"
                      aria-selected={index === slideIndex}
                      aria-label={`Ir para slide ${index + 1}`}
                      onClick={() => setSlideIndex(index)}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        index === slideIndex
                          ? 'w-8 bg-accent'
                          : 'w-2 bg-white/25 hover:bg-white/45',
                      )}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={slideIndex >= slides.length - 1}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-30"
                  aria-label="Próximo slide"
                >
                  {slideIndex >= slides.length - 1 ? 'Fim' : 'Próximo'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  )
}
