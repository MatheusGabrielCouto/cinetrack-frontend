'use client'

import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MediaPoster } from '@/components/media/media-poster'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { tmdbApi } from '@/lib/tmdb/client'
import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { cn, statusLabel } from '@/lib/utils'
import type { LibraryItem, MediaType, TmdbMedia, WatchStatus } from '@/types'

type EnrichedItem = LibraryItem & { media: TmdbMedia | null }

export default function LibraryPage() {
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [status, setStatus] = useState<WatchStatus | 'ALL'>('ALL')
  const [mediaType, setMediaType] = useState<MediaType | 'ALL'>('ALL')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const library = await libraryApi.list({
          status: status === 'ALL' ? undefined : status,
          mediaType: mediaType === 'ALL' ? undefined : mediaType,
          favorite: favoriteOnly ? true : undefined,
        })

        const enriched = await Promise.all(
          library.map(async (item) => {
            try {
              const media = await tmdbApi.details(item.mediaType, item.tmdbId)
              return { ...item, media }
            } catch {
              return { ...item, media: null }
            }
          }),
        )

        setItems(enriched)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar a biblioteca',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [status, mediaType, favoriteOnly])

  const counts = useMemo(() => {
    return {
      total: items.length,
      favorites: items.filter((item) => item.isFavorite).length,
    }
  }, [items])

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Minha lista
        </h1>
        <p className="mt-2 text-mute">
          {counts.total} títulos · {counts.favorites} favoritos
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(['ALL', ...Object.keys(WATCH_STATUS_LABELS)] as Array<
            'ALL' | WatchStatus
          >).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                status === value
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line text-mute hover:text-ink',
              )}
            >
              {value === 'ALL' ? 'Todos os status' : statusLabel(value)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(['ALL', 'MOVIE', 'TV'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMediaType(value)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                mediaType === value
                  ? 'border-accent bg-accent/20 text-ink'
                  : 'border-line text-mute hover:text-ink',
              )}
            >
              {value === 'ALL'
                ? 'Filmes e séries'
                : value === 'MOVIE'
                  ? 'Filmes'
                  : 'Séries'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFavoriteOnly((value) => !value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm transition',
              favoriteOnly
                ? 'border-spot bg-spot/20 text-ink'
                : 'border-line text-mute hover:text-ink',
            )}
          >
            Só favoritos
          </button>
        </div>

        {error ? <p className="mt-6 text-sm text-accent">{error}</p> : null}

        {isLoading ? (
          <p className="mt-10 text-mute">Carregando biblioteca…</p>
        ) : items.length === 0 ? (
          <p className="mt-10 text-mute">
            Nenhum título por aqui. Adicione algo em Início.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            {items.map((item) =>
              item.media ? (
                <MediaPoster
                  key={item.id}
                  media={item.media}
                  badge={statusLabel(item.status)}
                />
              ) : (
                <div
                  key={item.id}
                  className="w-[150px] rounded-md border border-line bg-surface-2 p-4 text-sm text-mute"
                >
                  TMDB #{item.tmdbId}
                  <br />
                  {statusLabel(item.status)}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  )
}
