'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { OnboardingGate } from '@/components/auth/onboarding-gate'
import { RequireAuth } from '@/components/auth/require-auth'
import { IconStar } from '@/components/icons'
import { MediaRow } from '@/components/media/media-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import {
  getRecommendations,
  type RecommendationItem,
} from '@/lib/recommendations/engine'
import { readPreferredGenres } from '@/lib/recommendations/preferred-genres'
import {
  hasTasteSignal,
  MIN_SIGNAL,
  type TasteProfile,
} from '@/lib/recommendations/taste-profile'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn, formatYear } from '@/lib/utils'
import type { MediaType, TmdbMedia } from '@/types'

type MediaFilter = 'ALL' | MediaType

type ReasonShelf = {
  title: string
  items: TmdbMedia[]
}

const FILTER_TABS: Array<{ id: MediaFilter; label: string }> = [
  { id: 'ALL', label: 'Tudo' },
  { id: 'MOVIE', label: 'Filmes' },
  { id: 'TV', label: 'Séries' },
]

const formatNameList = (names: string[]) => {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} e ${names[1]}`
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

export default function ForYouPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<MediaFilter>('ALL')
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [genreNames, setGenreNames] = useState<Map<number, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let library = await libraryApi.list()

        const missingGenres = library.filter(
          (item) =>
            (!item.genreIds || item.genreIds.length === 0) &&
            hasTasteSignal(item),
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
          mediaFilter: 'ALL',
          limit: 60,
          preferredGenres: user ? readPreferredGenres(user.id) : null,
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
  }, [reloadKey, user])

  const topGenreLabels = useMemo(() => {
    if (!profile) return []
    const ids = [
      ...profile.topMovieGenres.slice(0, 2).map((genre) => genre.id),
      ...profile.topTvGenres.slice(0, 2).map((genre) => genre.id),
    ]
    const fallback =
      ids.length > 0
        ? ids
        : profile.topGenres.slice(0, 3).map((genre) => genre.id)
    const names = fallback
      .map((id) => genreNames.get(id) ?? null)
      .filter((name): name is string => Boolean(name))
    return [...new Set(names)].slice(0, 3)
  }, [genreNames, profile])

  const visibleItems = useMemo(
    () =>
      filter === 'ALL'
        ? items
        : items.filter((item) => item.media.mediaType === filter),
    [filter, items],
  )

  const featured = visibleItems[0] ?? null

  const shelves = useMemo<ReasonShelf[]>(() => {
    const rest = featured ? visibleItems.slice(1) : visibleItems
    const order: string[] = []
    const grouped = new Map<string, TmdbMedia[]>()

    rest.forEach((item) => {
      const existing = grouped.get(item.because)
      if (!existing) {
        order.push(item.because)
        grouped.set(item.because, [item.media])
        return
      }
      existing.push(item.media)
    })

    return order.map((title) => ({
      title,
      items: grouped.get(title) ?? [],
    }))
  }, [featured, visibleItems])

  const handleFilterChange = (value: MediaFilter) => {
    setFilter(value)
  }

  const handleRetry = () => {
    setReloadKey((value) => value + 1)
  }

  const genreSummary = formatNameList(topGenreLabels)
  const remainingSignal = Math.max(
    0,
    MIN_SIGNAL - (profile?.signalCount ?? 0),
  )
  const signalHint =
    profile && profile.signalCount > 0
      ? remainingSignal === 1
        ? 'Falta mais 1 título (assistindo, visto, nota ou favorito) para montar o Para você.'
        : `Faltam mais ${remainingSignal} títulos (assistindo, visto, nota ou favorito) para montar o Para você.`
      : 'Escolha pelo menos 3 gêneros no onboarding, ou marque títulos na lista.'

  const loadedSummary = !profile?.hasEnoughSignal
    ? 'Escolha gêneros ou avalie alguns títulos para liberar o Para você.'
    : !genreSummary
      ? 'Filmes e séries a partir dos seus gêneros, do que você assiste e avalia.'
      : profile.preferredGenreCount >= MIN_SIGNAL &&
          profile.signalCount < MIN_SIGNAL
        ? `Montado a partir dos gêneros que você escolheu. Forte em ${genreSummary}.`
        : `Filmes e séries a partir do que você assiste e avalia. Forte em ${genreSummary}.`

  const summary = isLoading
    ? 'Lendo seus gêneros, a lista e as notas…'
    : loadedSummary

  return (
    <RequireAuth>
      <OnboardingGate />
      <div className="relative -mt-16 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
          {featured?.media ? (
            <div className="absolute inset-x-0 top-0 h-[118%] opacity-40">
              <TmdbImage
                path={featured.media.backdropPath ?? featured.media.posterPath}
                alt=""
                size="w1280"
                fill
                priority
                sizes="100vw"
                imgClassName="object-cover object-top"
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/88 to-bg" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(229,9,20,0.18),_transparent_52%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(2.75rem,8vw,5rem)] font-extrabold leading-[0.9] tracking-tight">
                Para você
              </h1>
              <p className="mt-3 max-w-xl text-mute">{summary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile?.hasEnoughSignal ? (
                <Button
                  variant="ghost"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  Atualizar
                </Button>
              ) : null}
              <Link href="/library">
                <Button variant="ghost">Minha lista</Button>
              </Link>
            </div>
          </div>

          <div
            className="mt-8 flex gap-5 border-b border-line"
            role="tablist"
            aria-label="Tipo de recomendação"
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                onClick={() => handleFilterChange(tab.id)}
                className={cn(
                  '-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  filter === tab.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-mute hover:text-ink',
                )}
                aria-selected={filter === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-8 border border-dashed border-line bg-surface/40 p-6">
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={handleRetry}
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <ForYouSkeleton />
          ) : !profile?.hasEnoughSignal ? (
            <div className="mt-12 max-w-lg">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ainda falta sinal de gosto
              </h2>
              <p className="mt-2 text-mute">{signalHint}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/onboarding">
                  <Button>Escolher gêneros</Button>
                </Link>
                <Link href="/library">
                  <Button variant="ghost">Ir para minha lista</Button>
                </Link>
              </div>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="mt-12 max-w-lg">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Nada neste filtro
              </h2>
              <p className="mt-2 text-mute">
                Não encontramos novidades neste filtro. Veja Tudo ou acrescente
                mais títulos desse tipo na sua lista.
              </p>
              {filter !== 'ALL' ? (
                <Button
                  className="mt-6"
                  onClick={() => handleFilterChange('ALL')}
                >
                  Ver tudo
                </Button>
              ) : (
                <Link href="/library" className="mt-6 inline-block">
                  <Button>Ir para minha lista</Button>
                </Link>
              )}
            </div>
          ) : (
            <div key={filter} className="mt-8 space-y-10 catalog-enter">
              {featured ? <FeaturedPick item={featured} /> : null}

              {shelves.map((shelf) => (
                <div key={shelf.title} className="-mx-4 sm:-mx-8">
                  <MediaRow title={shelf.title} items={shelf.items} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}

const FeaturedPick = ({ item }: { item: RecommendationItem }) => {
  const { media, because } = item
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`
  const year = formatYear(media.releaseDate)

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-md bg-bg focus-visible:outline-none"
      aria-label={`${media.title}. ${because}`}
      tabIndex={0}
    >
      <article className="relative aspect-[16/10] overflow-hidden sm:aspect-[21/9]">
        <div className="absolute inset-x-0 top-0 h-[118%]">
          <TmdbImage
            path={media.backdropPath ?? media.posterPath}
            alt=""
            size="w1280"
            fill
            priority
            sizes="(max-width: 1400px) 100vw, 1400px"
            imgClassName="object-cover object-top transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg from-10% via-bg/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-black/25" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-none tracking-tight sm:text-5xl">
            {media.title}
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-mute">
            <span>{MEDIA_TYPE_LABELS[media.mediaType]}</span>
            {year ? <span>· {year}</span> : null}
            {media.voteAverage > 0 ? (
              <span className="inline-flex items-center gap-1 text-spot">
                <IconStar className="size-3.5" />
                {media.voteAverage.toFixed(1)}
              </span>
            ) : null}
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium text-accent sm:text-base">
            {because}
          </p>
          {media.overview ? (
            <p className="mt-2 max-w-xl line-clamp-2 text-sm leading-relaxed text-ink/85">
              {media.overview}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  )
}

const ForYouSkeleton = () => {
  return (
    <div className="mt-8 space-y-10" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse rounded-md bg-surface-2 sm:aspect-[21/9]" />
      <div>
        <div className="h-7 w-64 rounded bg-surface-2" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[2/3] w-[140px] shrink-0 animate-pulse rounded-md bg-surface-2 sm:w-[170px] md:w-[190px]"
            />
          ))}
        </div>
      </div>
      <div>
        <div className="h-7 w-48 rounded bg-surface-2" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[2/3] w-[140px] shrink-0 animate-pulse rounded-md bg-surface-2 sm:w-[170px] md:w-[190px]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
