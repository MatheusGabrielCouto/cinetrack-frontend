'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { TmdbImage } from '@/components/media/tmdb-image'
import { WATCH_STATUS_LABELS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn, formatYear } from '@/lib/utils'
import type { TmdbMedia } from '@/types'

const ROTATE_MS = 9000

const STATUS_CHIPS = [
  WATCH_STATUS_LABELS.WANT_TO_WATCH,
  WATCH_STATUS_LABELS.WATCHING,
  WATCH_STATUS_LABELS.WATCHED,
]

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

  const year = formatYear(current?.releaseDate)
  const titleHref = current
    ? `/title/${current.mediaType.toLowerCase()}/${current.id}`
    : '/discover'

  return (
    <section
      className="relative -mt-16 min-h-[88vh] overflow-hidden sm:min-h-[90vh]"
      aria-roledescription={canRotate ? 'carrossel' : undefined}
      aria-label="Apresentação do CineTrack"
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

      {!current ? (
        <div className="absolute inset-0 bg-surface" />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg from-[12%] via-bg/85 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/50" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bg to-transparent" />

      {canRotate ? (
        <>
          <button
            type="button"
            aria-label="Capa anterior do catálogo"
            onClick={() => handleStep(-1)}
            className="absolute left-2 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center text-white/70 transition hover:text-white md:flex"
          >
            <IconChevronLeft className="size-9" />
          </button>
          <button
            type="button"
            aria-label="Próxima capa do catálogo"
            onClick={() => handleStep(1)}
            className="absolute right-2 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center text-white/70 transition hover:text-white md:flex"
          >
            <IconChevronRight className="size-9" />
          </button>
        </>
      ) : null}

      <div className="relative mx-auto flex min-h-[88vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-20 pt-36 sm:min-h-[90vh] sm:px-8 sm:pb-24">
        <div className="hero-copy-in max-w-2xl">
          <h1 className="font-display text-[clamp(2.6rem,8vw,5.4rem)] font-extrabold leading-[0.92] tracking-tight drop-shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
            Acompanhe o que você assiste.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/90 sm:text-lg">
            Monte a lista, marque o episódio e dê nota. O filme você vê no
            streaming ou no cinema. Aqui fica o controle.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Status da lista">
            {STATUS_CHIPS.map((label) => (
              <li
                key={label}
                className="rounded-sm border border-white/25 bg-black/35 px-2.5 py-1 text-[13px] font-medium text-ink"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/register">
            <Button variant="primary" size="lg" className="h-12 min-w-[11rem] px-7 text-base">
              Criar conta
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="secondary" size="lg" className="h-12 px-6 text-base">
              Explorar catálogo
            </Button>
          </Link>
        </div>

        {current ? (
          <p className="mt-8 max-w-xl text-sm text-mute">
            Capa do catálogo:{' '}
            <Link
              href={titleHref}
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              {current.title}
              {year ? ` (${year})` : ''}
            </Link>
            . Ficha e onde assistir, sem reprodução.
          </p>
        ) : null}

        {canRotate ? (
          <div className="mt-6 flex items-center gap-1">
            {slides.map((item, index) => (
              <button
                key={`${item.mediaType}-${item.id}-dot`}
                type="button"
                aria-label={`Mostrar capa de ${item.title}`}
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
        {current ? `Capa do catálogo: ${current.title}` : 'CineTrack'}
      </p>
    </section>
  )
}
