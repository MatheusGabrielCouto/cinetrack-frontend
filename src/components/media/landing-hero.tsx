'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconInfo, IconPlay, IconStar } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn, formatYear } from '@/lib/utils'
import type { TmdbMedia } from '@/types'

const ROTATE_MS = 9000

type LandingHeroProps = {
  items: TmdbMedia[]
}

export const LandingHero = ({ items }: LandingHeroProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const slides = items.filter((item) => item.backdropPath).slice(0, 6)
  const [active, setActive] = useState(0)

  const current = slides[active] ?? items[0] ?? null
  const canRotate = slides.length > 1
  const autoRotate = canRotate && !reducedMotion

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
      <section className="relative -mt-16 min-h-[92vh] overflow-hidden bg-surface">
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/70" />
        <div className="relative mx-auto flex min-h-[92vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-28 pt-36 sm:px-8">
          <h1 className="max-w-2xl font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
            Filmes, séries e a sua lista.
          </h1>
          <p className="mt-4 max-w-lg text-base text-mute">
            Assista o que está em alta e acompanhe o que você já começou.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button variant="light" size="lg">
                <IconPlay className="size-5" />
                Assista agora
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
  const year = formatYear(current.releaseDate)
  const match = Math.round(current.voteAverage * 10)

  return (
    <section
      className="relative -mt-16 min-h-[92vh] overflow-hidden sm:min-h-[96vh]"
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
              'object-cover object-top',
              index === active && 'hero-kenburns',
            )}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg from-10% via-bg/80 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-black/45" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

      {canRotate ? (
        <>
          <button
            type="button"
            aria-label="Título anterior"
            onClick={() => handleStep(-1)}
            className="absolute left-2 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center text-white/70 transition hover:text-white md:flex"
          >
            <IconChevronLeft className="size-9" />
          </button>
          <button
            type="button"
            aria-label="Próximo título"
            onClick={() => handleStep(1)}
            className="absolute right-2 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center text-white/70 transition hover:text-white md:flex"
          >
            <IconChevronRight className="size-9" />
          </button>
        </>
      ) : null}

      <div className="relative mx-auto flex min-h-[92vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-24 pt-36 sm:min-h-[96vh] sm:px-8 sm:pb-28">
        <div key={`${current.mediaType}-${current.id}`} className="hero-copy-in max-w-2xl">
          <h1 className="font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[0.92] tracking-tight drop-shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
            {current.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {match > 0 ? (
              <span className="font-semibold text-ok">{match}% relevante</span>
            ) : null}
            {year ? <span className="text-mute">{year}</span> : null}
            <span className="rounded-sm border border-white/35 px-1.5 py-0.5 text-[11px] font-medium text-ink">
              {MEDIA_TYPE_LABELS[current.mediaType]}
            </span>
            {current.voteAverage > 0 ? (
              <span className="inline-flex items-center gap-1 text-spot">
                <IconStar className="size-3.5" />
                {current.voteAverage.toFixed(1)}
              </span>
            ) : null}
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/90 sm:text-lg line-clamp-3">
            {current.overview || 'Sinopse indisponível.'}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={registerHref}>
            <Button variant="light" size="lg" className="h-12 min-w-[10rem] px-7 text-base">
              <IconPlay className="size-5" />
              Assista agora
            </Button>
          </Link>
          <Link href={registerHref}>
            <Button variant="secondary" size="lg" className="h-12 px-6 text-base">
              <IconInfo className="size-5" />
              Mais informações
            </Button>
          </Link>
        </div>

        {canRotate ? (
          <div className="mt-8 flex items-center gap-1">
            {slides.map((item, index) => (
              <button
                key={`${item.mediaType}-${item.id}-dot`}
                type="button"
                aria-label={`Mostrar ${item.title}`}
                aria-current={index === active}
                onClick={() => handleSelect(index)}
                className="flex h-11 items-center px-1"
              >
                <span
                  className={cn(
                    'relative block h-[3px] overflow-hidden rounded-full bg-white/35',
                    index === active ? 'w-8' : 'w-3',
                  )}
                >
                  {index === active && autoRotate ? (
                    <span
                      key={active}
                      className="hero-progress absolute inset-y-0 left-0 w-full origin-left bg-ink"
                    />
                  ) : index === active ? (
                    <span className="absolute inset-0 bg-ink" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {current.title}
      </p>
    </section>
  )
}
