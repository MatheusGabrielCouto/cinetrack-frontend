'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { MediaPoster } from '@/components/media/media-poster'
import { TmdbImage } from '@/components/media/tmdb-image'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { listsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { tmdbApi } from '@/lib/tmdb/client'
import { cn } from '@/lib/utils'
import type { ListDetail, TmdbMedia } from '@/types'

type EnrichedItem = ListDetail['items'][number] & {
  media: TmdbMedia | null
}

const isTmdbPath = (url: string) => url.startsWith('/')

const SortablePoster = ({
  item,
  isOwner,
  onRemove,
}: {
  item: EnrichedItem
  isOwner: boolean
  onRemove: (itemId: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isOwner })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative',
        isDragging && 'z-20 opacity-90',
        isOwner && 'cursor-grab active:cursor-grabbing',
      )}
      {...attributes}
      {...listeners}
    >
      {item.media ? (
        <>
          <MediaPoster media={item.media} />
          {isOwner ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 z-20 rounded bg-black/80 px-2 py-1 text-[10px] font-semibold uppercase text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remover ${item.media.title} da lista`}
            >
              Remover
            </button>
          ) : null}
          {isOwner ? (
            <span className="pointer-events-none absolute bottom-1 left-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-mute opacity-0 transition group-hover:opacity-100">
              Arrastar
            </span>
          ) : null}
        </>
      ) : (
        <div className="w-[150px] rounded-md border border-line bg-surface-2 p-4 text-sm text-mute">
          TMDB #{item.tmdbId}
        </div>
      )}
    </div>
  )
}

export default function ListDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [list, setList] = useState<ListDetail | null>(null)
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const isOwner = Boolean(list && user && list.userId === user.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const detail = await listsApi.get(params.id)
        setList(detail)
        setName(detail.name)
        setDescription(detail.description ?? '')
        setCoverUrl(detail.coverUrl ?? '')
        setIsPublic(detail.isPublic)

        const enriched = await Promise.all(
          detail.items.map(async (item) => {
            try {
              const media = await tmdbApi.details(item.mediaType, item.tmdbId)
              return { ...item, media }
            } catch {
              return { ...item, media: null }
            }
          }),
        )
        setItems(enriched)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar a lista',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [params.id])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!list) return

    setIsSaving(true)
    setError(null)

    try {
      const updated = await listsApi.update(list.id, {
        name: name.trim(),
        description: description.trim() || null,
        coverUrl: coverUrl.trim() || null,
        isPublic,
      })
      setList({ ...list, ...updated })
      setIsEditing(false)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível salvar a lista',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!list) return
    if (!window.confirm(`Excluir a lista "${list.name}"?`)) return

    try {
      await listsApi.remove(list.id)
      router.push('/lists')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível excluir a lista',
      )
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!list) return

    try {
      await listsApi.removeItem(list.id, itemId)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
      setList({
        ...list,
        itemCount: Math.max(0, list.itemCount - 1),
        items: list.items.filter((item) => item.id !== itemId),
      })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível remover o título',
      )
    }
  }

  const handleShare = async () => {
    if (!list) return

    if (!list.isPublic) {
      setShareMessage('Torne a lista pública para compartilhar o link.')
      setIsEditing(true)
      setIsPublic(true)
      return
    }

    const url = `${window.location.origin}/share/lists/${list.id}`

    try {
      await navigator.clipboard.writeText(url)
      setShareMessage('Link copiado!')
    } catch {
      setShareMessage(url)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!list || !isOwner) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previous = items
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)

    try {
      await listsApi.reorderItems(
        list.id,
        next.map((item) => item.id),
      )
    } catch (err) {
      setItems(previous)
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível reordenar a lista',
      )
    }
  }

  const cover = list?.coverUrl
  const fallbackPoster = items.find((item) => item.media?.posterPath)?.media
    ?.posterPath

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8">
        <Link
          href="/lists"
          className="text-sm text-mute transition hover:text-ink"
        >
          ← Coleções
        </Link>

        {isLoading ? (
          <p className="mt-10 text-mute">Carregando lista…</p>
        ) : error && !list ? (
          <p className="mt-10 text-accent">{error}</p>
        ) : list ? (
          <>
            <div className="relative mt-6 overflow-hidden rounded-xl border border-line">
              <div className="relative aspect-[21/9] min-h-[180px] bg-surface-2 sm:min-h-[220px]">
                {cover ? (
                  isTmdbPath(cover) ? (
                    <TmdbImage
                      path={cover}
                      alt=""
                      size="w780"
                      fill
                      sizes="1400px"
                    />
                  ) : (
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )
                ) : fallbackPoster ? (
                  <TmdbImage
                    path={fallbackPoster}
                    alt=""
                    size="w780"
                    fill
                    sizes="1400px"
                    imgClassName="opacity-60 blur-sm scale-110"
                  />
                ) : (
                  <div className="h-full bg-gradient-to-br from-surface-2 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        list.isPublic
                          ? 'bg-ink text-bg'
                          : 'bg-black/60 text-mute',
                      )}
                    >
                      {list.isPublic ? 'Pública' : 'Privada'}
                    </span>
                    <span className="text-sm text-mute">
                      {list.itemCount}{' '}
                      {list.itemCount === 1 ? 'título' : 'títulos'}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                    {list.name}
                  </h1>
                  {list.description ? (
                    <p className="mt-2 max-w-2xl text-mute">{list.description}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {isOwner ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing((value) => !value)}
                  aria-expanded={isEditing}
                >
                  {isEditing ? 'Fechar edição' : 'Editar'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleShare()}>
                  Compartilhar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete()}
                  aria-label="Excluir lista"
                >
                  Excluir
                </Button>
              </div>
            ) : null}

            {shareMessage ? (
              <p className="mt-3 text-sm text-mute" role="status">
                {shareMessage}
              </p>
            ) : null}

            {isEditing && isOwner ? (
              <form
                className="mt-6 max-w-xl space-y-4 rounded-lg border border-line bg-surface p-5"
                onSubmit={handleSave}
              >
                <Input
                  label="Nome"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
                <label className="flex flex-col gap-1.5" htmlFor="edit-description">
                  <span className="text-sm font-medium text-mute">Descrição</span>
                  <textarea
                    id="edit-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="rounded border border-line bg-surface-2 px-3 py-2 text-ink"
                  />
                </label>
                <ImageUploadField
                  label="Capa"
                  value={coverUrl}
                  onChange={setCoverUrl}
                  folder="covers"
                  previewShape="wide"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      'rounded border px-3 py-1.5 text-sm',
                      !isPublic
                        ? 'border-ink bg-ink text-bg'
                        : 'border-line text-mute',
                    )}
                  >
                    Privada
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      'rounded border px-3 py-1.5 text-sm',
                      isPublic
                        ? 'border-ink bg-ink text-bg'
                        : 'border-line text-mute',
                    )}
                  >
                    Pública
                  </button>
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </form>
            ) : null}

            {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

            {items.length === 0 ? (
              <p className="mt-10 text-mute">
                Lista vazia.{' '}
                {isOwner ? (
                  <>
                    Explore títulos em{' '}
                    <Link
                      href="/discover"
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      Início
                    </Link>{' '}
                    e adicione à coleção.
                  </>
                ) : null}
              </p>
            ) : (
              <>
                {isOwner ? (
                  <p className="mt-8 text-sm text-mute">
                    Arraste os posters para reordenar a coleção.
                  </p>
                ) : null}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => void handleDragEnd(event)}
                >
                  <SortableContext
                    items={items.map((item) => item.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="mt-4 flex flex-wrap gap-3">
                      {items.map((item) => (
                        <SortablePoster
                          key={item.id}
                          item={item}
                          isOwner={isOwner}
                          onRemove={(itemId) => void handleRemoveItem(itemId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        ) : null}
      </div>
    </RequireAuth>
  )
}
