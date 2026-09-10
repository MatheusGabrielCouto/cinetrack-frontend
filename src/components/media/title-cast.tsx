import Link from 'next/link'
import { TmdbImage } from '@/components/media/tmdb-image'
import type { TmdbCredits } from '@/types'

type TitleCastProps = {
  cast: TmdbCredits['cast']
  title?: string
}

export const TitleCast = ({ cast, title = 'Elenco' }: TitleCastProps) => {
  if (!cast.length) return null

  return (
    <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
      <div className="hide-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 18).map((person) => (
          <Link
            key={person.id}
            href={`/person/${person.id}`}
            aria-label={`Ver detalhes de ${person.name}`}
            tabIndex={0}
            className="group w-[128px] shrink-0 focus-visible:outline-none"
          >
            <article>
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
                <TmdbImage
                  path={person.profilePath}
                  alt={person.name}
                  size="w185"
                  fill
                  sizes="128px"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-white">
                {person.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-mute">
                {person.character}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
