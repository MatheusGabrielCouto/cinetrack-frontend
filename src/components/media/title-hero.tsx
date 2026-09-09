'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconExternal, IconHeart, IconHeartFill, IconPlay, IconStar } from '@/components/icons'
import { StatusControl } from '@/components/library/status-control'
import { useTitleLibrary } from '@/components/library/title-library-context'
import { TmdbImage } from '@/components/media/tmdb-image'
import { HeroTrailer } from '@/components/media/hero-trailer'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { formatEpisodeCode, regularSeasons } from '@/lib/library/progress'
import { formatRuntime } from '@/lib/tmdb/client'
import { cn, formatRating, formatYear } from '@/lib/utils'
import type { TmdbMediaDetails } from '@/types'

type TitleHeroProps = {
  details: TmdbMediaDetails
  trailerKey?: string | null
  isModalOpen?: boolean
  onPlayTrailer: (() => void) | null
}

const JOB_LABELS: Record<string, string> = {
  Director: 'Direção',
  Screenplay: 'Roteiro',
  Writer: 'Roteiro',
  'Director of Photography': 'Fotografia',
  'Original Music Composer': 'Trilha',
}

const featuredCredits = (details: TmdbMediaDetails) => {
  const rows: Array<{
    label: string
    people: Array<{ id: number; name: string }>
  }> = []

  if (details.createdBy.length) {
    rows.push({
      label: 'Criação',
      people: details.createdBy,
    })
  }

  for (const job of Object.keys(JOB_LABELS)) {
    const people = details.credits.crew.filter((person) => person.job === job)
    if (!people.length) continue
    const label = JOB_LABELS[job]
    if (rows.some((row) => row.label === label)) continue
    rows.push({
      label,
      people: people.map((person) => ({ id: person.id, name: person.name })),
    })
    if (rows.length >= 3) break
  }

  return rows
}

export const TitleHero = ({
  details,
  trailerKey = null,
  isModalOpen = false,
  onPlayTrailer,
}: TitleHeroProps) => {
  const {
    item,
    status,
    isFavorite,
    currentSeason,
    currentEpisode,
    isSaving,
    persist,
    seasons,
  } = useTitleLibrary()

  const [trailerPlaying, setTrailerPlaying] = useState(false)
  const overlayMotion =
    'transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]'

  const credits = featuredCredits(details)
  const year = formatYear(details.releaseDate)
  const continueLabel =
    details.mediaType === 'TV' && currentSeason && currentEpisode
      ? formatEpisodeCode(currentSeason, currentEpisode)
      : null

  const handleFavoriteToggle = () => {
    void persist({ isFavorite: !isFavorite })
  }

  const handleContinue = () => {
    const firstSeason = regularSeasons(seasons)[0]?.seasonNumber ?? 1

    if (status === 'WATCHED') {
      void persist({
        status: 'WATCHING',
        currentSeason: firstSeason,
        currentEpisode: 1,
      })
    } else if (!item || status === 'WANT_TO_WATCH') {
      void persist({
        status: 'WATCHING',
        currentSeason: currentSeason ?? firstSeason,
        currentEpisode: currentEpisode ?? 1,
      })
    }

    document.getElementById('episodios')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMarkWatched = () => {
    void persist({ status: 'WATCHED' })
  }

  return (
    <section className="relative -mt-16 min-h-[88vh] w-full overflow-hidden">
      <TmdbImage
        path={details.backdropPath ?? details.posterPath}
        alt=""
        size="w1280"
        fill
        priority
        sizes="100vw"
        imgClassName="object-cover object-top"
      />
      {trailerKey ? (
        <HeroTrailer
          videoKey={trailerKey}
          isModalOpen={isModalOpen}
          onPlayingChange={setTrailerPlaying}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-bg via-bg/78 to-bg/25" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-bg via-bg/20 to-black/45" />

      <div className="relative z-10 mx-auto flex min-h-[88vh] w-full max-w-[1400px] items-end px-4 pb-10 pt-28 sm:px-8 sm:pb-14">
        <div className="grid w-full items-end gap-8 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
          <div
            className={cn(
              overlayMotion,
              'relative mx-auto hidden aspect-[2/3] w-full max-w-[240px] lg:block',
              trailerPlaying ? 'opacity-[0.58]' : 'opacity-100',
            )}
          >
            <div className="title-hero-in relative h-full overflow-hidden rounded-md bg-surface-2 shadow-[0_28px_70px_rgba(0,0,0,0.62)]">
              <TmdbImage
                path={details.posterPath}
                alt={details.title}
                size="w500"
                fill
                priority
                sizes="260px"
              />
            </div>
          </div>

          <div className="min-w-0 max-w-3xl">
            <div
              className={cn(
                overlayMotion,
                trailerPlaying ? 'opacity-[0.8]' : 'opacity-100',
              )}
            >
              <h1 className="title-hero-in font-display text-[2.6rem] font-bold leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl">
                {details.title}
              </h1>

              {details.tagline ? (
                <p className="title-hero-in-delay mt-4 max-w-xl text-lg italic text-white/75">
                  {details.tagline}
                </p>
              ) : null}

              <div className="title-hero-in-delay mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                  {MEDIA_TYPE_LABELS[details.mediaType]}
                </span>
                {year ? (
                  <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                    {year}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded bg-black/45 px-2.5 py-1 text-sm font-semibold text-spot">
                  <IconStar className="size-3.5" />
                  {formatRating(details.voteAverage)}
                </span>
                {details.mediaType === 'MOVIE' && details.runtime ? (
                  <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                    {formatRuntime(details.runtime)}
                  </span>
                ) : null}
                {details.mediaType === 'TV' ? (
                  <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                    {details.numberOfSeasons} temp. · {details.numberOfEpisodes} eps.
                  </span>
                ) : null}
                {details.genres.slice(0, 4).map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={cn(
                overlayMotion,
                'delay-100 duration-[820ms]',
                trailerPlaying ? 'opacity-[0.18]' : 'opacity-100',
              )}
            >
              <p className="title-hero-copy mt-6 max-w-[62ch] text-base leading-relaxed text-white/88">
                {details.overview || 'Sinopse indisponível.'}
              </p>

              {credits.length ? (
                <dl className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {credits.map((credit) => (
                    <div key={credit.label}>
                      <dt className="text-xs text-white/55">{credit.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-white">
                        {credit.people.map((person, index) => (
                          <span key={`${person.id}-${person.name}`}>
                            {index > 0 ? ', ' : null}
                            <Link
                              href={`/person/${person.id}`}
                              className="transition hover:text-white/80 hover:underline hover:underline-offset-4"
                            >
                              {person.name}
                            </Link>
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            <div
              className={cn(
                overlayMotion,
                'mt-8 flex flex-col gap-4 delay-150',
                trailerPlaying ? 'opacity-[0.8]' : 'opacity-100',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {onPlayTrailer ? (
                  <button
                    type="button"
                    onClick={onPlayTrailer}
                    className="inline-flex items-center gap-2 rounded bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition duration-200 hover:bg-ink/90"
                  >
                    <IconPlay className="size-4" />
                    Trailer
                  </button>
                ) : null}

                {details.mediaType === 'TV' ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-accent-deep disabled:opacity-50"
                  >
                    <IconPlay className="size-4" />
                    {status === 'WATCHING' && continueLabel
                      ? `Continuar ${continueLabel}`
                      : status === 'WATCHED'
                        ? 'Assistir de novo'
                        : 'Começar a assistir'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleMarkWatched}
                    disabled={isSaving || status === 'WATCHED'}
                    className={cn(
                      'rounded px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:opacity-50',
                      status === 'WATCHED'
                        ? 'bg-ok/20 text-ok'
                        : 'bg-accent text-white hover:bg-accent-deep',
                    )}
                  >
                    {status === 'WATCHED' ? 'Assistido' : 'Marcar como assistido'}
                  </button>
                )}

                {details.homepage ? (
                  <a
                    href={details.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
                  >
                    <IconExternal className="size-4" />
                    Site
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  disabled={isSaving}
                  aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                  aria-pressed={isFavorite}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full transition duration-200',
                    isFavorite
                      ? 'bg-accent/20 text-accent'
                      : 'bg-white/12 text-white hover:bg-white/20',
                  )}
                >
                  {isFavorite ? <IconHeartFill /> : <IconHeart />}
                </button>
              </div>

              <StatusControl size="hero" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
