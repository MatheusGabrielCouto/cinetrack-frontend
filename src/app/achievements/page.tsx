'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { achievementsApi, libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'
import type { Achievement, AchievementsSummary } from '@/types'

type CategoryFilter = 'all' | Achievement['category']

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'watch', label: 'Assistidos' },
  { id: 'series', label: 'Séries' },
  { id: 'taste', label: 'Gosto' },
  { id: 'critic', label: 'Crítica' },
  { id: 'social', label: 'Social' },
]

const categoryTone: Record<string, string> = {
  watch: 'from-accent/30 to-accent/5 text-accent',
  series: 'from-ok/25 to-ok/5 text-ok',
  taste: 'from-spot/30 to-spot/5 text-spot',
  critic: 'from-ink/20 to-transparent text-ink',
  social: 'from-mute/20 to-transparent text-mute',
}

const useCountUp = (target: number, active: boolean, durationMs = 900) => {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || target <= 0) {
      setValue(target)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, durationMs, target])

  return value
}

const ProgressRing = ({
  value,
  max,
  size = 168,
}: {
  value: number
  max: number
  size?: number
}) => {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - ratio)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-line"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-spot transition-[stroke-dashoffset] duration-1000 ease-out"
      />
    </svg>
  )
}

export default function AchievementsPage() {
  const [summary, setSummary] = useState<AchievementsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<CategoryFilter>('all')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const watched = await libraryApi.list({ status: 'WATCHED' })
        const missingGenres = watched.filter(
          (item) => !item.genreIds || item.genreIds.length === 0,
        )

        if (missingGenres.length > 0) {
          setSyncNote('Sincronizando gêneros…')
          await Promise.all(
            missingGenres.slice(0, 40).map(async (item) => {
              try {
                const details = await tmdbApi.fullDetails(
                  item.mediaType,
                  item.tmdbId,
                )
                await libraryApi.update(item.id, {
                  genreIds: details.genres.map((genre) => genre.id),
                })
              } catch {
                // ignore individual failures
              }
            }),
          )
          setSyncNote(null)
        }

        const data = await achievementsApi.get()
        setSummary(data)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as conquistas',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const filtered = useMemo(() => {
    if (!summary) return []
    if (filter === 'all') return summary.achievements
    return summary.achievements.filter((item) => item.category === filter)
  }, [filter, summary])

  const unlocked = filtered.filter((item) => item.unlocked)
  const locked = filtered
    .filter((item) => !item.unlocked)
    .sort((a, b) => {
      const ratioA = a.target > 0 ? a.progress / a.target : 0
      const ratioB = b.target > 0 ? b.progress / b.target : 0
      return ratioB - ratioA
    })

  const latestUnlocked = useMemo(() => {
    if (!summary) return null
    return (
      [...summary.achievements]
        .filter((item) => item.unlocked && item.unlockedAt)
        .sort((a, b) =>
          (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''),
        )[0] ?? summary.achievements.find((item) => item.unlocked) ?? null
    )
  }, [summary])

  const nextUp = locked[0] ?? null
  const percent =
    summary && summary.totalCount > 0
      ? Math.round((summary.unlockedCount / summary.totalCount) * 100)
      : 0
  const animatedCount = useCountUp(summary?.unlockedCount ?? 0, Boolean(summary))
  const animatedPercent = useCountUp(percent, Boolean(summary))

  return (
    <RequireAuth>
      <div className="relative pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,197,24,0.22),_transparent_55%)]" />
          <div className="absolute -left-20 top-10 size-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute right-0 top-24 size-80 rounded-full bg-spot/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-4 pt-10 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
            <div className="relative mx-auto flex size-[168px] items-center justify-center sm:size-[200px]">
              <div className="sm:hidden">
                <ProgressRing
                  value={summary?.unlockedCount ?? 0}
                  max={summary?.totalCount ?? 1}
                  size={168}
                />
              </div>
              <div className="hidden sm:block">
                <ProgressRing
                  value={summary?.unlockedCount ?? 0}
                  max={summary?.totalCount ?? 1}
                  size={200}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="font-sans text-5xl font-semibold leading-none tracking-tight text-spot sm:text-6xl">
                  {isLoading ? '—' : animatedPercent}
                  <span className="text-2xl font-medium text-mute">%</span>
                </p>
                <p className="mt-1 text-xs text-mute">completo</p>
              </div>
            </div>

            <div>
              <h1 className="font-sans text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[0.95] tracking-tight">
                Conquistas
              </h1>
              <p className="mt-4 max-w-lg text-mute">
                {isLoading
                  ? syncNote ?? 'Montando seu mural…'
                  : summary
                    ? `${animatedCount} de ${summary.totalCount} badges desbloqueadas com o que você assiste e curadoria.`
                    : 'Seu mural de badges do CineTrack.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/stats"
                  className="border border-line px-4 py-2 text-sm text-mute transition hover:border-mute hover:text-ink"
                >
                  Estatísticas
                </Link>
                <Link
                  href="/discover"
                  className="border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-deep"
                >
                  Continuar assistindo
                </Link>
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-8 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse bg-surface-2/80"
                />
              ))}
            </div>
          ) : summary ? (
            <>
              {(latestUnlocked || nextUp) && (
                <section className="mt-14 grid gap-4 lg:grid-cols-2">
                  {latestUnlocked ? (
                    <FeaturedAchievement
                      label="Mais recente"
                      item={latestUnlocked}
                      featured
                    />
                  ) : null}
                  {nextUp ? (
                    <FeaturedAchievement
                      label="Quase lá"
                      item={nextUp}
                    />
                  ) : null}
                </section>
              )}

              <div
                className="mt-12 flex gap-5 overflow-x-auto border-b border-line"
                role="tablist"
                aria-label="Filtrar por categoria"
              >
                {CATEGORIES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      '-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition',
                      filter === option.id
                        ? 'border-spot text-ink'
                        : 'border-transparent text-mute hover:text-ink',
                    )}
                    aria-selected={filter === option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {unlocked.length > 0 ? (
                <section className="mt-10">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Mural
                    </h2>
                    <p className="text-sm text-mute">
                      {unlocked.length}{' '}
                      {unlocked.length === 1 ? 'badge' : 'badges'}
                    </p>
                  </div>

                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {unlocked.map((item) => (
                      <MedalTile key={item.code} item={item} />
                    ))}
                  </ul>
                </section>
              ) : (
                <section className="mt-10 border border-dashed border-line bg-surface/30 p-8">
                  <p className="font-display text-xl font-semibold">
                    Mural ainda vazio
                  </p>
                  <p className="mt-2 max-w-md text-mute">
                    Marque um título como assistido ou avalie algo da sua lista
                    para desbloquear a primeira badge.
                  </p>
                  <Link
                    href="/library"
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    Ir para minha lista
                  </Link>
                </section>
              )}

              {locked.length > 0 ? (
                <section className="mt-14">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Em progresso
                    </h2>
                    <p className="text-sm text-mute">
                      Ordenado pelo mais próximo
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {locked.map((item) => (
                      <ProgressRow key={item.code} item={item} />
                    ))}
                  </ul>
                </section>
              ) : filter !== 'all' ? (
                <p className="mt-10 text-mute">
                  Você já pegou tudo nesta categoria.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </RequireAuth>
  )
}

const FeaturedAchievement = ({
  item,
  label,
  featured = false,
}: {
  item: Achievement
  label: string
  featured?: boolean
}) => {
  const ratio = item.target > 0 ? Math.min(item.progress / item.target, 1) : 0

  return (
    <article
      className={cn(
        'relative overflow-hidden border border-line bg-surface/60 p-5 sm:p-6',
        featured && 'border-spot/35',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80',
          categoryTone[item.category] ?? 'from-surface-2 to-transparent',
        )}
      />
      <div className="relative">
        <p className="text-sm text-mute">{label}</p>
        <div className="mt-4 flex items-start gap-4">
          <span
            className={cn(
              'flex size-16 shrink-0 items-center justify-center rounded-full border text-3xl',
              featured
                ? 'border-spot/50 bg-black/40 shadow-[0_0_40px_rgba(245,197,24,0.2)]'
                : 'border-line bg-black/30 grayscale',
            )}
            aria-hidden
          >
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-mute">{item.description}</p>
            {!item.unlocked ? (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-mute">
                  <span>
                    {item.progress} / {item.target}
                  </span>
                  <span>{Math.round(ratio * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden bg-black/40">
                  <div
                    className="h-full bg-spot transition-all duration-700"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            ) : item.unlockedAt ? (
              <p className="mt-3 text-xs text-spot">
                Desbloqueada em{' '}
                {new Date(item.unlockedAt).toLocaleDateString('pt-BR')}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

const MedalTile = ({ item }: { item: Achievement }) => (
  <li className="group relative overflow-hidden border border-spot/20 bg-gradient-to-b from-spot/10 to-surface p-4 text-center transition hover:border-spot/50">
    <span
      className="mx-auto flex size-14 items-center justify-center rounded-full border border-spot/40 bg-black/35 text-3xl shadow-[0_0_24px_rgba(245,197,24,0.15)] transition duration-300 group-hover:scale-105"
      aria-hidden
    >
      {item.icon}
    </span>
    <h3 className="mt-3 font-display text-sm font-semibold leading-snug sm:text-base">
      {item.title}
    </h3>
    <p className="mt-1 line-clamp-2 text-[11px] text-mute sm:text-xs">
      {item.description}
    </p>
    {item.unlockedAt ? (
      <p className="mt-3 text-[10px] text-spot/80">
        {new Date(item.unlockedAt).toLocaleDateString('pt-BR')}
      </p>
    ) : null}
  </li>
)

const ProgressRow = ({ item }: { item: Achievement }) => {
  const ratio = item.target > 0 ? Math.min(item.progress / item.target, 1) : 0
  const almost = ratio >= 0.6

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line py-4 sm:gap-5">
      <span
        className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-2 text-xl grayscale"
        aria-hidden
      >
        {item.icon}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="truncate font-semibold">{item.title}</h3>
          {almost ? (
            <span className="text-[11px] text-spot">Quase</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-mute">{item.description}</p>
        <div className="mt-2 h-1 overflow-hidden bg-surface-2">
          <div
            className={cn(
              'h-full transition-all duration-700',
              almost ? 'bg-spot' : 'bg-accent',
            )}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>

      <p className="shrink-0 font-display text-lg font-bold tabular-nums text-mute sm:text-xl">
        {item.progress}
        <span className="text-sm font-medium text-mute/70">/{item.target}</span>
      </p>
    </li>
  )
}
