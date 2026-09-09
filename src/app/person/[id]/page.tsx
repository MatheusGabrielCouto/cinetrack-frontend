'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { IconClose } from '@/components/icons'
import { MediaRow } from '@/components/media/media-poster'
import { PersonHero } from '@/components/media/person-hero'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn, formatRating, formatYear } from '@/lib/utils'
import type { TmdbPersonCredit, TmdbPersonDetails } from '@/types'

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Atuação',
  Directing: 'Direção',
  Writing: 'Roteiro',
  Production: 'Produção',
  Sound: 'Som',
  Camera: 'Fotografia',
  Editing: 'Montagem',
  Art: 'Arte',
  'Costume & Make-Up': 'Figurino',
  Lighting: 'Iluminação',
  'Visual Effects': 'Efeitos visuais',
  Crew: 'Equipe',
  Creator: 'Criação',
}

type FilmographyTab = 'all' | 'movie' | 'tv' | 'crew'

const TABS: Array<{ id: FilmographyTab; label: string }> = [
  { id: 'all', label: 'Tudo' },
  { id: 'movie', label: 'Filmes' },
  { id: 'tv', label: 'Séries' },
  { id: 'crew', label: 'Equipe' },
]

const PAGE_SIZE = 36

const formatLongDate = (value: string | null) => {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatAge = (birthday: string | null, deathday: string | null) => {
  if (!birthday) return null
  const start = new Date(`${birthday}T00:00:00`)
  const end = deathday ? new Date(`${deathday}T00:00:00`) : new Date()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  let age = end.getFullYear() - start.getFullYear()
  const month = end.getMonth() - start.getMonth()
  if (month < 0 || (month === 0 && end.getDate() < start.getDate())) {
    age -= 1
  }

  return age
}

const departmentLabel = (value: string | null) => {
  if (!value) return null
  return DEPARTMENT_LABELS[value] ?? value
}

const socialLinks = (person: TmdbPersonDetails) => {
  const links: Array<{ label: string; href: string }> = []

  if (person.imdbId) {
    links.push({
      label: 'IMDb',
      href: `https://www.imdb.com/name/${person.imdbId}`,
    })
  }
  if (person.instagramId) {
    links.push({
      label: 'Instagram',
      href: `https://www.instagram.com/${person.instagramId}`,
    })
  }
  if (person.twitterId) {
    links.push({
      label: 'X',
      href: `https://x.com/${person.twitterId}`,
    })
  }
  if (person.facebookId) {
    links.push({
      label: 'Facebook',
      href: `https://www.facebook.com/${person.facebookId}`,
    })
  }
  if (person.homepage) {
    links.push({ label: 'Site', href: person.homepage })
  }

  return links
}

const uniqueByTitle = (credits: TmdbPersonCredit[]) => {
  const merged = new Map<string, TmdbPersonCredit>()
  const ranked = [...credits].sort((a, b) => {
    if (a.creditKind === b.creditKind) return b.popularity - a.popularity
    return a.creditKind === 'cast' ? -1 : 1
  })

  for (const credit of ranked) {
    const key = `${credit.mediaType}-${credit.id}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, credit)
      continue
    }

    if (existing.creditKind === 'cast' && credit.creditKind === 'crew') {
      merged.set(key, { ...existing, job: existing.job || credit.job })
    }
  }

  return [...merged.values()].sort((a, b) => {
    const dateA = a.releaseDate ?? ''
    const dateB = b.releaseDate ?? ''
    if (dateA === dateB) return b.popularity - a.popularity
    return dateB.localeCompare(dateA)
  })
}

const creditRole = (credit: TmdbPersonCredit) => {
  if (credit.creditKind === 'cast') {
    return credit.character || 'Elenco'
  }
  return credit.job || credit.department || 'Equipe'
}

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>()
  const personId = Number(params.id)

  const [person, setPerson] = useState<TmdbPersonDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (Number.isNaN(personId) || personId <= 0) {
      setError('Pessoa inválida')
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        setPerson(await tmdbApi.person(personId))
      } catch {
        setError('Não foi possível carregar esta pessoa no TMDB')
        setPerson(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [personId])

  return (
    <RequireAuth>
      {isLoading ? (
        <PersonDetailSkeleton />
      ) : error || !person ? (
        <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8">
          <p className="text-accent">{error ?? 'Pessoa não encontrada'}</p>
        </div>
      ) : (
        <PersonDetailView person={person} />
      )}
    </RequireAuth>
  )
}

const PersonDetailSkeleton = () => (
  <div className="relative -mt-16 min-h-[88vh]">
    <div className="absolute inset-0 bg-surface-2" />
    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/40" />
    <div className="relative mx-auto flex min-h-[88vh] max-w-[1400px] items-end px-4 pb-14 sm:px-8">
      <div className="flex w-full items-end gap-8">
        <div className="hidden aspect-[2/3] w-[240px] animate-pulse rounded-md bg-white/10 lg:block" />
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-16 w-full max-w-lg animate-pulse rounded bg-white/10" />
          <div className="h-24 w-full animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </div>
  </div>
)

const PersonDetailView = ({ person }: { person: TmdbPersonDetails }) => {
  const [tab, setTab] = useState<FilmographyTab>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)

  const knownFor = useMemo(() => {
    const unique = (credits: TmdbPersonCredit[]) =>
      [...credits]
        .filter((credit) => credit.posterPath)
        .sort((a, b) => b.popularity - a.popularity)
        .filter(
          (credit, index, list) =>
            list.findIndex(
              (item) =>
                item.id === credit.id && item.mediaType === credit.mediaType,
            ) === index,
        )
        .slice(0, 12)

    const acting = unique(
      person.credits.filter((credit) => credit.creditKind === 'cast'),
    )
    if (acting.length) return acting
    return unique(person.credits)
  }, [person.credits])

  const backdropPath =
    knownFor.find((credit) => credit.backdropPath)?.backdropPath ??
    person.credits.find((credit) => credit.backdropPath)?.backdropPath ??
    null

  const movieCount = useMemo(
    () =>
      uniqueByTitle(
        person.credits.filter((credit) => credit.mediaType === 'MOVIE'),
      ).length,
    [person.credits],
  )

  const seriesCount = useMemo(
    () =>
      uniqueByTitle(person.credits.filter((credit) => credit.mediaType === 'TV'))
        .length,
    [person.credits],
  )

  const filmography = useMemo(() => {
    if (tab === 'crew') {
      return uniqueByTitle(
        person.credits.filter((credit) => credit.creditKind === 'crew'),
      )
    }

    const acting = person.credits.filter((credit) => credit.creditKind === 'cast')
    if (tab === 'movie') {
      return uniqueByTitle(acting.filter((credit) => credit.mediaType === 'MOVIE'))
    }
    if (tab === 'tv') {
      return uniqueByTitle(acting.filter((credit) => credit.mediaType === 'TV'))
    }
    return uniqueByTitle(acting.length ? acting : person.credits)
  }, [person.credits, tab])

  const visibleCredits = filmography.slice(0, visibleCount)
  const age = formatAge(person.birthday, person.deathday)
  const birthdayLabel = formatLongDate(person.birthday)
  const deathdayLabel = formatLongDate(person.deathday)
  const socials = socialLinks(person)
  const aka = person.alsoKnownAs.filter((name) => name !== person.name).slice(0, 10)

  useEffect(() => {
    const previous = document.title
    document.title = `${person.name} · CineTrack`
    return () => {
      document.title = previous
    }
  }, [person.name])

  const facts = useMemo(() => {
    const items: Array<{ label: string; value: string }> = []

    if (departmentLabel(person.knownForDepartment)) {
      items.push({
        label: 'Conhecido por',
        value: departmentLabel(person.knownForDepartment) ?? '—',
      })
    }
    if (birthdayLabel) {
      items.push({
        label: person.deathday ? 'Nascimento' : 'Nascido em',
        value: birthdayLabel,
      })
    }
    if (age != null) {
      items.push({
        label: person.deathday ? 'Idade no falecimento' : 'Idade',
        value: `${age} anos`,
      })
    }
    if (deathdayLabel) {
      items.push({ label: 'Falecimento', value: deathdayLabel })
    }
    if (person.placeOfBirth) {
      items.push({ label: 'Local de nascimento', value: person.placeOfBirth })
    }
    items.push({ label: 'Filmes', value: String(movieCount) })
    items.push({ label: 'Séries', value: String(seriesCount) })

    return items
  }, [
    age,
    birthdayLabel,
    deathdayLabel,
    movieCount,
    person.deathday,
    person.knownForDepartment,
    person.placeOfBirth,
    seriesCount,
  ])

  const handleSelectTab = (next: FilmographyTab) => {
    setTab(next)
    setVisibleCount(PAGE_SIZE)
  }

  const handleShowMore = () => {
    setVisibleCount((count) => count + PAGE_SIZE)
  }

  const handleOpenPhoto = (path: string) => {
    setActivePhoto(path)
  }

  const handleClosePhoto = () => {
    setActivePhoto(null)
  }

  return (
    <div className="relative pb-24">
      <PersonHero
        person={person}
        backdropPath={backdropPath}
        departmentLabel={departmentLabel(person.knownForDepartment)}
        lifeLabel={
          person.deathday && person.birthday
            ? `${formatYear(person.birthday)} – ${formatYear(person.deathday)}`
            : birthdayLabel
              ? `${birthdayLabel}${age != null ? ` · ${age} anos` : ''}`
              : null
        }
        socials={socials}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-8">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="min-w-0 space-y-14 xl:col-start-1 xl:row-start-1">
            {person.photos.length > 1 ? (
              <section>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Fotos
                </h2>
                <div className="hide-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                  {person.photos.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => handleOpenPhoto(path)}
                      aria-label={`Ampliar foto de ${person.name}`}
                      className="relative h-52 w-[140px] shrink-0 overflow-hidden rounded-md bg-surface-2 transition duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:h-64 sm:w-[168px]"
                    >
                      <TmdbImage
                        path={path}
                        alt={person.name}
                        size="h632"
                        fill
                        sizes="168px"
                      />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {knownFor.length ? (
              <div className="-mx-4 sm:-mx-8">
                <MediaRow title="Conhecido por" items={knownFor} />
              </div>
            ) : null}

            <section>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Filmografia
                </h2>
                <p className="text-sm text-mute">
                  {filmography.length}{' '}
                  {filmography.length === 1 ? 'título' : 'títulos'}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    aria-pressed={tab === item.id}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition duration-200',
                      tab === item.id
                        ? 'bg-ink text-bg'
                        : 'bg-surface-2 text-mute hover:text-ink',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {visibleCredits.length ? (
                <ul className="mt-2">
                  {visibleCredits.map((credit) => (
                    <li
                      key={`${credit.mediaType}-${credit.id}-${credit.creditKind}`}
                    >
                      <Link
                        href={`/title/${credit.mediaType.toLowerCase()}/${credit.id}`}
                        aria-label={`Detalhes de ${credit.title}`}
                        tabIndex={0}
                        className="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-surface-2">
                          <TmdbImage
                            path={credit.posterPath}
                            alt={credit.title}
                            size="w185"
                            fill
                            sizes="64px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold transition group-hover:text-white sm:text-base">
                            {credit.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-mute sm:text-sm">
                            {creditRole(credit)}
                            {' · '}
                            {MEDIA_TYPE_LABELS[credit.mediaType]}
                            {formatYear(credit.releaseDate)
                              ? ` · ${formatYear(credit.releaseDate)}`
                              : ''}
                            {credit.episodeCount
                              ? ` · ${credit.episodeCount} eps.`
                              : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-spot">
                          {formatRating(credit.voteAverage)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-sm text-mute">
                  Nenhum título nesta categoria.
                </p>
              )}

              {visibleCount < filmography.length ? (
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="mt-6 rounded bg-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Ver mais
                </button>
              ) : null}
            </section>
          </div>

          <aside className="space-y-8 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-24">
            <section>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ficha
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 xl:grid-cols-1">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-t border-line pt-3">
                    <dt className="text-xs text-mute">{fact.label}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {aka.length ? (
              <section>
                <h2 className="text-sm text-mute">Também conhecido como</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aka.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-surface-2 px-3 py-1 text-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
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

      <PhotoLightbox
        path={activePhoto}
        name={person.name}
        onClose={handleClosePhoto}
      />
    </div>
  )
}

type PhotoLightboxProps = {
  path: string | null
  name: string
  onClose: () => void
}

const PhotoLightbox = ({ path, name, onClose }: PhotoLightboxProps) => {
  useEffect(() => {
    if (!path) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose, path])

  if (!path) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${name}`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[88vh] w-full max-w-md overflow-hidden rounded-lg bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[2/3] w-full">
          <TmdbImage
            path={path}
            alt={name}
            size="original"
            fill
            sizes="512px"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar foto"
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
        >
          <IconClose />
        </button>
      </div>
    </div>
  )
}
