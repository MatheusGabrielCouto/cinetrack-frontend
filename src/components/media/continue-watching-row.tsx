'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ContentFilter } from '@/components/media/filter-bar'
import { TmdbImage } from '@/components/media/tmdb-image'
import { libraryApi } from '@/lib/api/cinetrack'
import { tmdbApi } from '@/lib/tmdb/client'
import { useAuth } from '@/components/providers/auth-provider'
import type { LibraryItem, TmdbMedia } from '@/types'

type ContinueItem = LibraryItem & { media: TmdbMedia | null }

type ContinueWatchingRowProps = {
  contentFilter?: ContentFilter
}

const formatProgress = (season: number | null, episode: number | null) => {
  const s = season ?? 1
  const e = episode ?? 1
  return `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`
}

const subtitleFor = (item: ContinueItem) => {
  if (item.mediaType === 'TV') {
    return formatProgress(item.currentSeason, item.currentEpisode)
  }
  return 'Em andamento'
}

export const ContinueWatchingRow = ({
  contentFilter = 'all',
}: ContinueWatchingRowProps) => {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<ContinueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      setIsLoading(false)
      return
    }
    const load = async () => {
      setIsLoading(true)
      try {
        const requests: Array<Promise<LibraryItem[]>> = []

        if (contentFilter !== 'TV') {
          requests.push(
            libraryApi.list({ status: 'WATCHING', mediaType: 'MOVIE' }),
          )
        }
        if (contentFilter !== 'MOVIE') {
          requests.push(
            libraryApi.list({ status: 'WATCHING', mediaType: 'TV' }),
          )
        }

        const batches = await Promise.all(requests)
        const watching = batches
          .flat()
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )

        const enriched = await Promise.all(
          watching.slice(0, 12).map(async (item) => {
            try {
              const media = await tmdbApi.details(item.mediaType, item.tmdbId)
              return { ...item, media }
            } catch {
              return { ...item, media: null }
            }
          }),
        )

        setItems(enriched.filter((item) => item.media))
      } catch {
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [contentFilter, isAuthenticated])

  if (isLoading || items.length === 0) return null

  const description =
    contentFilter === 'MOVIE'
      ? 'Retome seus filmes em andamento'
      : contentFilter === 'TV'
        ? 'Retome suas séries de onde parou'
        : 'Retome filmes e séries de onde parou'

  return (
    <section className="px-4 sm:px-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Continue assistindo</h2>
          <p className="text-sm text-mute">{description}</p>
        </div>
      </div>

      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
          if (!item.media) return null
          const typePath = item.mediaType.toLowerCase() as 'movie' | 'tv'
          const href = `/title/${typePath}/${item.tmdbId}`
          const progress = subtitleFor(item)

          return (
            <Link
              key={item.id}
              href={href}
              className="group relative w-[260px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface transition hover:border-mute"
              aria-label={`Continuar ${item.media.title}${item.mediaType === 'TV' ? ` em ${progress}` : ''}`}
              tabIndex={0}
            >
              <div className="relative aspect-video overflow-hidden bg-surface-2">
                <TmdbImage
                  path={item.media.backdropPath ?? item.media.posterPath}
                  alt=""
                  size="w780"
                  fill
                  sizes="260px"
                  imgClassName="transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="truncate font-semibold text-white">
                    {item.media.title}
                  </p>
                  <p className="mt-0.5 text-sm text-white/80">{progress}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    Continuar daqui →
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
