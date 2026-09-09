'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { TmdbImage } from '@/components/media/tmdb-image'
import { tmdbApi } from '@/lib/tmdb/client'

type AuthScreenProps = {
  children: ReactNode
}

export const AuthScreen = ({ children }: AuthScreenProps) => {
  const [backdrop, setBackdrop] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const trending = await tmdbApi.trending()
        const featured = trending.find((item) => item.backdropPath)
        setBackdrop(featured?.backdropPath ?? null)
      } catch {
        setBackdrop(null)
      }
    }

    void load()
  }, [])

  return (
    <section className="relative -mt-16 min-h-screen overflow-hidden">
      {backdrop ? (
        <TmdbImage
          path={backdrop}
          alt=""
          size="w1280"
          fill
          priority
          sizes="100vw"
          imgClassName="object-cover hero-kenburns"
        />
      ) : (
        <div className="absolute inset-0 bg-bg" />
      )}

      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/45" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-28">
        <div className="hero-copy-in w-full max-w-[450px] rounded-md bg-black/80 p-8 shadow-[0_16px_40px_rgba(0,0,0,0.55)] sm:p-12">
          {children}
        </div>
      </div>
    </section>
  )
}
