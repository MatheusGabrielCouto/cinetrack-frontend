'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TmdbImage } from '@/components/media/tmdb-image'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { formatYear } from '@/lib/utils'
import type { TmdbMedia } from '@/types'

type HeroBannerProps = {
  media: TmdbMedia
}

export const HeroBanner = ({ media }: HeroBannerProps) => {
  const href = `/title/${media.mediaType.toLowerCase()}/${media.id}`

  return (
    <section className="relative -mt-16 min-h-[78vh] w-full overflow-hidden sm:min-h-[85vh]">
      <TmdbImage
        path={media.backdropPath ?? media.posterPath}
        alt=""
        size="w1280"
        fill
        priority
        sizes="100vw"
        imgClassName="object-top hero-kenburns"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />

      <div className="relative mx-auto flex min-h-[78vh] w-full max-w-[1400px] flex-col justify-end px-4 pb-20 pt-36 sm:min-h-[85vh] sm:px-8 sm:pb-28">
        <h1 className="animate-rise max-w-3xl font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl md:text-7xl">
          {media.title}
        </h1>
        <p className="animate-rise-delay mt-4 text-sm text-mute">
          {MEDIA_TYPE_LABELS[media.mediaType]}
          {formatYear(media.releaseDate)
            ? ` · ${formatYear(media.releaseDate)}`
            : ''}
          {` · ${media.voteAverage.toFixed(1)}`}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/85 sm:text-base line-clamp-4">
          {media.overview || 'Sinopse indisponível.'}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={href}>
            <Button variant="light" size="lg">
              Ver detalhes
            </Button>
          </Link>
          <Link href={href}>
            <Button variant="secondary" size="lg">
              Adicionar à biblioteca
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
