'use client'

import Link from 'next/link'
import { TmdbImage } from '@/components/media/tmdb-image'
import type { TmdbCollectionSummary } from '@/types'

type CollectionCardProps = {
  collection: TmdbCollectionSummary
}

export const CollectionCard = ({ collection }: CollectionCardProps) => {
  const params = new URLSearchParams({
    collection: String(collection.id),
    name: collection.name,
  })

  return (
    <Link
      href={`/search?${params.toString()}`}
      className="group relative block w-[250px] shrink-0 overflow-hidden rounded-md bg-surface-2 focus-visible:outline-none sm:w-[300px]"
      aria-label={`Ver saga ${collection.name} em ordem de lançamento`}
      tabIndex={0}
    >
      <article className="relative aspect-[16/9] overflow-hidden">
        <TmdbImage
          path={collection.backdropPath ?? collection.posterPath}
          alt=""
          size="w780"
          fill
          sizes="300px"
          imgClassName="object-cover transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="text-[11px] font-semibold text-accent">Saga</p>
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold leading-tight text-white">
            {collection.name}
          </h3>
        </div>
      </article>
    </Link>
  )
}
