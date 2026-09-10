'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { TmdbImage } from '@/components/media/tmdb-image'
import { formatYear } from '@/lib/utils'
import type { TmdbMedia } from '@/types'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type MediaPosterProps = {
  media: TmdbMedia
  badge?: string
  compact?: boolean
  fill?: boolean
  href?: string
}

export const MediaPoster = ({
  media,
  badge,
  compact = false,
  fill = false,
  href,
}: MediaPosterProps) => {
  const resolvedHref =
    href ?? `/title/${media.mediaType.toLowerCase()}/${media.id}`

  return (
    <Link
      href={resolvedHref}
      className={cn(
        'group relative block min-w-0 focus-visible:outline-none',
        fill
          ? 'w-full sm:w-[170px] md:w-[190px] sm:shrink-0'
          : compact
            ? 'w-[130px] shrink-0 sm:w-[150px]'
            : 'w-[140px] shrink-0 sm:w-[170px] md:w-[190px]',
      )}
      aria-label={`Detalhes de ${media.title}`}
      tabIndex={0}
    >
      <article className="overflow-hidden rounded-md bg-surface-2 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:z-10 group-hover:scale-[1.05] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        <div className="relative aspect-[2/3] overflow-hidden">
          <TmdbImage
            path={media.posterPath}
            alt={media.title}
            size="w342"
            fill
            sizes="190px"
          />
          {badge ? (
            <span className="absolute left-2 top-2 z-10 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {badge}
            </span>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 pt-10 opacity-0 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {media.title}
            </h3>
            <p className="mt-1 text-[11px] text-mute">
              {MEDIA_TYPE_LABELS[media.mediaType]}
              {formatYear(media.releaseDate)
                ? ` · ${formatYear(media.releaseDate)}`
                : ''}
            </p>
          </div>
        </div>
      </article>
    </Link>
  )
}

type MediaRowProps = {
  title: string
  items: TmdbMedia[]
  badge?: string
  getHref?: (media: TmdbMedia) => string
}

export const MediaRow = ({ title, items, badge, getHref }: MediaRowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateArrows = () => {
    const el = scrollerRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => updateArrows())
    observer.observe(el)
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.min(el.clientWidth * 0.85, 720)
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: prefersReduced ? 'auto' : 'smooth',
    })
  }

  return (
    <section className="group/row relative space-y-3">
      <h2 className="px-4 text-lg font-semibold tracking-tight text-ink sm:px-8 sm:text-xl">
        {title}
      </h2>

      <div className="relative">
        {canLeft ? (
          <button
            type="button"
            aria-label="Rolar para a esquerda"
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 z-20 hidden h-full w-11 items-center justify-center bg-black/55 text-white opacity-0 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:opacity-100 md:flex"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.4 4.7 7.1 12l8.3 7.3 1.3-1.5L9.9 12l6.8-6.1z"
              />
            </svg>
          </button>
        ) : null}

        {canRight ? (
          <button
            type="button"
            aria-label="Rolar para a direita"
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 z-20 hidden h-full w-11 items-center justify-center bg-black/55 text-white opacity-0 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:opacity-100 md:flex"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8.6 4.7 7.3 6.2 14.1 12l-6.8 6.1 1.3 1.5L16.9 12z"
              />
            </svg>
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 sm:gap-3 sm:px-8"
        >
          {items.map((media) => (
            <MediaPoster
              key={`${media.mediaType}-${media.id}`}
              media={media}
              badge={badge}
              href={getHref?.(media)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export const MediaRowSkeleton = () => {
  return (
    <section className="space-y-3" aria-hidden="true">
      <div className="mx-4 h-6 w-44 rounded bg-surface-2 sm:mx-8" />
      <div className="flex gap-3 overflow-hidden px-4 sm:px-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[2/3] w-[140px] shrink-0 rounded-md bg-surface-2 sm:w-[170px] md:w-[190px]"
          />
        ))}
      </div>
    </section>
  )
}

