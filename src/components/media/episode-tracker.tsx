'use client'

import { IconCheck, IconPlay, IconStar } from '@/components/icons'
import { TmdbImage } from '@/components/media/tmdb-image'
import { formatRuntime } from '@/lib/tmdb/client'
import {
  episodeMark,
  formatEpisodeCode,
  seasonWatchedCount,
} from '@/lib/library/progress'
import { cn, formatRating } from '@/lib/utils'
import type { TmdbSeasonDetails, TmdbSeasonSummary } from '@/types'
import { useTitleLibrary } from '@/components/library/title-library-context'

type EpisodeTrackerProps = {
  seasons: TmdbSeasonSummary[]
  selectedSeason: number | null
  season: TmdbSeasonDetails | null
  isSeasonLoading: boolean
  onSelectSeason: (seasonNumber: number) => void
}

const formatDate = (value: string | null) => {
  if (!value) return null
  return new Date(value).toLocaleDateString('pt-BR')
}

export const EpisodeTracker = ({
  seasons,
  selectedSeason,
  season,
  isSeasonLoading,
  onSelectSeason,
}: EpisodeTrackerProps) => {
  const {
    item,
    status,
    currentSeason,
    currentEpisode,
    isSaving,
    markEpisodeWatched,
    continueFromEpisode,
    markSeasonWatched,
    rewindToEpisode,
  } = useTitleLibrary()

  const handleScrollToCurrent = () => {
    document.getElementById('episodio-atual')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  return (
    <section id="episodios" className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Temporadas
        </h2>
        {item && currentSeason != null && status === 'WATCHING' ? (
          <button
            type="button"
            onClick={handleScrollToCurrent}
            className="text-sm font-semibold text-mute underline-offset-4 hover:text-ink hover:underline"
          >
            Ir para o episódio atual
          </button>
        ) : null}
      </div>

      <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {seasons.map((itemSeason) => {
          const watched = seasonWatchedCount({
            status: item ? status : null,
            seasonNumber: itemSeason.seasonNumber,
            episodeCount: itemSeason.episodeCount,
            currentSeason,
            currentEpisode,
          })
          const selected = selectedSeason === itemSeason.seasonNumber
          const isCurrentSeason = currentSeason === itemSeason.seasonNumber

          return (
            <button
              key={itemSeason.id}
              type="button"
              onClick={() => onSelectSeason(itemSeason.seasonNumber)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm transition duration-200',
                selected
                  ? 'bg-ink text-bg'
                  : 'bg-surface-2 text-mute hover:text-ink',
              )}
            >
              {itemSeason.seasonNumber === 0
                ? itemSeason.name
                : `T${itemSeason.seasonNumber}`}
              <span className={cn('ml-2', selected ? 'text-bg/70' : 'text-mute')}>
                {itemSeason.seasonNumber > 0
                  ? `${watched}/${itemSeason.episodeCount}`
                  : itemSeason.episodeCount}
              </span>
              {isCurrentSeason && status === 'WATCHING' && !selected ? (
                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-accent" />
              ) : null}
            </button>
          )
        })}
      </div>

      {isSeasonLoading ? (
        <p className="mt-6 text-mute">Carregando episódios…</p>
      ) : season ? (
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold">{season.name}</h3>
              {season.overview ? (
                <p className="mt-2 text-sm leading-relaxed text-mute">
                  {season.overview}
                </p>
              ) : null}
            </div>
            {season.seasonNumber > 0 &&
            seasonWatchedCount({
              status: item ? status : null,
              seasonNumber: season.seasonNumber,
              episodeCount: season.episodes.length,
              currentSeason,
              currentEpisode,
            }) < season.episodes.length ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void markSeasonWatched(season.seasonNumber)}
                className="shrink-0 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-line disabled:opacity-50"
              >
                Marcar temporada como vista
              </button>
            ) : null}
          </div>

          <ol className="mt-6 divide-y divide-line">
            {season.episodes.map((episode) => {
              const mark = episodeMark({
                status: item ? status : null,
                seasonNumber: episode.seasonNumber,
                episodeNumber: episode.episodeNumber,
                currentSeason,
                currentEpisode,
              })
              const isCurrent = mark === 'current'
              const airDate = formatDate(episode.airDate)

              const handlePrimary = () => {
                if (mark === 'watched') {
                  void rewindToEpisode(episode.seasonNumber, episode.episodeNumber)
                  return
                }
                if (mark === 'current') {
                  void markEpisodeWatched(
                    episode.seasonNumber,
                    episode.episodeNumber,
                  )
                  return
                }
                void continueFromEpisode(
                  episode.seasonNumber,
                  episode.episodeNumber,
                )
              }

              return (
                <li
                  key={episode.id}
                  id={isCurrent ? 'episodio-atual' : undefined}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'grid gap-4 py-4 sm:grid-cols-[200px_1fr] sm:items-center',
                    mark === 'watched' && 'opacity-70',
                    isCurrent && 'opacity-100',
                  )}
                >
                  <button
                    type="button"
                    onClick={handlePrimary}
                    disabled={isSaving}
                    className="group relative aspect-video overflow-hidden rounded-md bg-surface-2 text-left"
                    aria-label={
                      mark === 'watched'
                        ? `Rever ${episode.name}`
                        : mark === 'current'
                          ? `Marcar ${episode.name} como visto`
                          : `Continuar de ${episode.name}`
                    }
                  >
                    <TmdbImage
                      path={episode.stillPath}
                      alt=""
                      size="w500"
                      fill
                      sizes="200px"
                      imgClassName={cn(
                        'transition duration-300 group-hover:scale-[1.03]',
                        mark === 'watched' && 'saturate-75',
                      )}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span
                      className={cn(
                        'absolute left-2 top-2 flex size-7 items-center justify-center rounded-full',
                        mark === 'watched'
                          ? 'bg-ok text-bg'
                          : isCurrent
                            ? 'bg-accent text-white'
                            : 'bg-black/65 text-white',
                      )}
                    >
                      {mark === 'watched' ? (
                        <IconCheck className="size-3.5" />
                      ) : (
                        <IconPlay className="size-3.5" />
                      )}
                    </span>
                    <span className="absolute bottom-2 left-2 text-xs font-semibold text-white">
                      {formatEpisodeCode(
                        episode.seasonNumber,
                        episode.episodeNumber,
                      )}
                    </span>
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold leading-snug">
                          {episode.episodeNumber}. {episode.name}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mute">
                          {airDate ? <span>{airDate}</span> : null}
                          {episode.runtime ? (
                            <span>{formatRuntime(episode.runtime)}</span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <IconStar className="size-3 text-spot" />
                            {formatRating(episode.voteAverage)}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handlePrimary}
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200',
                          mark === 'current'
                            ? 'bg-ink text-bg'
                            : mark === 'watched'
                              ? 'bg-surface-2 text-mute hover:text-ink'
                              : 'bg-surface-2 text-ink hover:bg-line',
                        )}
                      >
                        {mark === 'watched'
                          ? 'Rever daqui'
                          : mark === 'current'
                            ? 'Marcar como visto'
                            : 'Continuar daqui'}
                      </button>
                    </div>

                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/80">
                      {episode.overview || 'Sem descrição.'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
