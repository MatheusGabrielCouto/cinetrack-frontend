'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/auth/require-auth'
import { ListCard } from '@/components/lists/list-card'
import { Button } from '@/components/ui/button'
import { listsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { ListSummary } from '@/types'

type Tab = 'mine' | 'public'

export default function ListsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('mine')
  const [mine, setMine] = useState<ListSummary[]>([])
  const [publicLists, setPublicLists] = useState<ListSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [own, shared] = await Promise.all([
          listsApi.mine(),
          listsApi.public(),
        ])
        setMine(own)
        setPublicLists(shared)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as coleções',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const lists = useMemo(
    () => (tab === 'mine' ? mine : publicLists),
    [tab, mine, publicLists],
  )

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Coleções
            </h1>
            <p className="mt-2 max-w-xl text-mute">
              Crie listas temáticas — Halloween, Sci-Fi, clássicos — e descubra
              coleções públicas de outros cinéfilos.
            </p>
          </div>
          <Button onClick={() => router.push('/lists/new')} aria-label="Criar nova lista">
            Nova lista
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              { id: 'mine', label: `Minhas (${mine.length})` },
              { id: 'public', label: `Explorar (${publicLists.length})` },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                tab === option.id
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line text-mute hover:text-ink',
              )}
              aria-pressed={tab === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error ? <p className="mt-6 text-sm text-accent">{error}</p> : null}

        {isLoading ? (
          <p className="mt-10 text-mute">Carregando coleções…</p>
        ) : lists.length === 0 ? (
          <div className="mt-12 max-w-lg">
            <p className="text-mute">
              {tab === 'mine'
                ? 'Você ainda não tem coleções. Crie a primeira e organize seus filmes por tema.'
                : 'Nenhuma lista pública por enquanto.'}
            </p>
            {tab === 'mine' ? (
              <Button className="mt-4" onClick={() => router.push('/lists/new')}>
                Criar primeira lista
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}

        {tab === 'mine' && mine.length > 0 ? (
          <p className="mt-10 text-sm text-mute">
            Dica: nas páginas de títulos, use{' '}
            <Link href="/discover" className="text-ink underline-offset-2 hover:underline">
              Adicionar à coleção
            </Link>{' '}
            para preencher suas listas.
          </p>
        ) : null}
      </div>
    </RequireAuth>
  )
}
