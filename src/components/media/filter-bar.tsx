'use client'

import { Dropdown, DropdownItem } from '@/components/ui/dropdown'
import type { MediaType } from '@/types'
import type { TmdbGenre } from '@/lib/tmdb/client'

export type ContentFilter = 'all' | MediaType

type FilterBarProps = {
  contentFilter: ContentFilter
  onContentFilterChange: (value: ContentFilter) => void
  genres: TmdbGenre[]
  selectedGenreId: number | null
  onGenreChange: (id: number | null) => void
  sort: 'trending' | 'popular' | 'top_rated'
  onSortChange: (value: 'trending' | 'popular' | 'top_rated') => void
}

const typeOptions: Array<{ value: ContentFilter; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'MOVIE', label: 'Filmes' },
  { value: 'TV', label: 'Séries' },
]

const sortOptions = [
  { value: 'trending' as const, label: 'Em alta' },
  { value: 'popular' as const, label: 'Populares' },
  { value: 'top_rated' as const, label: 'Mais bem avaliados' },
]

const triggerClass =
  'h-9 whitespace-nowrap rounded border border-white/35 bg-black/40 px-3 text-ink hover:bg-white/10'

export const FilterBar = ({
  contentFilter,
  onContentFilterChange,
  genres,
  selectedGenreId,
  onGenreChange,
  sort,
  onSortChange,
}: FilterBarProps) => {
  const typeLabel =
    typeOptions.find((option) => option.value === contentFilter)?.label ?? 'Tudo'
  const sortLabel =
    sortOptions.find((option) => option.value === sort)?.label ?? 'Em alta'
  const genreLabel =
    genres.find((genre) => genre.id === selectedGenreId)?.name ?? 'Gêneros'

  return (
    <div className="relative z-20 flex flex-wrap items-center gap-2 px-4 sm:px-8">
      <Dropdown
        ariaLabel="Filtrar por tipo"
        triggerClassName={triggerClass}
        trigger={<span>{typeLabel}</span>}
      >
        {typeOptions.map((option) => (
          <DropdownItem
            key={option.value}
            active={contentFilter === option.value}
            onClick={() => onContentFilterChange(option.value)}
          >
            {option.label}
          </DropdownItem>
        ))}
      </Dropdown>

      {genres.length > 0 ? (
        <Dropdown
          ariaLabel="Filtrar por gênero"
          triggerClassName={triggerClass}
          trigger={<span>{genreLabel}</span>}
        >
          <div className="max-h-72 overflow-y-auto">
            <DropdownItem
              active={selectedGenreId === null}
              onClick={() => onGenreChange(null)}
            >
              Todos os gêneros
            </DropdownItem>
            {genres.map((genre) => (
              <DropdownItem
                key={genre.id}
                active={selectedGenreId === genre.id}
                onClick={() => onGenreChange(genre.id)}
              >
                {genre.name}
              </DropdownItem>
            ))}
          </div>
        </Dropdown>
      ) : null}

      <Dropdown
        ariaLabel="Ordenar catálogo"
        triggerClassName={triggerClass}
        trigger={<span>{sortLabel}</span>}
      >
        {sortOptions.map((option) => (
          <DropdownItem
            key={option.value}
            active={sort === option.value}
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  )
}
