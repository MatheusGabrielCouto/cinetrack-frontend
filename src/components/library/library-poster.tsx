'use client'

import Link from 'next/link'
import { IconHeartFill, IconStar } from '@/components/icons'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { formatEpisodeCode } from '@/lib/library/progress'
import { cn, formatYear, statusLabel } from '@/lib/utils'
import type { LibraryItem, TmdbMedia } from '@/types'

type LibraryPosterProps = {
  item: LibraryItem
  media: TmdbMedia
}

const statusTone = (status: LibraryItem['status']) => {
  if (status === 'WATCHING') return 'bg-accent text-white'
  if (status === 'WATCHED') return 'bg-ok text-bg'
  return 'bg-black/80 text-white'
}

export const LibraryPoster = ({ item, media }: LibraryPosterProps) => {
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`
  const year = formatYear(media.releaseDate)
  const episodeCode =
    item.mediaType === 'TV' && item.currentSeason && item.currentEpisode
      ? formatEpisodeCode(item.currentSeason, item.currentEpisode)
      : null
  const status = statusLabel(item.status)

  const ariaParts = [
    media.title,
    status,
    item.isFavorite ? 'Favorito' : null,
    item.rating ? `Nota ${item.rating}` : null,
    episodeCode && item.status === 'WATCHING' ? episodeCode : null,
  ].filter(Boolean)

  return (
    <Link
      href={href}
      className="group block min-w-0 focus-visible:outline-none"
      aria-label={ariaParts.join('. ')}
      tabIndex={0}
    >
      <article>
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          <TmdbImage
            path={media.posterPath}
            alt=""
            size="w342"
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
          />

          <span
            className={cn(
              'absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none',
              statusTone(item.status),
            )}
          >
            {status}
          </span>

          {item.isFavorite ? (
            <span className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/70 text-accent">
              <IconHeartFill className="size-3.5" />
            </span>
          ) : null}

          {episodeCode && item.status === 'WATCHING' ? (
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8">
              <p className="text-[11px] font-semibold text-white">{episodeCode}</p>
            </div>
          ) : null}
        </div>

        <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-white">
          {media.title}
        </h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-mute">
          <span>{MEDIA_TYPE_LABELS[media.mediaType]}</span>
          {year ? <span>· {year}</span> : null}
          {item.rating ? (
            <span className="inline-flex items-center gap-0.5 text-spot">
              <IconStar className="size-3" />
              {item.rating}
            </span>
          ) : null}
        </p>
      </article>
    </Link>
  )
}
