'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { markOnboarded } from '@/lib/onboarding'
import type { LibraryItem, MediaType, TmdbMedia, WatchStatus } from '@/types'

const PENDING_KEY = 'cinetrack:pending-add'

type PendingAdd = {
  tmdbId: number
  mediaType: MediaType
  genreIds: number[]
  isFavorite?: boolean
  status?: WatchStatus
}

type LibrarySnapshotValue = {
  items: LibraryItem[]
  isReady: boolean
  savingKey: string | null
  getItem: (mediaType: MediaType, tmdbId: number) => LibraryItem | null
  upsertItem: (item: LibraryItem) => void
  removeItem: (mediaType: MediaType, tmdbId: number) => void
  addToList: (
    media: Pick<TmdbMedia, 'id' | 'mediaType' | 'genreIds'>,
    options?: { status?: WatchStatus; isFavorite?: boolean },
  ) => Promise<LibraryItem | null>
}

const LibrarySnapshotContext = createContext<LibrarySnapshotValue | null>(null)

export const libraryMediaKey = (mediaType: MediaType, tmdbId: number) =>
  `${mediaType}-${tmdbId}`

export const queuePendingLibraryAdd = (media: TmdbMedia) => {
  if (typeof window === 'undefined') return

  const pending: PendingAdd = {
    tmdbId: media.id,
    mediaType: media.mediaType,
    genreIds: media.genreIds ?? [],
  }

  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

const readPendingAdd = (): PendingAdd | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingAdd
  } catch {
    return null
  }
}

const clearPendingAdd = () => {
  sessionStorage.removeItem(PENDING_KEY)
}

export const LibrarySnapshotProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const upsertItem = useCallback((item: LibraryItem) => {
    setItems((current) => {
      const key = libraryMediaKey(item.mediaType, item.tmdbId)
      const next = current.filter(
        (entry) => libraryMediaKey(entry.mediaType, entry.tmdbId) !== key,
      )
      return [item, ...next]
    })
  }, [])

  const removeItem = useCallback((mediaType: MediaType, tmdbId: number) => {
    const key = libraryMediaKey(mediaType, tmdbId)
    setItems((current) =>
      current.filter((entry) => libraryMediaKey(entry.mediaType, entry.tmdbId) !== key),
    )
  }, [])

  const getItem = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      items.find((entry) => entry.mediaType === mediaType && entry.tmdbId === tmdbId) ??
      null,
    [items],
  )

  const addToList = useCallback(
    async (
      media: Pick<TmdbMedia, 'id' | 'mediaType' | 'genreIds'>,
      options?: { status?: WatchStatus; isFavorite?: boolean },
    ) => {
      const key = libraryMediaKey(media.mediaType, media.id)
      const existing = items.find(
        (entry) => entry.mediaType === media.mediaType && entry.tmdbId === media.id,
      )
      if (existing) return existing

      setSavingKey(key)

      try {
        const created = await libraryApi.create({
          tmdbId: media.id,
          mediaType: media.mediaType,
          status: options?.status ?? 'WANT_TO_WATCH',
          isFavorite: options?.isFavorite ?? false,
          genreIds: media.genreIds,
        })
        upsertItem(created)
        return created
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const latest = await libraryApi.list({ mediaType: media.mediaType })
          const found =
            latest.find((entry) => entry.tmdbId === media.id) ?? null
          if (found) upsertItem(found)
          return found
        }
        throw err
      } finally {
        setSavingKey(null)
      }
    },
    [items, upsertItem],
  )

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      setItems([])
      setIsReady(true)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsReady(false)

      try {
        const list = await libraryApi.list()
        if (cancelled) return
        setItems(list)
        if (list.length > 0) markOnboarded(user.id)

        const pending = readPendingAdd()
        if (pending) {
          clearPendingAdd()
          const already = list.find(
            (entry) =>
              entry.tmdbId === pending.tmdbId &&
              entry.mediaType === pending.mediaType,
          )
          if (!already) {
            try {
              const created = await libraryApi.create({
                tmdbId: pending.tmdbId,
                mediaType: pending.mediaType,
                status: pending.status ?? 'WANT_TO_WATCH',
                isFavorite: pending.isFavorite ?? false,
                genreIds: pending.genreIds,
              })
              if (!cancelled) setItems((current) => [created, ...current])
            } catch {
              // ignore pending add failures
            }
          }
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, user])

  const value = useMemo(
    () => ({
      items,
      isReady,
      savingKey,
      getItem,
      upsertItem,
      removeItem,
      addToList,
    }),
    [addToList, getItem, isReady, items, removeItem, savingKey, upsertItem],
  )

  return (
    <LibrarySnapshotContext.Provider value={value}>
      {children}
    </LibrarySnapshotContext.Provider>
  )
}

export const useLibrarySnapshot = () => {
  const context = useContext(LibrarySnapshotContext)
  if (!context) {
    throw new Error('useLibrarySnapshot precisa estar dentro de LibrarySnapshotProvider')
  }
  return context
}
