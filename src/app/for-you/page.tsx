'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { TmdbImage } from '@/components/media/tmdb-image'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import {
  getRecommendations,
  type RecommendationItem,
} from '@/lib/recommendations/engine'
import type { TasteProfile } from '@/lib/recommendations/taste-profile'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn, formatYear } from '@/lib/utils'
import type { MediaType } from '@/types'

type MediaFilter = 'ALL' | MediaType

export default function ForYouPage() {
  const [filter, setFilter] = useState<MediaFilter>('ALL')
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [genreNames, setGenreNames] = useState<Map<number, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let library = await libraryApi.list()

        const missingGenres = library.filter(
          (item) =>
            (!item.genreIds || item.genreIds.length === 0) &&
            (item.isFavorite ||
              (item.rating !== null && item.rating > 0) ||
              item.status === 'WATCHED'),
        )

        if (missingGenres.length > 0) {
          await Promise.all(
            missingGenres.slice(0, 24).map(async (item) => {
              try {
                const details = await tmdbApi.fullDetails(
                  item.mediaType,
                  item.tmdbId,
                )
                await libraryApi.update(item.id, {
                  genreIds: details.genres.map((genre) => genre.id),
                })
              } catch {
                // ignore
              }
            }),
          )
          library = await libraryApi.list()
        }

        const result = await getRecommendations(library, {
          mediaFilter: filter,
          limit: 24,
        })

        setItems(result.items)
        setProfile(result.profile)
        setGenreNames(result.genreNames)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível montar suas recomendações',
        )
        setItems([])
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [filter])

  const topGenreLabels = useMemo(() => {
    if (!profile) return []
    return profile.topGenres
      .slice(0, 3)
      .map((genre) => genreNames.get(genre.id) ?? null)
      .filter((name): name is string => Boolean(name))
  }, [genreNames, profile])

  return (
    <RequireAuth>
      <div className="relative pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(ellipse_at_top,_rgba(229,9,20,0.18),_transparent_55%)]" />

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-10 sm:px-8">
          <p className="text-sm text-mute">Personalizado</p>
          <h1 className="mt-1 font-sans text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[0.95] tracking-tight">
            Para você
          </h1>
          <p className="mt-3 max-w-xl text-mute">
            {isLoading
              ? 'Lendo sua lista e notas…'
              : profile?.hasEnoughSignal
                ? topGenreLabels.length
                  ? `Baseado no que você avalia bem — forte em ${topGenreLabels.join(', ')}.`
                  : 'Baseado nos títulos que você avaliou e marcou como favorito.'
                : 'Avalie alguns títulos para liberar recomendações sob medida.'}
          </p>

          <div
            className="mt-8 flex gap-5 border-b border-line"
            role="tablist"
            aria-label="Tipo de recomendação"
          >
            {(
              [
                { id: 'ALL', label: 'Tudo' },
                { id: 'MOVIE', label: 'Filmes' },
                { id: 'TV', label: 'Séries' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                onClick={() => setFilter(option.id)}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-medium transition',
                  filter === option.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-mute hover:text-ink',
                )}
                aria-selected={filter === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="mt-8 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[2/3] animate-pulse bg-surface-2"
                />
              ))}
            </div>
          ) : !profile?.hasEnoughSignal ? (
            <div className="mt-12 border border-dashed border-line bg-surface/40 p-8 sm:p-10">
              <h2 className="font-sans text-2xl font-semibold">
                Ainda falta sinal de gosto
              </h2>
              <p className="mt-2 max-w-lg text-mute">
                Avalie pelo menos 3 títulos (nota ou favorito) na sua lista. Quanto
                mais notas, melhor o “Para você”.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/library"
                  className="border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-deep"
                >
                  Ir para minha lista
                </Link>
                <Link
                  href="/discover"
                  className="border border-line px-4 py-2 text-sm text-mute transition hover:border-mute hover:text-ink"
                >
                  Explorar catálogo
                </Link>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-12 border border-dashed border-line bg-surface/40 p-8">
              <p className="text-mute">
                Não encontramos novidades neste filtro. Tente “Tudo” ou avalie
                mais títulos.
              </p>
            </div>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => (
                <RecommendationCard key={`${item.media.mediaType}-${item.media.id}`} item={item} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}

const RecommendationCard = ({ item }: { item: RecommendationItem }) => {
  const { media, because } = item
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`

  return (
    <li>
      <Link
        href={href}
        className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`${media.title}. ${because}`}
        tabIndex={0}
      >
        <article>
          <div className="relative aspect-[2/3] overflow-hidden bg-surface-2 transition duration-300 group-hover:scale-[1.03] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
            <TmdbImage
              path={media.posterPath}
              alt={media.title}
              size="w342"
              fill
              sizes="190px"
            />
            {media.voteAverage > 0 ? (
              <span className="absolute right-2 top-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-spot">
                ★ {media.voteAverage.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-white">
            {media.title}
          </h2>
          <p className="mt-0.5 text-[11px] text-mute">
            {MEDIA_TYPE_LABELS[media.mediaType]}
            {formatYear(media.releaseDate)
              ? ` · ${formatYear(media.releaseDate)}`
              : ''}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-accent/90">
            {because}
          </p>
        </article>
      </Link>
    </li>
  )
}
