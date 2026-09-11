'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RequireAuth } from '@/components/auth/require-auth'
import { IconCheck } from '@/components/icons'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { markOnboarded } from '@/lib/onboarding'
import {
  buildGenreChoices,
  MAX_PREFERRED_GENRES,
  MIN_PREFERRED_GENRES,
  readPreferredGenres,
  savePreferredGenres,
  toPreferredGenres,
  type GenreChoice,
} from '@/lib/recommendations/preferred-genres'
import { safeInternalPath } from '@/lib/safe-path'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8">
            <p className="text-mute">Preparando seus gêneros…</p>
          </div>
        }
      >
        <OnboardingContent />
      </Suspense>
    </RequireAuth>
  )
}

const OnboardingContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [choices, setChoices] = useState<GenreChoice[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const nextHref = safeInternalPath(searchParams.get('next')) ?? '/for-you'
  const picked = selectedIds.length
  const readyToContinue = picked >= MIN_PREFERRED_GENRES

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [movies, shows] = await Promise.all([
          tmdbApi.genres('MOVIE'),
          tmdbApi.genres('TV'),
        ])
        const nextChoices = buildGenreChoices(movies, shows)
        setChoices(nextChoices)

        if (user) {
          const stored = readPreferredGenres(user.id)
          if (stored) {
            const restored = nextChoices
              .filter((choice) => stored.names.includes(choice.name))
              .map((choice) => choice.id)
            if (restored.length > 0) setSelectedIds(restored)
          }
        }
      } catch {
        setError('Não foi possível carregar os gêneros')
        setChoices([])
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [user])

  const selectedChoices = useMemo(
    () => choices.filter((choice) => selectedIds.includes(choice.id)),
    [choices, selectedIds],
  )

  const handleLeave = () => {
    if (user) markOnboarded(user.id)
    router.replace(nextHref)
  }

  const handleToggle = (choice: GenreChoice) => {
    setSelectedIds((current) => {
      if (current.includes(choice.id)) {
        return current.filter((id) => id !== choice.id)
      }
      if (current.length >= MAX_PREFERRED_GENRES) return current
      return [...current, choice.id]
    })
  }

  const handleContinue = () => {
    if (!user || !readyToContinue || isSaving) return
    setIsSaving(true)
    savePreferredGenres(user.id, toPreferredGenres(selectedChoices))
    markOnboarded(user.id)
    router.replace(nextHref)
  }

  const remaining = Math.max(0, MIN_PREFERRED_GENRES - picked)

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-28 pt-10 sm:px-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
        Quais gêneros você curte?
      </h1>
      <p className="mt-3 max-w-xl text-mute">
        Escolha pelo menos {MIN_PREFERRED_GENRES}. O Para você monta filmes e
        séries a partir disso.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{
              width: `${Math.min((picked / MIN_PREFERRED_GENRES) * 100, 100)}%`,
            }}
          />
        </div>
        <p className="text-sm tabular-nums text-mute">
          {Math.min(picked, MIN_PREFERRED_GENRES)}/{MIN_PREFERRED_GENRES}
        </p>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-10 flex flex-wrap gap-2">
          {Array.from({ length: 16 }).map((_, index) => (
            <div
              key={index}
              className="h-11 w-28 animate-pulse rounded-full bg-surface-2"
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label="Gêneros">
          {choices.map((choice) => {
            const selected = selectedIds.includes(choice.id)
            const blocked =
              !selected && selectedIds.length >= MAX_PREFERRED_GENRES

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleToggle(choice)}
                disabled={blocked}
                aria-pressed={selected}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition duration-200',
                  selected
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-mute hover:text-ink',
                  blocked ? 'cursor-not-allowed opacity-40' : null,
                )}
              >
                {selected ? <IconCheck className="size-3.5" /> : null}
                {choice.name}
              </button>
            )
          })}
        </div>
      )}

      {picked >= MAX_PREFERRED_GENRES ? (
        <p className="mt-4 text-sm text-mute">
          Até {MAX_PREFERRED_GENRES} gêneros. Tire um para trocar.
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleLeave}>
            Pular
          </Button>
          <Button
            type="button"
            disabled={!readyToContinue || isSaving}
            onClick={handleContinue}
          >
            {readyToContinue
              ? 'Continuar'
              : remaining === 1
                ? 'Falta 1 gênero'
                : `Faltam ${remaining} gêneros`}
          </Button>
        </div>
      </div>
    </div>
  )
}
