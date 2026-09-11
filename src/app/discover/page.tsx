'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { OnboardingGate } from '@/components/auth/onboarding-gate'
import { FilterBar, type ContentFilter } from '@/components/media/filter-bar'
import { HeroBanner } from '@/components/media/hero-banner'
import { ContinueWatchingRow } from '@/components/media/continue-watching-row'
import { MediaRow, MediaRowSkeleton } from '@/components/media/media-poster'
import { cn } from '@/lib/utils'
import { tmdbApi, type TmdbGenre } from '@/lib/tmdb/client'
import type { TmdbMedia } from '@/types'

type CatalogRows = {
  hero: TmdbMedia | null
  trending: TmdbMedia[]
  moviesPopular: TmdbMedia[]
  tvPopular: TmdbMedia[]
  moviesTop: TmdbMedia[]
  tvTop: TmdbMedia[]
  nowPlaying: TmdbMedia[]
  onTheAir: TmdbMedia[]
  genreItems: TmdbMedia[]
}

const emptyCatalog: CatalogRows = {
  hero: null,
  trending: [],
  moviesPopular: [],
  tvPopular: [],
  moviesTop: [],
  tvTop: [],
  nowPlaying: [],
  onTheAir: [],
  genreItems: [],
}

export default function DiscoverPage() {
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
  const [sort, setSort] = useState<'trending' | 'popular' | 'top_rated'>('trending')
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null)
  const [genres, setGenres] = useState<TmdbGenre[]>([])
  const [catalog, setCatalog] = useState<CatalogRows>(emptyCatalog)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [enterKey, setEnterKey] = useState(0)
  const requestIdRef = useRef(0)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    const loadGenres = async () => {
      try {
        if (contentFilter === 'TV') {
          setGenres(await tmdbApi.genres('TV'))
        } else {
          setGenres(await tmdbApi.genres('MOVIE'))
        }
      } catch {
        setGenres([])
      }
    }

    void loadGenres()
  }, [contentFilter])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    let cancelled = false

    const loadCatalog = async () => {
      if (hasLoadedRef.current) {
        setIsRefreshing(true)
      } else {
        setIsInitialLoading(true)
      }

      setError(null)

      try {
        const trendingMedia =
          contentFilter === 'MOVIE'
            ? 'movie'
            : contentFilter === 'TV'
              ? 'tv'
              : 'all'

        const [
          trending,
          moviesPopular,
          tvPopular,
          moviesTop,
          tvTop,
          nowPlaying,
          onTheAir,
        ] = await Promise.all([
          tmdbApi.trending(trendingMedia),
          contentFilter === 'TV' ? Promise.resolve([]) : tmdbApi.popular('MOVIE'),
          contentFilter === 'MOVIE' ? Promise.resolve([]) : tmdbApi.popular('TV'),
          contentFilter === 'TV' ? Promise.resolve([]) : tmdbApi.topRated('MOVIE'),
          contentFilter === 'MOVIE' ? Promise.resolve([]) : tmdbApi.topRated('TV'),
          contentFilter === 'TV' ? Promise.resolve([]) : tmdbApi.nowPlaying(),
          contentFilter === 'MOVIE' ? Promise.resolve([]) : tmdbApi.onTheAir(),
        ])

        let primary = trending
        if (sort === 'popular') {
          primary =
            contentFilter === 'TV'
              ? tvPopular
              : contentFilter === 'MOVIE'
                ? moviesPopular
                : [...moviesPopular.slice(0, 10), ...tvPopular.slice(0, 10)]
        }
        if (sort === 'top_rated') {
          primary =
            contentFilter === 'TV'
              ? tvTop
              : contentFilter === 'MOVIE'
                ? moviesTop
                : [...moviesTop.slice(0, 10), ...tvTop.slice(0, 10)]
        }

        let genreItems: TmdbMedia[] = []
        if (selectedGenreId) {
          const genreType = contentFilter === 'TV' ? 'TV' : 'MOVIE'
          genreItems = await tmdbApi.byGenre(genreType, selectedGenreId)
          primary = genreItems
        }

        if (cancelled || requestId !== requestIdRef.current) return

        setCatalog({
          hero: primary[0] ?? trending[0] ?? null,
          trending,
          moviesPopular,
          tvPopular,
          moviesTop,
          tvTop,
          nowPlaying,
          onTheAir,
          genreItems,
        })
        hasLoadedRef.current = true
        setEnterKey((value) => value + 1)
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return
        setError('Não foi possível carregar o catálogo do TMDB')
        if (!hasLoadedRef.current) {
          setCatalog(emptyCatalog)
        }
      } finally {
        if (cancelled || requestId !== requestIdRef.current) return
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    }

    void loadCatalog()

    return () => {
      cancelled = true
    }
  }, [contentFilter, sort, selectedGenreId])

  const handleContentFilterChange = (value: ContentFilter) => {
    setContentFilter(value)
    setSelectedGenreId(null)
  }

  const selectedGenreName = useMemo(
    () => genres.find((genre) => genre.id === selectedGenreId)?.name ?? null,
    [genres, selectedGenreId],
  )

  const catalogRows = useMemo(() => {
    if (selectedGenreId && selectedGenreName) {
      return [{ title: selectedGenreName, items: catalog.genreItems }]
    }

    if (contentFilter === 'MOVIE') {
      const rows: Array<{ title: string; items: TmdbMedia[] }> = []

      if (sort === 'trending') {
        rows.push({ title: 'Em alta agora', items: catalog.trending })
      }
      if (sort === 'popular') {
        rows.push({ title: 'Filmes populares', items: catalog.moviesPopular })
      }
      if (sort === 'top_rated') {
        rows.push({
          title: 'Filmes mais bem avaliados',
          items: catalog.moviesTop,
        })
      }

      rows.push({ title: 'Nos cinemas', items: catalog.nowPlaying })

      if (sort !== 'popular') {
        rows.push({ title: 'Populares', items: catalog.moviesPopular })
      }
      if (sort !== 'top_rated') {
        rows.push({
          title: 'Mais bem avaliados',
          items: catalog.moviesTop,
        })
      }
      if (sort !== 'trending') {
        rows.push({ title: 'Em alta', items: catalog.trending })
      }

      return rows
    }

    if (contentFilter === 'TV') {
      const rows: Array<{ title: string; items: TmdbMedia[] }> = []

      if (sort === 'trending') {
        rows.push({ title: 'Em alta agora', items: catalog.trending })
      }
      if (sort === 'popular') {
        rows.push({ title: 'Séries populares', items: catalog.tvPopular })
      }
      if (sort === 'top_rated') {
        rows.push({
          title: 'Séries mais bem avaliadas',
          items: catalog.tvTop,
        })
      }

      rows.push({ title: 'No ar esta semana', items: catalog.onTheAir })

      if (sort !== 'popular') {
        rows.push({ title: 'Populares', items: catalog.tvPopular })
      }
      if (sort !== 'top_rated') {
        rows.push({
          title: 'Mais bem avaliadas',
          items: catalog.tvTop,
        })
      }
      if (sort !== 'trending') {
        rows.push({ title: 'Em alta', items: catalog.trending })
      }

      return rows
    }

    return [
      ...(sort === 'trending'
        ? [{ title: 'Em alta agora', items: catalog.trending }]
        : []),
      ...(sort === 'popular' || sort === 'trending'
        ? [
            { title: 'Filmes populares', items: catalog.moviesPopular },
            { title: 'Séries populares', items: catalog.tvPopular },
          ]
        : []),
      ...(sort === 'top_rated'
        ? [
            {
              title: 'Filmes mais bem avaliados',
              items: catalog.moviesTop,
            },
            {
              title: 'Séries mais bem avaliadas',
              items: catalog.tvTop,
            },
          ]
        : []),
      { title: 'Nos cinemas', items: catalog.nowPlaying },
      { title: 'No ar esta semana', items: catalog.onTheAir },
      ...(sort !== 'popular' && sort !== 'trending'
        ? [
            { title: 'Filmes populares', items: catalog.moviesPopular },
            { title: 'Séries populares', items: catalog.tvPopular },
          ]
        : []),
      ...(sort !== 'top_rated'
        ? [
            {
              title: 'Filmes mais bem avaliados',
              items: catalog.moviesTop,
            },
            {
              title: 'Séries mais bem avaliadas',
              items: catalog.tvTop,
            },
          ]
        : []),
    ]
  }, [catalog, contentFilter, selectedGenreId, selectedGenreName, sort])

  return (
    <>
      <OnboardingGate />
      <div className="pb-16">
        <div
          className={cn(
            'catalog-crossfade',
            isRefreshing && 'is-refreshing',
          )}
        >
          {catalog.hero ? <HeroBanner media={catalog.hero} /> : null}
        </div>

        <div className={catalog.hero ? '-mt-16 relative z-10' : 'pt-8'}>
          <FilterBar
            contentFilter={contentFilter}
            onContentFilterChange={handleContentFilterChange}
            genres={genres}
            selectedGenreId={selectedGenreId}
            onGenreChange={setSelectedGenreId}
            sort={sort}
            onSortChange={setSort}
          />

          {error ? (
            <p className="mt-4 px-4 text-sm text-accent sm:px-8">{error}</p>
          ) : null}

          {isInitialLoading ? (
            <div className="mt-8 space-y-8">
              <MediaRowSkeleton />
              <MediaRowSkeleton />
              <MediaRowSkeleton />
            </div>
          ) : (
            <div
              key={enterKey}
              className={cn(
                'mt-8 space-y-8 catalog-crossfade catalog-enter',
                isRefreshing && 'is-refreshing',
              )}
            >
              <ContinueWatchingRow contentFilter={contentFilter} />
              {catalogRows.map((row) => (
                <MediaRow key={row.title} title={row.title} items={row.items} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
