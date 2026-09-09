'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn, formatYear } from '@/lib/utils'
import type { TmdbMedia } from '@/types'

const ROTATE_MS = 8000

type LandingHeroProps = {
  items: TmdbMedia[]
}

export const LandingHero = ({ items }: LandingHeroProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const slides = items.filter((item) => item.backdropPath).slice(0, 6)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const current = slides[active] ?? items[0] ?? null
  const canRotate = slides.length > 1
  const autoRotate = canRotate && !reducedMotion && !paused

  useEffect(() => {
    if (!autoRotate) return

    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % slides.length)
    }, ROTATE_MS)

    return () => window.clearInterval(timer)
  }, [autoRotate, slides.length, active])

  const handleSelect = (index: number) => {
    setActive(index)
  }

  const handleStep = (direction: -1 | 1) => {
    if (slides.length < 2) return
    setActive((value) => (value + direction + slides.length) % slides.length)
  }

  if (!current) {
    return (
      <section className="relative -mt-16 min-h-[88vh] overflow-hidden bg-surface">
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/60" />
        <div className="relative mx-auto flex min-h-[88vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-24 pt-36 sm:px-8">
          <h1 className="max-w-2xl font-display text-5xl font-bold tracking-tight sm:text-7xl">
            Sua lista. Seu ritmo.
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button variant="light" size="lg">
                Começar agora
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const registerHref = `/register?next=${encodeURIComponent(
    `/title/${current.mediaType.toLowerCase()}/${current.id}`,
  )}`

  return (
    <section
      className="relative -mt-16 min-h-[88vh] overflow-hidden"
      aria-roledescription="carrossel"
      aria-label="Títulos em destaque"
    >
      {slides.map((item, index) => (
        <div
          key={`${item.mediaType}-${item.id}`}
          className={cn(
            'hero-slide absolute inset-0',
            index === active ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden={index !== active}
        >
          <TmdbImage
            path={item.backdropPath}
            alt=""
            size="w1280"
            fill
            priority={index === 0}
            sizes="100vw"
            imgClassName={cn(
              'object-top',
              index === active && 'hero-kenburns',
              paused && 'is-paused',
            )}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-black/50" />

      <div className="relative mx-auto flex min-h-[88vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-28 pt-36 sm:px-8 sm:pb-32">
        <div key={`${current.mediaType}-${current.id}`} className="hero-copy-in">
          <p className="text-sm text-mute">
            {MEDIA_TYPE_LABELS[current.mediaType]}
            {formatYear(current.releaseDate)
              ? ` · ${formatYear(current.releaseDate)}`
              : ''}
            {` · ${current.voteAverage.toFixed(1)}`}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl md:text-7xl">
            {current.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/90 sm:text-base line-clamp-3 sm:line-clamp-4">
            {current.overview || 'Sinopse indisponível.'}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={registerHref}>
            <Button variant="light" size="lg">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
              Começar agora
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Entrar
            </Button>
          </Link>
        </div>
      </div>

      {canRotate ? (
        <div className="absolute bottom-8 left-4 right-4 z-10 flex items-center justify-between gap-3 sm:left-8 sm:right-8">
          <div className="flex items-center gap-1">
            {slides.map((item, index) => (
              <button
                key={`${item.mediaType}-${item.id}-dot`}
                type="button"
                aria-label={`Mostrar ${item.title}`}
                aria-current={index === active}
                onClick={() => handleSelect(index)}
                className="flex h-11 w-8 items-center justify-center"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    index === active ? 'w-5 bg-ink' : 'w-1.5 bg-white/40',
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {reducedMotion ? null : (
              <button
                type="button"
                aria-label={paused ? 'Retomar destaque' : 'Pausar destaque'}
                onClick={() => setPaused((value) => !value)}
                className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-ink"
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              aria-label="Título anterior"
              onClick={() => handleStep(-1)}
              className="hidden size-11 items-center justify-center rounded-full border border-white/20 bg-black/40 md:flex"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.4 4.7 7.1 12l8.3 7.3 1.3-1.5L9.9 12l6.8-6.1z"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Próximo título"
              onClick={() => handleStep(1)}
              className="hidden size-11 items-center justify-center rounded-full border border-white/20 bg-black/40 md:flex"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8.6 4.7 7.3 6.2 14.1 12l-6.8 6.1 1.3 1.5L16.9 12z"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {current.title}
      </p>
    </section>
  )
}
