'use client'

import { useEffect, useState } from 'react'
import { TmdbImage } from '@/components/media/tmdb-image'
import { tmdbApi } from '@/lib/tmdb/client'
import type { MediaType, TmdbWatchProviders } from '@/types'

type WatchProvidersProps = {
  tmdbId: number
  mediaType: MediaType
}

const ProviderGroup = ({
  title,
  providers,
}: {
  title: string
  providers: TmdbWatchProviders['flatrate']
}) => {
  if (!providers.length) return null

  return (
    <div>
      <p className="text-sm text-mute">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {providers.map((provider) => (
          <li
            key={`${title}-${provider.id}`}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5"
          >
            <span className="relative size-8 overflow-hidden rounded-md bg-black/40">
              <TmdbImage
                path={provider.logoPath}
                alt={provider.name}
                size="w185"
                fill
                sizes="32px"
              />
            </span>
            <span className="pr-1 text-sm font-medium">{provider.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const WatchProviders = ({ tmdbId, mediaType }: WatchProvidersProps) => {
  const [providers, setProviders] = useState<TmdbWatchProviders | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        setProviders(await tmdbApi.watchProviders(mediaType, tmdbId, 'BR'))
      } catch {
        setProviders(null)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [tmdbId, mediaType])

  if (isLoading) {
    return (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Onde assistir
        </h2>
        <p className="mt-3 text-sm text-mute">Buscando opções no Brasil…</p>
      </section>
    )
  }

  if (
    !providers ||
    (!providers.flatrate.length &&
      !providers.rent.length &&
      !providers.buy.length)
  ) {
    return (
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Onde assistir
        </h2>
        <p className="mt-3 text-sm text-mute">
          Sem opções de streaming listadas para o Brasil no momento.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Onde assistir
        </h2>
        {providers.link ? (
          <a
            href={providers.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-mute underline-offset-2 hover:text-ink hover:underline"
          >
            JustWatch
          </a>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <ProviderGroup title="Incluso na assinatura" providers={providers.flatrate} />
        <ProviderGroup title="Aluguel" providers={providers.rent} />
        <ProviderGroup title="Compra" providers={providers.buy} />
      </div>
    </section>
  )
}
