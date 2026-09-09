'use client'

import { Button } from '@/components/ui/button'
import { IconHeart, IconHeartFill } from '@/components/icons'
import {
  countWatchableEpisodes,
  formatEpisodeCode,
  seriesProgressRatio,
  watchedEpisodeCount,
} from '@/lib/library/progress'
import { cn } from '@/lib/utils'
import { RatingPicker } from './rating-picker'
import { StatusControl } from './status-control'
import { useTitleLibrary } from './title-library-context'

export const LibraryPanel = () => {
  const {
    item,
    status,
    review,
    isFavorite,
    currentSeason,
    currentEpisode,
    isLoading,
    isSaving,
    message,
    error,
    mediaType,
    seasons,
    setReview,
    persist,
    remove,
  } = useTitleLibrary()

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl bg-surface">
        <div className="space-y-3 p-5">
          <div className="h-5 w-28 animate-pulse rounded bg-surface-2" />
          <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-16 w-full animate-pulse rounded bg-surface-2" />
        </div>
      </div>
    )
  }

  const total = countWatchableEpisodes(seasons)
  const watched = watchedEpisodeCount({
    status: item ? status : null,
    seasons,
    currentSeason,
    currentEpisode,
  })
  const ratio = seriesProgressRatio({
    status: item ? status : null,
    seasons,
    currentSeason,
    currentEpisode,
  })
  const showProgress = mediaType === 'TV' && total > 0
  const continueLabel =
    mediaType === 'TV' && currentSeason && currentEpisode
      ? formatEpisodeCode(currentSeason, currentEpisode)
      : null

  const handleFavoriteToggle = () => {
    void persist({ isFavorite: !isFavorite })
  }

  const handleReviewBlur = () => {
    const saved = item?.review ?? ''
    if (review.trim() === saved.trim()) return
    void persist({ review })
  }

  const handleContinue = () => {
    document.getElementById('episodios')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {item ? 'Na sua lista' : 'Acompanhe este título'}
          </h2>
          <p className="mt-1 text-sm text-mute">
            {item
              ? continueLabel && status === 'WATCHING'
                ? `Continuar em ${continueLabel}`
                : status === 'WATCHED'
                  ? 'Você já terminou'
                  : 'Na fila para assistir'
              : 'Um toque para salvar status, nota e progresso'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleFavoriteToggle}
          disabled={isSaving}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          aria-pressed={isFavorite}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full transition duration-200',
            isFavorite
              ? 'bg-accent/15 text-accent'
              : 'bg-surface-2 text-mute hover:text-ink',
          )}
        >
          {isFavorite ? <IconHeartFill /> : <IconHeart />}
        </button>
      </div>

      <div className="space-y-5 px-5 pb-5">
        <StatusControl />

        {showProgress ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-mute">Progresso</span>
              <span className="tabular-nums text-ink">
                {watched}/{total} episódios
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full w-full origin-left bg-accent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `scaleX(${ratio})` }}
              />
            </div>
            {continueLabel && status !== 'WATCHED' ? (
              <button
                type="button"
                onClick={handleContinue}
                className="mt-3 text-sm font-semibold text-ink underline-offset-4 hover:underline"
              >
                Ir para {continueLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        <RatingPicker />

        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-mute">Resenha</span>
            <span className="text-xs text-mute">{review.length}/2000</span>
          </div>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            onBlur={handleReviewBlur}
            rows={4}
            maxLength={2000}
            disabled={isSaving}
            className="resize-y rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-mute/70 focus:border-accent"
            placeholder="O que ficou com você depois dos créditos?"
          />
        </label>

        {item?.watchedAt && status === 'WATCHED' ? (
          <p className="text-xs text-mute">
            Assistido em{' '}
            {new Date(item.watchedAt).toLocaleDateString('pt-BR')}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok" role="status">
            {message}
          </p>
        ) : null}

        {item ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isSaving}
            onClick={() => void remove()}
          >
            Remover da lista
          </Button>
        ) : null}
      </div>
    </section>
  )
}
