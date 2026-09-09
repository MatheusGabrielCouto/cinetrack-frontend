'use client'

import { useEffect, useRef, useState } from 'react'
import { tmdbImage } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'

type TmdbSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'h632' | 'original'

export const POSTER_FALLBACK = '/poster-fallback.png'

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
  const imgRef = useRef<HTMLImageElement>(null)
  const remote = tmdbImage(path, size)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const src = !remote || failed ? POSTER_FALLBACK : remote

  useEffect(() => {
    setFailed(false)
    setLoaded(false)
  }, [path, size])

  useEffect(() => {
    const img = imgRef.current
    if (!img?.complete) return
    if (img.naturalWidth > 0) setLoaded(true)
  }, [src])

  const handleError = () => {
    if (src !== POSTER_FALLBACK) {
      setFailed(true)
      setLoaded(false)
      return
    }
    setLoaded(true)
  }

  const handleLoad = () => {
    setLoaded(true)
  }

  return (
    <div className={cn(fill ? 'absolute inset-0' : 'relative h-full w-full', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-surface-2 transition-opacity duration-300',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
