'use client'

import { useState } from 'react'
import { tmdbImage } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'

type TmdbSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

type TmdbImageProps = {
  path: string | null | undefined
  alt: string
  size?: TmdbSize
  className?: string
  imgClassName?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
}

export const TmdbImage = ({
  path,
  alt,
  size = 'w342',
  className,
  imgClassName,
  priority = false,
  fill = false,
  sizes,
}: TmdbImageProps) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = tmdbImage(path, size)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface-2 text-xs text-mute',
          fill ? 'absolute inset-0' : 'h-full w-full',
          className,
        )}
      >
        Sem imagem
      </div>
    )
  }

  return (
    <div className={cn(fill ? 'absolute inset-0' : 'relative h-full w-full', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-surface-2 transition-opacity duration-300',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
      />
      {/* Direct CDN URL — evita o proxy/otimizador do Next, bem mais rápido no TMDB */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
