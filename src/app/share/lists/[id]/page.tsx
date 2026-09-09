'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MediaPoster } from '@/components/media/media-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { listsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { tmdbApi } from '@/lib/tmdb/client'
import type { ListDetail, TmdbMedia } from '@/types'

type EnrichedItem = ListDetail['items'][number] & {
  media: TmdbMedia | null
}

const isTmdbPath = (url: string) => url.startsWith('/')

export default function PublicListSharePage() {
  const params = useParams<{ id: string }>()
  const [list, setList] = useState<ListDetail | null>(null)
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const detail = await listsApi.getPublic(params.id)
        setList(detail)

        const enriched = await Promise.all(
          detail.items.map(async (item) => {
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
            : 'Lista não encontrada ou privada',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [params.id])

  const cover = list?.coverUrl
  const fallbackPoster = items.find((item) => item.media?.posterPath)?.media
    ?.posterPath

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
      <p className="text-sm text-mute">Coleção compartilhada</p>

      {isLoading ? (
        <p className="mt-10 text-mute">Carregando…</p>
      ) : error || !list ? (
        <div className="mt-10">
          <p className="text-accent">{error ?? 'Lista indisponível'}</p>
          <Link href="/lists" className="mt-4 inline-block text-sm text-mute hover:text-ink">
            Ver coleções
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-line">
            <div className="relative aspect-[21/9] min-h-[180px] bg-surface-2 sm:min-h-[220px]">
              {cover ? (
                isTmdbPath(cover) ? (
                  <TmdbImage path={cover} alt="" size="w780" fill sizes="1400px" />
                ) : (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                )
              ) : fallbackPoster ? (
                <TmdbImage
                  path={fallbackPoster}
                  alt=""
                  size="w780"
                  fill
                  sizes="1400px"
                  imgClassName="opacity-60 blur-sm scale-110"
                />
              ) : (
                <div className="h-full bg-gradient-to-br from-surface-2 to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                {list.owner ? (
                  <p className="text-sm text-mute">por {list.owner.name}</p>
                ) : null}
                <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                  {list.name}
                </h1>
                {list.description ? (
                  <p className="mt-2 max-w-2xl text-mute">{list.description}</p>
                ) : null}
                <p className="mt-3 text-sm text-mute">
                  {list.itemCount} {list.itemCount === 1 ? 'título' : 'títulos'}
                </p>
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="mt-10 text-mute">Esta coleção ainda não tem títulos.</p>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              {items.map((item) =>
                item.media ? (
                  <MediaPoster key={item.id} media={item.media} />
                ) : (
                  <div
                    key={item.id}
                    className="w-[150px] rounded-md border border-line bg-surface-2 p-4 text-sm text-mute"
                  >
                    TMDB #{item.tmdbId}
                  </div>
                ),
              )}
            </div>
          )}

          <div className="mt-12 border-t border-line pt-6">
            <p className="text-mute">Gostou desta curadoria?</p>
            <Link
              href="/register"
              className="mt-2 inline-block font-medium text-accent hover:underline"
            >
              Crie sua conta no CineTrack
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
