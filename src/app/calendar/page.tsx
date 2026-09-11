'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLibrarySnapshot } from '@/components/library/library-snapshot'
import { RequireAuth } from '@/components/auth/require-auth'
import {
  IconChevronLeft,
  IconChevronRight,
  IconStar,
} from '@/components/icons'
import { TmdbImage } from '@/components/media/tmdb-image'
import { Button } from '@/components/ui/button'
import {
  calendarEntryKey,
  loadCatalogReleases,
  loadPersonalReleases,
  type CalendarEntry,
} from '@/lib/calendar/personal'
import { MEDIA_TYPE_LABELS } from '@/lib/constants'
import { cn, formatYear } from '@/lib/utils'
import type { MediaType } from '@/types'

type DayBucket = {
  dateKey: string
  day: number
  items: CalendarEntry[]
}

type ContentFilter = 'ALL' | MediaType
type CalendarSource = 'mine' | 'catalog'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const FILTER_TABS: Array<{ id: ContentFilter; label: string }> = [
  { id: 'ALL', label: 'Tudo' },
  { id: 'MOVIE', label: 'Filmes' },
  { id: 'TV', label: 'Séries' },
]

const SOURCE_TABS: Array<{ id: CalendarSource; label: string }> = [
  { id: 'mine', label: 'Sua lista' },
  { id: 'catalog', label: 'Catálogo' },
]

const toIsoLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthName = (date: Date) =>
  date.toLocaleDateString('pt-BR', { month: 'long' })

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

const mediaKey = (item: CalendarEntry) => calendarEntryKey(item)

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

export default function CalendarPage() {
  const todayKey = toIsoLocal(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [filter, setFilter] = useState<ContentFilter>('ALL')
  const [source, setSource] = useState<CalendarSource>('mine')
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey)
  const [releases, setReleases] = useState<CalendarEntry[]>([])
  const { items: libraryItems, isReady: libraryReady } = useLibrarySnapshot()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const range = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    return { start: toIsoLocal(start), end: toIsoLocal(end) }
  }, [cursor])

  useEffect(() => {
    if (source === 'mine' && !libraryReady) return

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const merged =
          source === 'mine'
            ? await loadPersonalReleases(libraryItems, range)
            : await loadCatalogReleases(range)

        setReleases(merged)

        setSelectedDay((current) => {
          if (current && current >= range.start && current <= range.end) {
            return current
          }
          if (todayKey >= range.start && todayKey <= range.end) {
            return todayKey
          }
          const first = merged
            .map((item) => item.releaseDate?.slice(0, 10) ?? '')
            .filter(Boolean)
            .sort()[0]
          return first || range.start
        })
      } catch {
        setError('Não foi possível montar o calendário')
        setReleases([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [libraryItems, libraryReady, range.end, range.start, reloadKey, source, todayKey])

  const buckets = useMemo(() => {
    const byDay = new Map<string, CalendarEntry[]>()

    releases.forEach((item) => {
      if (filter !== 'ALL' && item.mediaType !== filter) return
      const key = item.releaseDate?.slice(0, 10)
      if (!key) return
      const list = byDay.get(key) ?? []
      list.push(item)
      byDay.set(key, list)
    })

    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([dateKey, items]): DayBucket => ({
          dateKey,
          day: Number(dateKey.slice(8, 10)),
          items: items.sort((a, b) => b.voteAverage - a.voteAverage),
        }),
      )
  }, [filter, releases])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
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
    featured?.posterPath ??
    releases.find((item) => item.backdropPath)?.backdropPath ??
    null

  const movieCount = releases.filter((item) => item.mediaType === 'MOVIE').length
  const tvCount = releases.length - movieCount
  const visibleCount = buckets.reduce((sum, bucket) => sum + bucket.items.length, 0)
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

  const handleShiftDay = (delta: number) => {
    if (!selectedDay) return
    const next = shiftDay(selectedDay, delta)
    handleSelectDay(next)
  }

  const handleFilterChange = (value: ContentFilter) => {
    setFilter(value)
  }

  const handleRetry = () => {
    setReloadKey((value) => value + 1)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedDay) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleShiftDay(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleShiftDay(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [range.end, range.start, selectedDay])

  const filterSummary = isLoading
    ? source === 'mine'
      ? 'Lendo sua lista…'
      : 'Carregando lançamentos…'
    : source === 'mine' && visibleCount === 0
      ? `Nada da sua lista em ${monthLong(cursor)}`
      : filter === 'ALL'
        ? `${countLabel(visibleCount, source === 'mine' ? 'título' : 'estreia', source === 'mine' ? 'títulos' : 'estreias')} em ${monthLong(cursor)}${
            visibleCount > 0
              ? ` · ${countLabel(movieCount, 'filme', 'filmes')} · ${countLabel(tvCount, 'série', 'séries')}`
              : ''
          }`
        : filter === 'MOVIE'
          ? `${countLabel(visibleCount, 'filme', 'filmes')} em ${monthLong(cursor)}`
          : `${countLabel(visibleCount, 'série', 'séries')} em ${monthLong(cursor)}`

  const handleSourceChange = (value: CalendarSource) => {
    setSource(value)
  }

  return (
    <RequireAuth>
      <div className="relative -mt-16 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
          {heroBackdrop ? (
            <div className="absolute inset-0 opacity-40">
              <TmdbImage
                path={heroBackdrop}
                alt=""
                size="w1280"
                fill
                priority
                sizes="100vw"
                imgClassName="object-cover object-top"
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/88 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(229,9,20,0.18),_transparent_52%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0 font-display font-extrabold leading-[0.9] tracking-tight">
                <span className="capitalize text-[clamp(2rem,10vw,5rem)]">
                  {monthName(cursor)}
                </span>
                <span className="text-[clamp(1.35rem,5.5vw,3.25rem)] text-mute">
                  {cursor.getFullYear()}
                </span>
              </h1>
              <p className="mt-3 max-w-xl text-mute">{filterSummary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              <div className="flex overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex size-11 items-center justify-center text-mute transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Mês anterior"
                >
                  <IconChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex size-11 items-center justify-center border-l border-line text-mute transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Próximo mês"
                >
                  <IconChevronRight className="size-5" />
                </button>
              </div>
              <Link href="/upcoming">
                <Button variant="ghost" size="sm">
                  Em breve
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSourceChange(tab.id)}
                aria-pressed={source === tab.id}
                className={cn(
                  'min-h-10 rounded-full border px-4 text-sm transition',
                  source === tab.id
                    ? 'border-accent bg-accent/15 text-ink'
                    : 'border-line text-mute hover:border-mute hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="mt-6 flex gap-5 border-b border-line"
            role="tablist"
            aria-label="Tipo de conteúdo"
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                onClick={() => handleFilterChange(tab.id)}
                className={cn(
                  '-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  filter === tab.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-mute hover:text-ink',
                )}
                aria-selected={filter === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-8 border border-dashed border-line bg-surface/40 p-6">
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={handleRetry}
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section aria-label="Grade do mês">
              <div className="mb-3 grid grid-cols-7 gap-px">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="px-1 pb-2 text-center text-[11px] font-medium text-mute"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {isLoading ? (
                <CalendarGridSkeleton />
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
                          'group relative flex min-h-11 aspect-[4/5] flex-col overflow-hidden bg-surface text-left transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:aspect-square',
                          !cell.inMonth && 'pointer-events-none opacity-30',
                          cell.inMonth &&
                            'hover:bg-surface-2 focus-visible:outline-none',
                          selected && 'ring-2 ring-inset ring-accent',
                        )}
                        aria-label={`${cell.day} de ${monthName(cursor)}${count ? `, ${countLabel(count, 'estreia', 'estreias')}` : ''}${cell.isToday ? ', hoje' : ''}`}
                        aria-pressed={selected}
                      >
                        {lead?.posterPath ? (
                          <span className="absolute inset-0 opacity-55 transition duration-300 group-hover:opacity-75">
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
                              'flex size-7 items-center justify-center text-xs font-semibold sm:size-8 sm:text-sm',
                              cell.isToday && 'rounded-full bg-accent text-white',
                              !cell.isToday && selected && 'text-accent',
                              !cell.isToday && !selected && 'text-ink',
                            )}
                          >
                            {cell.day}
                          </span>
                          {count > 1 ? (
                            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-ink">
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
                Setas do teclado mudam o dia
              </p>
            </section>

            <aside className="xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100vh-7rem)] xl:flex-col xl:self-start">
              {selectedDay ? (
                <div
                  key={selectedDay}
                  className="flex min-h-0 flex-1 flex-col catalog-enter"
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
                    <div className="flex items-center gap-1 pb-1">
                      <button
                        type="button"
                        onClick={() => handleShiftDay(-1)}
                        className="flex size-11 items-center justify-center rounded text-mute transition hover:bg-surface-2 hover:text-ink"
                        aria-label="Dia anterior"
                      >
                        <IconChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftDay(1)}
                        className="flex size-11 items-center justify-center rounded text-mute transition hover:bg-surface-2 hover:text-ink"
                        aria-label="Próximo dia"
                      >
                        <IconChevronRight className="size-5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-mute">
                    {countLabel(
                      selectedItems.length,
                      'estreia',
                      'estreias',
                    )}
                  </p>

                  {isLoading ? (
                    <DayListSkeleton />
                  ) : selectedItems.length === 0 ? (
                    <div className="mt-6 max-w-sm">
                      <h2 className="font-display text-xl font-semibold tracking-tight">
                        {source === 'mine'
                          ? 'Nada da sua lista neste dia'
                          : 'Sem estreias neste dia'}
                      </h2>
                      <p className="mt-2 text-sm text-mute">
                        {source === 'mine'
                          ? 'Títulos em Quero assistir e o próximo episódio das séries que você acompanha aparecem aqui.'
                          : 'Escolha outra data na grade ou avance com as setas.'}
                      </p>
                      {source === 'mine' ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href="/search">
                            <Button variant="ghost" size="sm">
                              Buscar títulos
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSourceChange('catalog')}
                          >
                            Ver catálogo
                          </Button>
                        </div>
                      ) : upcomingBuckets[0] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4"
                          onClick={() =>
                            handleSelectDay(upcomingBuckets[0].dateKey)
                          }
                        >
                          Ir para a próxima estreia
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="thin-scrollbar mt-4 max-h-[min(60vh,520px)] space-y-3 overflow-y-auto overscroll-contain pr-2 xl:max-h-none xl:min-h-0 xl:flex-1">
                      {selectedItems.map((item, index) => (
                        <li key={mediaKey(item)}>
                          {index === 0 ? (
                            <FeaturedReleaseCard item={item} />
                          ) : (
                            <ReleaseRow item={item} />
                          )}
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
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Ainda neste mês
              </h2>
              <p className="mt-1 text-sm text-mute">
                Datas com estreia a partir de hoje
              </p>

              <div className="hide-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                {upcomingBuckets.map((bucket) => (
                  <div
                    key={bucket.dateKey}
                    className="w-[220px] shrink-0 sm:w-[248px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDay(bucket.dateKey)}
                      className={cn(
                        'mb-3 min-h-11 text-left transition duration-200',
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
                        <li key={mediaKey(item)}>
                          <Link
                            href={item.href}
                            className="group flex gap-2.5 transition duration-200 hover:opacity-90"
                            aria-label={item.title}
                            tabIndex={0}
                          >
                            <span className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                              <TmdbImage
                                path={item.posterPath}
                                alt=""
                                size="w185"
                                fill
                                sizes="48px"
                              />
                            </span>
                            <span className="min-w-0 pt-0.5">
                              <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-white">
                                {item.title}
                              </span>
                              <span className="mt-1 block text-[11px] text-mute">
                                {item.episodeLabel ?? MEDIA_TYPE_LABELS[item.mediaType]}
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
                            className="min-h-9 text-xs text-mute hover:text-ink"
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

const FeaturedReleaseCard = ({ item }: { item: CalendarEntry }) => {
  const href = item.href
  const year = formatYear(item.releaseDate)
  const kindLabel =
    item.kind === 'episode'
      ? item.episodeLabel ?? 'Próximo episódio'
      : item.kind === 'want'
        ? 'Quero assistir'
        : MEDIA_TYPE_LABELS[item.mediaType]

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-md bg-surface focus-visible:outline-none"
      aria-label={item.title}
      tabIndex={0}
    >
      <span className="relative block aspect-[16/9] overflow-hidden bg-surface">
        <TmdbImage
          path={item.backdropPath || item.posterPath}
          alt=""
          size="w780"
          fill
          sizes="(max-width: 1280px) 90vw, 420px"
          className="overflow-hidden"
          imgClassName="featured-zoom"
        />
      </span>
      <span className="block px-4 pb-4 pt-3">
        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-mute">
          <span
            className={
              item.kind === 'episode'
                ? 'text-spot'
                : item.mediaType === 'TV'
                  ? 'text-spot'
                  : 'text-accent'
            }
          >
            {kindLabel}
          </span>
          {year ? <span>· {year}</span> : null}
          {item.voteAverage > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-spot">
              <IconStar className="size-3" />
              {item.voteAverage.toFixed(1)}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-lg font-semibold leading-snug group-hover:text-white">
          {item.title}
        </span>
        {item.overview ? (
          <span className="mt-2 block line-clamp-3 text-sm text-mute">
            {item.overview}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

const ReleaseRow = ({ item }: { item: CalendarEntry }) => {
  const href = item.href
  const kindLabel =
    item.kind === 'episode'
      ? item.episodeLabel ?? 'Próximo episódio'
      : item.kind === 'want'
        ? 'Quero assistir'
        : MEDIA_TYPE_LABELS[item.mediaType]

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md py-1 transition hover:bg-surface-2/70"
      aria-label={item.title}
      tabIndex={0}
    >
      <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-2">
        <TmdbImage
          path={item.posterPath}
          alt=""
          size="w185"
          fill
          sizes="44px"
        />
      </span>
      <span className="min-w-0 flex-1 pr-2">
        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-mute">
          <span
            className={item.kind === 'episode' || item.mediaType === 'TV' ? 'text-spot' : 'text-accent'}
          >
            {kindLabel}
          </span>
          {item.voteAverage > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-spot">
              <IconStar className="size-3" />
              {item.voteAverage.toFixed(1)}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-sm font-semibold leading-snug group-hover:text-white">
          {item.title}
        </span>
      </span>
    </Link>
  )
}

const CalendarGridSkeleton = () => {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line" aria-hidden="true">
      {Array.from({ length: 35 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[4/5] animate-pulse bg-surface sm:aspect-square"
        />
      ))}
    </div>
  )
}

const DayListSkeleton = () => {
  return (
    <div className="mt-4 space-y-3" aria-hidden="true">
      <div className="aspect-[16/9] animate-pulse rounded-md bg-surface-2" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <div className="h-16 w-11 animate-pulse rounded-sm bg-surface-2" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-16 rounded bg-surface-2" />
            <div className="h-4 w-3/4 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
