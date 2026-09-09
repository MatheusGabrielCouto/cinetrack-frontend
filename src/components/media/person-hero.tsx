'use client'

import { useState } from 'react'
import { IconExternal } from '@/components/icons'
import { TmdbImage } from '@/components/media/tmdb-image'
import type { TmdbPersonDetails } from '@/types'

type PersonHeroProps = {
  person: TmdbPersonDetails
  backdropPath: string | null
  departmentLabel: string | null
  lifeLabel: string | null
  socials: Array<{ label: string; href: string }>
}

export const PersonHero = ({
  person,
  backdropPath,
  departmentLabel,
  lifeLabel,
  socials,
}: PersonHeroProps) => {
  const [bioOpen, setBioOpen] = useState(false)
  const bio = person.biography.trim()
  const bioLong = bio.length > 420

  const handleToggleBio = () => {
    setBioOpen((open) => !open)
  }

  return (
    <section className="relative -mt-16 min-h-[88vh] w-full overflow-hidden">
      <TmdbImage
        path={backdropPath ?? person.profilePath}
        alt=""
        size="w1280"
        fill
        priority
        sizes="100vw"
        imgClassName="object-cover object-top hero-kenburns"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/82 to-bg/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-black/50" />

      <div className="relative mx-auto flex min-h-[88vh] w-full max-w-[1400px] items-end px-4 pb-10 pt-28 sm:px-8 sm:pb-14">
        <div className="grid w-full items-end gap-8 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
          <div className="title-hero-in relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-md bg-surface-2 shadow-[0_28px_70px_rgba(0,0,0,0.62)] sm:max-w-[220px] lg:mx-0 lg:max-w-none">
            <TmdbImage
              path={person.profilePath}
              alt={person.name}
              size="h632"
              fill
              priority
              sizes="260px"
            />
          </div>

          <div className="min-w-0 max-w-3xl">
            <h1 className="title-hero-in font-display text-[2.6rem] font-bold leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl">
              {person.name}
            </h1>

            <div className="title-hero-in-delay mt-5 flex flex-wrap items-center gap-2">
              {departmentLabel ? (
                <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                  {departmentLabel}
                </span>
              ) : null}
              {lifeLabel ? (
                <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                  {lifeLabel}
                </span>
              ) : null}
              {person.placeOfBirth ? (
                <span className="rounded bg-black/45 px-2.5 py-1 text-sm text-white/80">
                  {person.placeOfBirth}
                </span>
              ) : null}
            </div>

            {bio ? (
              <div className="title-hero-copy mt-6 max-w-[62ch]">
                <p
                  className={
                    bioOpen || !bioLong
                      ? 'text-base leading-relaxed text-white/88'
                      : 'line-clamp-5 text-base leading-relaxed text-white/88'
                  }
                >
                  {bio}
                </p>
                {person.biographyInEnglish ? (
                  <p className="mt-2 text-xs text-white/45">
                    Biografia em inglês — TMDB ainda não tem versão em português.
                  </p>
                ) : null}
                {bioLong ? (
                  <button
                    type="button"
                    onClick={handleToggleBio}
                    className="mt-2 text-sm font-semibold text-white/80 transition hover:text-white"
                  >
                    {bioOpen ? 'Mostrar menos' : 'Ler mais'}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="title-hero-copy mt-6 max-w-[62ch] text-base leading-relaxed text-white/55">
                Sem biografia no TMDB.
              </p>
            )}

            {socials.length ? (
              <div className="mt-7 flex flex-wrap gap-2">
                {socials.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
                  >
                    <IconExternal className="size-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
