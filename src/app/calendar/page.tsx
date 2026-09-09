'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'
import type { MediaType, TmdbMedia } from '@/types'

type DayBucket = {
  dateKey: string
  day: number
  items: TmdbMedia[]
}

type ContentFilter = 'ALL' | MediaType

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const toIsoLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthShort = (date: Date) =>
  date
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toUpperCase()

const monthLong = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const weekdayLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { weekday: 'long' })
}

const startOfMonthGrid = (cursor: Date) => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const mondayIndex = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - mondayIndex)
  return gridStart
}

const shiftDay = (dateKey: string, delta: number) => {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return toIsoLocal(date)
}

export default function CalendarPage() {
  const todayKey = toIsoLocal(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [filter, setFilter] = useState<ContentFilter>('ALL')
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey)
  const [buckets, setBuckets] = useState<DayBucket[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const range = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    return { start: toIsoLocal(start), end: toIsoLocal(end) }
  }, [cursor])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const requests: Array<Promise<TmdbMedia[]>> = []

        // popularity + várias páginas: ordenar por data só traz a 1ª leva
        // (no TMDB, centenas de títulos “caem” no dia 1 do mês)
        if (filter !== 'TV') {
          requests.push(
            tmdbApi.discover({
              mediaType: 'MOVIE',
              sortBy: 'popularity.desc',
              primaryReleaseDateGte: range.start,
              primaryReleaseDateLte: range.end,
              maxPages: 5,
            }),
          )
        }

        if (filter !== 'MOVIE') {
          requests.push(
            tmdbApi.discover({
              mediaType: 'TV',
              sortBy: 'popularity.desc',
              firstAirDateGte: range.start,
              firstAirDateLte: range.end,
              maxPages: 5,
            }),
          )
        }

        const results = await Promise.all(requests)
        const merged = results.flat()
        const byDay = new Map<string, TmdbMedia[]>()

        merged.forEach((item) => {
          if (!item.releaseDate) return
          const key = item.releaseDate.slice(0, 10)
          if (key < range.start || key > range.end) return
          const list = byDay.get(key) ?? []
          if (list.some((entry) => entry.id === item.id && entry.mediaType === item.mediaType)) {
            return
          }
          list.push(item)
          byDay.set(key, list)
        })

        const sorted = [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dateKey, items]) => ({
            dateKey,
            day: Number(dateKey.slice(8, 10)),
            items: items.sort((a, b) => b.voteAverage - a.voteAverage),
          }))

        setBuckets(sorted)

        setSelectedDay((current) => {
          if (current && current >= range.start && current <= range.end) {
            return current
          }
          if (todayKey >= range.start && todayKey <= range.end) {
            return todayKey
          }
          return sorted[0]?.dateKey ?? range.start
        })
      } catch {
        setError('Não foi possível montar o calendário')
        setBuckets([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [filter, range.end, range.start, todayKey])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, TmdbMedia[]>()
    buckets.forEach((bucket) => map.set(bucket.dateKey, bucket.items))
    return map
  }, [buckets])

  const gridDays = useMemo(() => {
    const start = startOfMonthGrid(cursor)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const dateKey = toIsoLocal(date)
      const inMonth = date.getMonth() === cursor.getMonth()
      return {
        dateKey,
        day: date.getDate(),
        inMonth,
        isToday: dateKey === todayKey,
        items: inMonth ? itemsByDay.get(dateKey) ?? [] : [],
      }
    })
  }, [cursor, itemsByDay, todayKey])

  const selectedItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : []
  const featured = selectedItems[0] ?? null
  const heroBackdrop =
    featured?.backdropPath ??
    buckets.flatMap((bucket) => bucket.items).find((item) => item.backdropPath)?.backdropPath ??
    null

  const totalReleases = buckets.reduce((sum, bucket) => sum + bucket.items.length, 0)
  const movieCount = buckets.reduce(
    (sum, bucket) => sum + bucket.items.filter((item) => item.mediaType === 'MOVIE').length,
    0,
  )
  const tvCount = totalReleases - movieCount
  const upcomingBuckets = buckets.filter((bucket) => bucket.dateKey >= todayKey)

  const handlePrevMonth = () => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
  }

  const handleToday = () => {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(todayKey)
  }

  const handleSelectDay = (dateKey: string) => {
    const inView = dateKey >= range.start && dateKey <= range.end
    if (!inView) {
      const date = new Date(`${dateKey}T12:00:00`)
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    setSelectedDay(dateKey)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedDay) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const next = shiftDay(selectedDay, -1)
        const date = new Date(`${next}T12:00:00`)
        if (next < range.start) {
          setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
        }
        setSelectedDay(next)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const next = shiftDay(selectedDay, 1)
        const date = new Date(`${next}T12:00:00`)
        if (next > range.end) {
          setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
        }
        setSelectedDay(next)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [range.end, range.start, selectedDay])

  return (
    <RequireAuth>
      <div className="relative pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          {heroBackdrop ? (
            <div className="absolute inset-0 opacity-40 transition-opacity duration-700">
                <TmdbImage
                path={heroBackdrop}
                alt=""
                size="w780"
                fill
                sizes="100vw"
                imgClassName="object-cover object-top"
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/85 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(229,9,20,0.18),_transparent_50%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-10 sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-mute">Calendário de estreias</p>
              <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
                <h1 className="font-display text-[clamp(4.5rem,14vw,8.5rem)] font-extrabold leading-[0.85] tracking-tight">
                  {monthShort(cursor)}
                </h1>
                <span className="mb-2 font-display text-3xl font-semibold text-mute sm:mb-3 sm:text-4xl">
                  {cursor.getFullYear()}
                </span>
              </div>
              <p className="mt-4 max-w-lg text-mute">
                {isLoading
                  ? 'Carregando lançamentos…'
                  : `${totalReleases} estreias em destaque em ${monthLong(cursor)}`}
                {!isLoading && totalReleases > 0 ? (
                  <span className="text-mute/80">
                    {' '}
                    · {movieCount} filme{movieCount === 1 ? '' : 's'} · {tvCount} série
                    {tvCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              <div className="flex overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-3 py-2 text-sm text-mute transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Mês anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="border-l border-line px-3 py-2 text-sm text-mute transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Próximo mês"
                >
                  →
                </button>
              </div>
              <Link href="/upcoming">
                <Button variant="ghost" size="sm">
                  Em breve
                </Button>
              </Link>
            </div>
          </div>

          <div
            className="mt-8 flex gap-6 border-b border-line"
            role="tablist"
            aria-label="Tipo de conteúdo"
          >
            {(
              [
                { id: 'ALL', label: 'Tudo' },
                { id: 'MOVIE', label: 'Filmes' },
                { id: 'TV', label: 'Séries' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                onClick={() => setFilter(option.id)}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-medium transition',
                  filter === option.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-mute hover:text-ink',
                )}
                aria-selected={filter === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="mt-6 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section aria-label="Grade do mês">
              <div className="mb-3 grid grid-cols-7 gap-px">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="px-1 pb-2 text-center text-[11px] font-medium uppercase tracking-wider text-mute"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-[4/5] animate-pulse bg-surface sm:aspect-square"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
                  {gridDays.map((cell) => {
                    const count = cell.items.length
                    const selected = selectedDay === cell.dateKey
                    const lead = cell.items[0]

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={!cell.inMonth}
                        onClick={() => handleSelectDay(cell.dateKey)}
                        className={cn(
                          'group relative flex aspect-[4/5] flex-col overflow-hidden bg-surface text-left transition sm:aspect-square',
                          !cell.inMonth && 'pointer-events-none opacity-30',
                          cell.inMonth && 'hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
                          selected && 'ring-2 ring-inset ring-accent',
                        )}
                        aria-label={`${cell.day}${count ? `, ${count} estreias` : ''}`}
                        aria-pressed={selected}
                      >
                        {lead?.posterPath ? (
                          <span className="absolute inset-0 opacity-50 transition group-hover:opacity-70">
                            <TmdbImage
                              path={lead.posterPath}
                              alt=""
                              size="w185"
                              fill
                              sizes="(max-width: 768px) 14vw, 9vw"
                            />
                            <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
                          </span>
                        ) : null}

                        <span className="relative z-10 flex w-full items-start justify-between p-1.5 sm:p-2">
                          <span
                            className={cn(
                              'flex size-6 items-center justify-center text-xs font-semibold sm:size-7 sm:text-sm',
                              cell.isToday && 'rounded-full bg-accent text-white',
                              !cell.isToday && selected && 'text-accent',
                              !cell.isToday && !selected && 'text-ink',
                            )}
                          >
                            {cell.day}
                          </span>
                          {count > 1 ? (
                            <span className="rounded bg-black/55 px-1 py-0.5 text-[10px] font-medium text-ink">
                              {count}
                            </span>
                          ) : null}
                        </span>

                        {count > 0 && !lead?.posterPath ? (
                          <span className="relative z-10 mt-auto p-1.5">
                            <span className="block size-1.5 rounded-full bg-accent" />
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="mt-3 text-xs text-mute">
                Use ← → para mudar o dia
              </p>
            </section>

            <aside className="xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:flex xl:flex-col">
              {selectedDay ? (
                <div
                  key={selectedDay}
                  className="flex min-h-0 flex-1 flex-col transition-opacity duration-300"
                >
                  <div className="flex shrink-0 items-end justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <p className="font-display text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
                        {String(Number(selectedDay.slice(8, 10))).padStart(2, '0')}
                      </p>
                      <p className="mt-2 capitalize text-mute">
                        {weekdayLabel(selectedDay)}
                        {selectedDay === todayKey ? ' · hoje' : ''}
                      </p>
                    </div>
                    <p className="pb-1 text-sm text-mute">
                      {selectedItems.length}{' '}
                      {selectedItems.length === 1 ? 'estreia' : 'estreias'}
                    </p>
                  </div>

                  {isLoading ? (
                    <p className="mt-8 text-mute">Carregando…</p>
                  ) : selectedItems.length === 0 ? (
                    <div className="mt-8 border border-dashed border-line bg-surface/30 p-6">
                      <p className="text-mute">
                        Sem estreias neste dia. Escolha outra data na grade ou avance com as
                        setas.
                      </p>
                      {upcomingBuckets[0] ? (
                        <button
                          type="button"
                          onClick={() => handleSelectDay(upcomingBuckets[0].dateKey)}
                          className="mt-4 text-sm text-accent hover:underline"
                        >
                          Ir para a próxima estreia
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="mt-5 max-h-[min(60vh,520px)] space-y-3 overflow-y-auto overscroll-contain pr-1 xl:max-h-none xl:min-h-0 xl:flex-1">
                      {selectedItems.map((item, index) => (
                        <li key={`${item.mediaType}-${item.id}`}>
                          <Link
                            href={`/title/${item.mediaType.toLowerCase()}/${item.id}`}
                            className={cn(
                              'group flex gap-3 overflow-hidden transition',
                              index === 0
                                ? 'flex-col border border-line bg-surface hover:border-mute'
                                : 'items-center rounded-md py-1 hover:bg-surface-2/70',
                            )}
                          >
                            <span
                              className={cn(
                                'relative shrink-0 overflow-hidden bg-surface-2',
                                index === 0
                                  ? 'aspect-[16/9] w-full'
                                  : 'h-16 w-11 rounded',
                              )}
                            >
                              <TmdbImage
                                path={
                                  index === 0
                                    ? item.backdropPath || item.posterPath
                                    : item.posterPath
                                }
                                alt=""
                                size={index === 0 ? 'w780' : 'w185'}
                                fill
                                sizes={index === 0 ? '(max-width: 1280px) 90vw, 420px' : '44px'}
                                imgClassName="transition duration-500 group-hover:scale-[1.03]"
                              />
                              {index === 0 ? (
                                <span className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
                              ) : null}
                            </span>

                            <div
                              className={cn(
                                'min-w-0 flex-1',
                                index === 0 ? 'px-4 pb-4 pt-3' : 'pr-2',
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold uppercase tracking-wide',
                                    item.mediaType === 'TV' ? 'text-spot' : 'text-accent',
                                  )}
                                >
                                  {item.mediaType === 'TV' ? 'Série' : 'Filme'}
                                </span>
                                {item.voteAverage > 0 ? (
                                  <span className="text-xs text-mute">
                                    ★ {item.voteAverage.toFixed(1)}
                                  </span>
                                ) : null}
                              </div>
                              <p
                                className={cn(
                                  'mt-1 font-semibold leading-snug group-hover:text-white',
                                  index === 0 ? 'text-lg' : 'line-clamp-2 text-sm',
                                )}
                              >
                                {item.title}
                              </p>
                              {index === 0 && item.overview ? (
                                <p className="mt-2 line-clamp-3 text-sm text-mute">
                                  {item.overview}
                                </p>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </aside>
          </div>

          {!isLoading && upcomingBuckets.length > 0 ? (
            <section className="mt-16">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                    Ainda neste mês
                  </h2>
                  <p className="mt-1 text-sm text-mute">
                    Datas com estreia a partir de hoje
                  </p>
                </div>
              </div>

              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                {upcomingBuckets.map((bucket) => (
                  <div
                    key={bucket.dateKey}
                    className="w-[220px] shrink-0 sm:w-[260px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDay(bucket.dateKey)}
                      className={cn(
                        'mb-3 text-left transition',
                        selectedDay === bucket.dateKey
                          ? 'text-accent'
                          : 'text-ink hover:text-accent',
                      )}
                    >
                      <span className="font-display text-4xl font-extrabold leading-none tracking-tight">
                        {String(bucket.day).padStart(2, '0')}
                      </span>
                      <span className="mt-1 block capitalize text-xs text-mute">
                        {weekdayLabel(bucket.dateKey)}
                      </span>
                    </button>

                    <ul className="space-y-2">
                      {bucket.items.slice(0, 3).map((item) => (
                        <li key={`${item.mediaType}-${item.id}`}>
                          <Link
                            href={`/title/${item.mediaType.toLowerCase()}/${item.id}`}
                            className="flex gap-2.5 transition hover:opacity-90"
                          >
                            <span className="relative h-[72px] w-12 shrink-0 overflow-hidden bg-surface-2">
                              <TmdbImage
                                path={item.posterPath}
                                alt=""
                                size="w185"
                                fill
                                sizes="48px"
                              />
                            </span>
                            <span className="min-w-0 pt-0.5">
                              <span className="line-clamp-2 text-sm font-medium leading-snug">
                                {item.title}
                              </span>
                              <span className="mt-1 block text-[11px] text-mute">
                                {item.mediaType === 'TV' ? 'Série' : 'Filme'}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                      {bucket.items.length > 3 ? (
                        <li>
                          <button
                            type="button"
                            onClick={() => handleSelectDay(bucket.dateKey)}
                            className="text-xs text-mute hover:text-ink"
                          >
                            +{bucket.items.length - 3} neste dia
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </RequireAuth>
  )
}
