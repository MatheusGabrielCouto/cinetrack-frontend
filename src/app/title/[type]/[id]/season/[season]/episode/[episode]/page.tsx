'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TitleLibraryProvider } from '@/components/library/title-library-context'
import { IconPlay } from '@/components/icons'
import { EpisodeHero } from '@/components/media/episode-hero'
import { TitleCast } from '@/components/media/title-cast'
import { TrailerModal } from '@/components/media/trailer-modal'
import { TmdbImage } from '@/components/media/tmdb-image'
import { tmdbApi } from '@/lib/tmdb/client'
import type { TmdbEpisodeDetails, TmdbMediaDetails } from '@/types'

const CREW_LABELS: Record<string, string> = {
  Director: 'Direção',
  Writer: 'Roteiro',
  Screenplay: 'Roteiro',
  Teleplay: 'Roteiro',
}

export default function EpisodeDetailPage() {
  const params = useParams<{
    type: string
    id: string
    season: string
    episode: string
  }>()
  const tvId = Number(params.id)
  const seasonNumber = Number(params.season)
  const episodeNumber = Number(params.episode)
  const isTv = params.type === 'tv'

  const [show, setShow] = useState<TmdbMediaDetails | null>(null)
  const [episode, setEpisode] = useState<TmdbEpisodeDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null)

  useEffect(() => {
    if (!isTv || Number.isNaN(tvId) || Number.isNaN(seasonNumber) || Number.isNaN(episodeNumber)) {
      setError('Episódio inválido')
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [nextShow, nextEpisode] = await Promise.all([
          tmdbApi.fullDetails('TV', tvId),
          tmdbApi.episodeDetails(tvId, seasonNumber, episodeNumber),
        ])
        setShow(nextShow)
        setEpisode(nextEpisode)
      } catch {
        setError('Não foi possível carregar este episódio no TMDB')
        setShow(null)
        setEpisode(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [episodeNumber, isTv, seasonNumber, tvId])

  return isLoading ? (
    <EpisodeSkeleton />
  ) : error || !show || !episode ? (
    <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8">
      <p className="text-accent">{error ?? 'Episódio não encontrado'}</p>
      <Link
        href={Number.isNaN(tvId) ? '/discover' : `/title/tv/${tvId}#episodios`}
        className="mt-4 inline-block text-sm font-semibold text-ink underline-offset-4 hover:underline"
      >
        Voltar à série
      </Link>
    </div>
  ) : (
    <TitleLibraryProvider
      tmdbId={show.id}
      mediaType="TV"
      genreIds={show.genreIds ?? []}
      seasons={show.seasons}
      releaseDate={show.releaseDate}
    >
      <EpisodeDetailView
        show={show}
        episode={episode}
        activeTrailer={activeTrailer}
        onPlayTrailer={setActiveTrailer}
      />
    </TitleLibraryProvider>
  )
}

const EpisodeSkeleton = () => (
  <div className="relative -mt-16 min-h-[72vh]">
    <div className="absolute inset-0 bg-surface-2" />
    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/40" />
  </div>
)

type EpisodeDetailViewProps = {
  show: TmdbMediaDetails
  episode: TmdbEpisodeDetails
  activeTrailer: string | null
  onPlayTrailer: (key: string | null) => void
}

const EpisodeDetailView = ({
  show,
  episode,
  activeTrailer,
  onPlayTrailer,
}: EpisodeDetailViewProps) => {
  const crewRows = Object.values(
    episode.crew.reduce<
      Record<string, { label: string; people: TmdbEpisodeDetails['crew'] }>
    >((rows, person) => {
      const label = CREW_LABELS[person.job]
      if (!label) return rows
      const current = rows[label] ?? { label, people: [] }
      if (!current.people.some((entry) => entry.id === person.id)) {
        current.people.push(person)
      }
      rows[label] = current
      return rows
    }, {}),
  )

  return (
    <div>
      <EpisodeHero show={show} episode={episode} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-24 sm:px-8">
        {crewRows.length ? (
          <dl className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {crewRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-mute">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {row.people.map((person, index) => (
                    <span key={`${person.id}-${person.name}`}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={`/person/${person.id}`}
                        className="transition hover:text-white/80 hover:underline hover:underline-offset-4"
                      >
                        {person.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-12 space-y-12">
          <TitleCast cast={episode.guestStars} title="Participações" />
          <TitleCast cast={episode.cast} title="Elenco" />

          {episode.stills.length ? (
            <section>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Cenas
              </h2>
              <div className="hide-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                {episode.stills.map((path) => (
                  <div
                    key={path}
                    className="relative aspect-video w-[260px] shrink-0 overflow-hidden rounded-md bg-surface-2 sm:w-[320px]"
                  >
                    <TmdbImage
                      path={path}
                      alt=""
                      size="w780"
                      fill
                      sizes="320px"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {episode.videos.length ? (
            <section>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Vídeos
              </h2>
              <div className="hide-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                {episode.videos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => onPlayTrailer(video.key)}
                    className="group relative aspect-video w-[260px] shrink-0 overflow-hidden rounded-md bg-surface-2 text-left sm:w-[320px]"
                    aria-label={`Reproduzir ${video.name}`}
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-0 bg-black/25" />
                    <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/65 text-white">
                      <IconPlay className="size-4" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-sm font-semibold text-white">
                      {video.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <TrailerModal
        videoKey={activeTrailer}
        onClose={() => onPlayTrailer(null)}
      />
    </div>
  )
}
