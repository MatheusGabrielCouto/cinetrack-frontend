import { TmdbImage } from '@/components/media/tmdb-image'
import type { TmdbCredits } from '@/types'

type TitleCastProps = {
  cast: TmdbCredits['cast']
}

export const TitleCast = ({ cast }: TitleCastProps) => {
  if (!cast.length) return null

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Elenco
      </h2>
      <div className="hide-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 18).map((person) => (
          <article key={person.id} className="w-[128px] shrink-0">
            <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
              <TmdbImage
                path={person.profilePath}
                alt={person.name}
                size="w185"
                fill
                sizes="128px"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
              {person.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-mute">
              {person.character}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
