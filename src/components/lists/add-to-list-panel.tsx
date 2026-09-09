'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ListSummary, MediaType } from '@/types'

type AddToListPanelProps = {
  tmdbId: number
  mediaType: MediaType
  coverUrl?: string | null
}

type Membership = {
  list: ListSummary
  itemId: string | null
  isBusy: boolean
}

export const AddToListPanel = ({
  tmdbId,
  mediaType,
  coverUrl,
}: AddToListPanelProps) => {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const lists = await listsApi.mine()
      const details = await Promise.all(
        lists.map(async (list) => {
          try {
            const detail = await listsApi.get(list.id)
            const found = detail.items.find(
              (item) =>
                item.tmdbId === tmdbId && item.mediaType === mediaType,
            )
            return {
              list,
              itemId: found?.id ?? null,
              isBusy: false,
            }
          } catch {
            return { list, itemId: null, isBusy: false }
          }
        }),
      )
      setMemberships(details)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar suas coleções',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [tmdbId, mediaType])

  const handleToggle = async (listId: string) => {
    const current = memberships.find((entry) => entry.list.id === listId)
    if (!current || current.isBusy) return

    setMemberships((prev) =>
      prev.map((entry) =>
        entry.list.id === listId ? { ...entry, isBusy: true } : entry,
      ),
    )
    setMessage(null)
    setError(null)

    try {
      if (current.itemId) {
        await listsApi.removeItem(listId, current.itemId)
        setMemberships((prev) =>
          prev.map((entry) =>
            entry.list.id === listId
              ? {
                  ...entry,
                  itemId: null,
                  isBusy: false,
                  list: {
                    ...entry.list,
                    itemCount: Math.max(0, entry.list.itemCount - 1),
                  },
                }
              : entry,
          ),
        )
        setMessage(`Removido de “${current.list.name}”`)
        return
      }

      const created = await listsApi.addItem(listId, { tmdbId, mediaType })

      if (!current.list.coverUrl && coverUrl) {
        try {
          await listsApi.update(listId, { coverUrl })
        } catch {
          // capa é opcional
        }
      }

      setMemberships((prev) =>
        prev.map((entry) =>
          entry.list.id === listId
            ? {
                ...entry,
                itemId: created.id,
                isBusy: false,
                list: {
                  ...entry.list,
                  itemCount: entry.list.itemCount + 1,
                  coverUrl: entry.list.coverUrl ?? coverUrl ?? null,
                },
              }
            : entry,
        ),
      )
      setMessage(`Adicionado a “${current.list.name}”`)
    } catch (err) {
      setMemberships((prev) =>
        prev.map((entry) =>
          entry.list.id === listId ? { ...entry, isBusy: false } : entry,
        ),
      )
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível atualizar a lista',
      )
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newName.trim().length < 2) return

    setIsCreating(true)
    setError(null)

    try {
      const list = await listsApi.create({
        name: newName.trim(),
        coverUrl: coverUrl ?? null,
        isPublic: false,
      })
      const item = await listsApi.addItem(list.id, { tmdbId, mediaType })
      setMemberships((prev) => [
        {
          list: { ...list, itemCount: 1 },
          itemId: item.id,
          isBusy: false,
        },
        ...prev,
      ])
      setNewName('')
      setShowCreate(false)
      setMessage(`Criada “${list.name}” com este título`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível criar a lista',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="mt-4 rounded-xl bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Coleções</h3>
        <Link
          href="/lists"
          className="text-xs text-mute underline-offset-2 hover:text-ink hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-mute">Carregando…</p>
      ) : memberships.length === 0 && !showCreate ? (
        <div className="mt-3">
          <p className="text-sm text-mute">
            Nenhuma coleção ainda. Crie uma para organizar este título.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setShowCreate(true)}
          >
            Nova coleção
          </Button>
        </div>
      ) : (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {memberships.map((entry) => {
            const selected = Boolean(entry.itemId)
            return (
              <li key={entry.list.id}>
                <button
                  type="button"
                  onClick={() => void handleToggle(entry.list.id)}
                  disabled={entry.isBusy}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition',
                    selected
                      ? 'bg-accent/15 text-ink'
                      : 'hover:bg-surface-2 text-mute hover:text-ink',
                  )}
                  aria-pressed={selected}
                  aria-label={
                    selected
                      ? `Remover de ${entry.list.name}`
                      : `Adicionar a ${entry.list.name}`
                  }
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border text-[10px]',
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-line',
                    )}
                    aria-hidden
                  >
                    {selected ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.list.name}
                  </span>
                  <span className="shrink-0 text-xs text-mute">
                    {entry.list.itemCount}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showCreate ? (
        <form className="mt-3 flex gap-2" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome da lista"
            minLength={2}
            maxLength={100}
            required
            className="h-9 flex-1 rounded border border-line bg-surface-2 px-2 text-sm text-ink"
            aria-label="Nome da nova lista"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isCreating || newName.trim().length < 2}
          >
            {isCreating ? '…' : 'Criar'}
          </Button>
        </form>
      ) : memberships.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-3 text-xs font-medium text-mute transition hover:text-ink"
        >
          + Nova coleção
        </button>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs text-ink/80" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
