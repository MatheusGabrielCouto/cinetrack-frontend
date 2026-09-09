'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { IconPlay } from '@/components/icons'
import { LibraryPanel } from '@/components/library/library-panel'
import { TitleLibraryProvider, useTitleLibrary } from '@/components/library/title-library-context'
import { AddToListPanel } from '@/components/lists/add-to-list-panel'
import { EpisodeTracker } from '@/components/media/episode-tracker'
import { MediaRow } from '@/components/media/media-poster'
import { TitleCast } from '@/components/media/title-cast'
import { TitleHero } from '@/components/media/title-hero'
import { TrackingDock } from '@/components/media/tracking-dock'
import { TrailerModal } from '@/components/media/trailer-modal'
import { WatchProviders } from '@/components/media/watch-providers'
import { formatMoney, formatRuntime, tmdbApi, tmdbImage } from '@/lib/tmdb/client'
import { formatRating } from '@/lib/utils'
import type { MediaType, TmdbMediaDetails, TmdbSeasonDetails } from '@/types'

const parseMediaType = (value: string): MediaType | null => {
  if (value === 'movie') return 'MOVIE'
  if (value === 'tv') return 'TV'
  return null
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

const firstSeasonNumber = (details: TmdbMediaDetails) =>
  details.seasons.find((season) => season.seasonNumber > 0)?.seasonNumber ??
  details.seasons[0]?.seasonNumber ??
  null

export default function TitleDetailPage() {
  const params = useParams<{ type: string; id: string }>()
  const mediaType = parseMediaType(params.type)
  const tmdbId = Number(params.id)

  const [details, setDetails] = useState<TmdbMediaDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!mediaType || Number.isNaN(tmdbId)) {
      setError('Título inválido')
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        setDetails(await tmdbApi.fullDetails(mediaType, tmdbId))
      } catch {
        setError('Não foi possível carregar este título no TMDB')
        setDetails(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [mediaType, tmdbId])

  return (
    <RequireAuth>
      {isLoading ? (
        <TitleDetailSkeleton />
      ) : error || !details || !mediaType ? (
        <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8">
          <p className="text-accent">{error ?? 'Título não encontrado'}</p>
        </div>
      ) : (
        <TitleLibraryProvider
          tmdbId={details.id}
          mediaType={details.mediaType}
          genreIds={details.genres.map((genre) => genre.id)}
          seasons={details.seasons}
        >
          <TitleDetailView details={details} />
        </TitleLibraryProvider>
      )}
    </RequireAuth>
  )
}

const TitleDetailSkeleton = () => (
  <div className="relative -mt-16 min-h-[88vh]">
    <div className="absolute inset-0 bg-surface-2" />
    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/40" />
    <div className="relative mx-auto flex min-h-[88vh] max-w-[1400px] items-end px-4 pb-14 sm:px-8">
      <div className="w-full max-w-2xl space-y-4">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="h-16 w-full max-w-lg animate-pulse rounded bg-white/10" />
        <div className="h-24 w-full animate-pulse rounded bg-white/10" />
      </div>
    </div>
  </div>
)

const TitleDetailView = ({ details }: { details: TmdbMediaDetails }) => {
  const { item } = useTitleLibrary()
  const [season, setSeason] = useState<TmdbSeasonDetails | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    firstSeasonNumber(details),
  )
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
  const [isSeasonLoading, setIsSeasonLoading] = useState(false)

  useEffect(() => {
    if (item?.currentSeason == null) return
    setSelectedSeason(item.currentSeason)
  }, [item?.currentSeason])

  useEffect(() => {
    if (details.mediaType !== 'TV' || selectedSeason === null) return

    const loadSeason = async () => {
      setIsSeasonLoading(true)
      try {
        setSeason(await tmdbApi.seasonDetails(details.id, selectedSeason))
      } catch {
        setSeason(null)
      } finally {
        setIsSeasonLoading(false)
      }
    }

    void loadSeason()
  }, [details.id, details.mediaType, selectedSeason])

  const facts = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [
      { label: 'Produção', value: details.status ?? '—' },
      {
        label: 'Nota TMDB',
        value: `${formatRating(details.voteAverage)} (${details.voteCount} votos)`,
      },
      {
        label: 'Idioma original',
        value: details.originalLanguage?.toUpperCase() ?? '—',
      },
    ]

    if (details.mediaType === 'MOVIE') {
      items.push(
        { label: 'Duração', value: formatRuntime(details.runtime) ?? '—' },
        { label: 'Estreia', value: formatDate(details.releaseDate) },
        { label: 'Orçamento', value: formatMoney(details.budget) ?? '—' },
        { label: 'Receita', value: formatMoney(details.revenue) ?? '—' },
      )
    } else {
      items.push(
        { label: 'Temporadas', value: String(details.numberOfSeasons ?? '—') },
        { label: 'Episódios', value: String(details.numberOfEpisodes ?? '—') },
        {
          label: 'Duração média',
          value: details.episodeRunTime[0]
            ? formatRuntime(details.episodeRunTime[0]) ?? '—'
            : '—',
        },
        { label: 'Primeira exibição', value: formatDate(details.releaseDate) },
        { label: 'Última exibição', value: formatDate(details.lastAirDate) },
        {
          label: 'Em produção',
          value:
            details.inProduction === null
              ? '—'
              : details.inProduction
                ? 'Sim'
                : 'Não',
        },
      )
    }

    if (details.originalTitle && details.originalTitle !== details.title) {
      items.push({ label: 'Título original', value: details.originalTitle })
    }

    if (details.spokenLanguages.length) {
      items.push({
        label: 'Idiomas',
        value: details.spokenLanguages.map((lang) => lang.name).join(', '),
      })
    }

    if (details.productionCountries.length) {
      items.push({
        label: 'Países',
        value: details.productionCountries.map((country) => country.name).join(', '),
      })
    }

    return items
  }, [details])

  const mainTrailer = details.videos[0] ?? null

  return (
    <div className="relative pb-28 xl:pb-20">
      <TitleHero
        details={details}
        trailerKey={mainTrailer?.key ?? null}
        isModalOpen={Boolean(activeTrailer)}
        onPlayTrailer={
          mainTrailer ? () => setActiveTrailer(mainTrailer.key) : null
        }
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-8">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <aside className="xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24">
            <LibraryPanel />
            <AddToListPanel
              tmdbId={details.id}
              mediaType={details.mediaType}
              coverUrl={tmdbImage(
                details.backdropPath ?? details.posterPath,
                'w780',
              )}
            />
          </aside>

          <div className="min-w-0 space-y-14 xl:col-start-1 xl:row-start-1">
            <WatchProviders tmdbId={details.id} mediaType={details.mediaType} />

            <section>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Ficha
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-t border-line pt-3">
                    <dt className="text-xs text-mute">{fact.label}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {details.networks.length ? (
                <div className="mt-8">
                  <p className="text-sm text-mute">Redes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {details.networks.map((network) => (
                      <span
                        key={network.id}
                        className="rounded-full bg-surface-2 px-3 py-1 text-sm"
                      >
                        {network.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {details.productionCompanies.length ? (
                <div className="mt-6">
                  <p className="text-sm text-mute">Produção</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {details.productionCompanies.map((company) => (
                      <span
                        key={company.id}
                        className="rounded-full bg-surface-2 px-3 py-1 text-sm"
                      >
                        {company.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {details.keywords.length ? (
                <div className="mt-6">
                  <p className="text-sm text-mute">Keywords</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {details.keywords.map((keyword) => {
                      const params = new URLSearchParams({
                        keyword: String(keyword.id),
                        name: keyword.name,
                      })

                      return (
                        <Link
                          key={keyword.id}
                          href={`/search?${params.toString()}`}
                          aria-label={`Buscar títulos com a keyword ${keyword.name}`}
                          tabIndex={0}
                          className="rounded-full bg-surface-2 px-3 py-1 text-sm transition hover:bg-white/15 hover:text-white"
                        >
                          {keyword.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            {details.mediaType === 'TV' && details.seasons.length ? (
              <EpisodeTracker
                seasons={details.seasons}
                selectedSeason={selectedSeason}
                season={season}
                isSeasonLoading={isSeasonLoading}
                onSelectSeason={setSelectedSeason}
              />
            ) : null}

            <TitleCast cast={details.credits.cast} />

            {details.videos.length ? (
              <section>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Vídeos
                </h2>
                <div className="hide-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                  {details.videos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setActiveTrailer(video.key)}
                      className="w-[280px] shrink-0 overflow-hidden rounded-lg bg-surface text-left transition duration-200 hover:bg-surface-2"
                    >
                      <div className="relative aspect-video bg-black">
                        <img
                          src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover opacity-80"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-white">
                          <IconPlay className="size-10" />
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-medium">
                          {video.name}
                        </p>
                        <p className="mt-1 text-xs text-mute">{video.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="-mx-4 space-y-10 sm:-mx-8">
              {details.recommendations.length ? (
                <MediaRow title="Recomendados" items={details.recommendations} />
              ) : null}
              {details.similar.length ? (
                <MediaRow title="Títulos semelhantes" items={details.similar} />
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-14 text-xs text-mute">
          Metadados fornecidos por{' '}
          <Link
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            TMDB
          </Link>
          .
        </p>
      </div>

      <TrackingDock />
      <TrailerModal
        videoKey={activeTrailer}
        onClose={() => setActiveTrailer(null)}
      />
    </div>
  )
}
