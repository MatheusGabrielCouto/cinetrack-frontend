'use client'

import Link from 'next/link'
import { TmdbImage } from '@/components/media/tmdb-image'
import { cn, toDisplayAssetUrl } from '@/lib/utils'
import type { ListSummary } from '@/types'

type ListCardProps = {
  list: ListSummary
  href?: string
}

const isTmdbPath = (url: string) => url.startsWith('/')

export const ListCard = ({ list, href }: ListCardProps) => {
  const target = href ?? `/lists/${list.id}`
  const cover = list.coverUrl

  return (
    <Link
      href={target}
      className="group block focus-visible:outline-none"
      aria-label={`Abrir lista ${list.name}`}
      tabIndex={0}
    >
      <article className="overflow-hidden rounded-lg border border-line bg-surface transition duration-300 group-hover:border-mute group-hover:bg-surface-2">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
          {cover ? (
            isTmdbPath(cover) ? (
              <TmdbImage
                path={cover}
                alt=""
                size="w780"
                fill
                sizes="400px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src={toDisplayAssetUrl(cover)}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <div className="flex h-full items-end bg-gradient-to-br from-surface-2 via-bg to-black p-4">
              <span className="font-display text-3xl font-bold text-ink/40">
                {list.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <span
            className={cn(
              'absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              list.isPublic
                ? 'bg-ink/90 text-bg'
                : 'bg-black/70 text-mute',
            )}
          >
            {list.isPublic ? 'Pública' : 'Privada'}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-display text-xl font-bold leading-tight text-ink">
              {list.name}
            </h3>
            <p className="mt-1 text-sm text-mute">
              {list.itemCount} {list.itemCount === 1 ? 'título' : 'títulos'}
              {list.owner ? ` · ${list.owner.name}` : ''}
            </p>
          </div>
        </div>
        {list.description ? (
          <p className="line-clamp-2 px-4 py-3 text-sm text-mute">
            {list.description}
          </p>
        ) : (
          <div className="h-3" />
        )}
      </article>
    </Link>
  )
}
