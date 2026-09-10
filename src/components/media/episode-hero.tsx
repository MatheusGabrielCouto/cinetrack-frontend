'use client'

import Link from 'next/link'
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlay, IconStar } from '@/components/icons'
import { TmdbImage } from '@/components/media/tmdb-image'
import { useTitleLibrary } from '@/components/library/title-library-context'
import {
  episodeMark,
  episodePath,
  formatEpisodeCode,
  previousEpisode,
  nextEpisode,
} from '@/lib/library/progress'
import { formatRuntime } from '@/lib/tmdb/client'
import { cn, formatRating } from '@/lib/utils'
import type { TmdbEpisodeDetails, TmdbMediaDetails } from '@/types'

type EpisodeHeroProps = {
  show: TmdbMediaDetails
  episode: TmdbEpisodeDetails
}

const formatDate = (value: string | null) => {
  if (!value) return null
  return new Date(value).toLocaleDateString('pt-BR')
}

export const EpisodeHero = ({ show, episode }: EpisodeHeroProps) => {
  const {
    item,
    status,
    currentSeason,
    currentEpisode,
    isSaving,
    markEpisodeWatched,
    continueFromEpisode,
    rewindToEpisode,
  } = useTitleLibrary()

  const mark = episodeMark({
    status: item ? status : null,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    currentSeason,
    currentEpisode,
  })

  const previous = previousEpisode(
    show.seasons,
    episode.seasonNumber,
    episode.episodeNumber,
  )
  const next = nextEpisode(
    show.seasons,
    episode.seasonNumber,
    episode.episodeNumber,
  )
  const airDate = formatDate(episode.airDate)
  const showHref = `/title/tv/${show.id}`

  const handlePrimary = () => {
    if (mark === 'watched') {
      void rewindToEpisode(episode.seasonNumber, episode.episodeNumber)
      return
    }
    if (mark === 'current') {
      void markEpisodeWatched(episode.seasonNumber, episode.episodeNumber)
      return
    }
    void continueFromEpisode(episode.seasonNumber, episode.episodeNumber)
  }

  return (
    <section className="relative w-full sm:-mt-16">
      <div className="relative sm:min-h-[72vh]">
        <div className="relative aspect-video w-full overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
          <TmdbImage
            path={episode.stillPath ?? show.backdropPath}
            alt=""
            size="w1280"
            fill
            priority
            sizes="100vw"
            imgClassName="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-bg via-bg/20 to-black/35 sm:hidden" />
          <div className="pointer-events-none absolute inset-0 z-[2] hidden bg-gradient-to-r from-bg via-bg/70 to-bg/20 sm:block" />
          <div className="pointer-events-none absolute inset-0 z-[2] hidden bg-gradient-to-t from-bg via-bg/25 to-black/45 sm:block" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col justify-end px-4 pb-10 pt-5 sm:min-h-[72vh] sm:px-8 sm:pb-14 sm:pt-28">
          <Link
            href={`${showHref}#episodios`}
            className="title-hero-in w-fit text-sm font-semibold text-white/70 transition hover:text-white"
            aria-label={`Voltar para os episódios de ${show.title}`}
            tabIndex={0}
          >
            ← {show.title}
          </Link>

          <p className="title-hero-in mt-4 text-sm font-semibold tracking-wide text-accent">
            {formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)}
          </p>

          <h1 className="title-hero-in mt-2 max-w-4xl font-display text-[2.15rem] font-bold leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl">
            {episode.name}
          </h1>

          <div className="title-hero-in-delay mt-5 flex flex-wrap items-center gap-2">
            {airDate ? (
              <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                {airDate}
              </span>
            ) : null}
            {episode.runtime ? (
              <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                {formatRuntime(episode.runtime)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded bg-black/45 px-2.5 py-1 text-sm font-semibold text-spot">
              <IconStar className="size-3.5" />
              {formatRating(episode.voteAverage)}
            </span>
          </div>

          <p className="title-hero-copy mt-6 max-w-[62ch] text-base leading-relaxed text-white/88">
            {episode.overview || 'Sinopse indisponível.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePrimary}
              className={cn(
                'inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:opacity-50',
                mark === 'current'
                  ? 'bg-ink text-bg hover:bg-ink/90'
                  : 'bg-accent text-white hover:bg-accent-deep',
              )}
            >
              {mark === 'watched' ? (
                <IconCheck className="size-4" />
              ) : (
                <IconPlay className="size-4" />
              )}
              {mark === 'watched'
                ? 'Rever daqui'
                : mark === 'current'
                  ? 'Marcar como visto'
                  : 'Continuar daqui'}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {previous ? (
              <Link
                href={episodePath(show.id, previous.season, previous.episode)}
                className="inline-flex items-center gap-1.5 rounded bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                aria-label={`Episódio anterior ${formatEpisodeCode(previous.season, previous.episode)}`}
                tabIndex={0}
              >
                <IconChevronLeft className="size-4" />
                Anterior
              </Link>
            ) : null}
            {next ? (
              <Link
                href={episodePath(show.id, next.season, next.episode)}
                className="inline-flex items-center gap-1.5 rounded bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                aria-label={`Próximo episódio ${formatEpisodeCode(next.season, next.episode)}`}
                tabIndex={0}
              >
                Próximo
                <IconChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
