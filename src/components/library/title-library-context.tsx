'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { libraryApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import {
  firstEpisodeAfterSeason,
  lastEpisodeOfSeason,
  nextEpisode,
  type SeasonRef,
} from '@/lib/library/progress'
import type { LibraryItem, MediaType, WatchStatus } from '@/types'

type PersistPatch = {
  status?: WatchStatus
  rating?: number | null
  review?: string
  isFavorite?: boolean
  currentSeason?: number | null
  currentEpisode?: number | null
}

type TitleLibraryContextValue = {
  item: LibraryItem | null
  status: WatchStatus
  rating: number | null
  review: string
  isFavorite: boolean
  currentSeason: number | null
  currentEpisode: number | null
  isLoading: boolean
  isSaving: boolean
  message: string | null
  error: string | null
  mediaType: MediaType
  seasons: SeasonRef[]
  setReview: (value: string) => void
  persist: (patch?: PersistPatch) => Promise<void>
  markEpisodeWatched: (season: number, episode: number) => Promise<void>
  continueFromEpisode: (season: number, episode: number) => Promise<void>
  markSeasonWatched: (season: number) => Promise<void>
  rewindToEpisode: (season: number, episode: number) => Promise<void>
  remove: () => Promise<void>
}

const TitleLibraryContext = createContext<TitleLibraryContextValue | null>(null)

type TitleLibraryProviderProps = {
  tmdbId: number
  mediaType: MediaType
  genreIds: number[]
  seasons: SeasonRef[]
  children: ReactNode
}

export const TitleLibraryProvider = ({
  tmdbId,
  mediaType,
  genreIds,
  seasons,
  children,
}: TitleLibraryProviderProps) => {
  const [item, setItem] = useState<LibraryItem | null>(null)
  const [status, setStatus] = useState<WatchStatus>('WANT_TO_WATCH')
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentSeason, setCurrentSeason] = useState<number | null>(
    mediaType === 'TV' ? 1 : null,
  )
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(
    mediaType === 'TV' ? 1 : null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const genreIdsRef = useRef(genreIds)
  const itemRef = useRef(item)

  useEffect(() => {
    genreIdsRef.current = genreIds
  }, [genreIds])

  useEffect(() => {
    itemRef.current = item
  }, [item])

  const applyItem = useCallback((next: LibraryItem | null) => {
    setItem(next)
    itemRef.current = next

    if (!next) {
      setStatus('WANT_TO_WATCH')
      setRating(null)
      setReview('')
      setIsFavorite(false)
      setCurrentSeason(mediaType === 'TV' ? 1 : null)
      setCurrentEpisode(mediaType === 'TV' ? 1 : null)
      return
    }

    setStatus(next.status)
    setRating(next.rating)
    setReview(next.review ?? '')
    setIsFavorite(next.isFavorite)
    setCurrentSeason(next.currentSeason ?? (mediaType === 'TV' ? 1 : null))
    setCurrentEpisode(next.currentEpisode ?? (mediaType === 'TV' ? 1 : null))
  }, [mediaType])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      setMessage(null)

      try {
        const items = await libraryApi.list({ mediaType })
        applyItem(items.find((entry) => entry.tmdbId === tmdbId) ?? null)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar seu tracking',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [applyItem, mediaType, tmdbId])

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [message])

  const persist = useCallback(
    async (patch: PersistPatch = {}) => {
      setIsSaving(true)
      setError(null)
      setMessage(null)

      const current = itemRef.current
      const nextStatus = patch.status ?? (current?.status ?? status)
      const nextRating =
        patch.rating !== undefined ? patch.rating : (current?.rating ?? rating)
      const nextReview =
        patch.review !== undefined ? patch.review : (current?.review ?? review)
      const nextFavorite =
        patch.isFavorite !== undefined
          ? patch.isFavorite
          : (current?.isFavorite ?? isFavorite)
      const nextSeason =
        patch.currentSeason !== undefined
          ? patch.currentSeason
          : (current?.currentSeason ?? currentSeason)
      const nextEpisode =
        patch.currentEpisode !== undefined
          ? patch.currentEpisode
          : (current?.currentEpisode ?? currentEpisode)

      setStatus(nextStatus)
      setRating(nextRating)
      setIsFavorite(nextFavorite)
      setCurrentSeason(nextSeason)
      setCurrentEpisode(nextEpisode)
      if (patch.review !== undefined) setReview(patch.review)

      const ids = genreIdsRef.current
      const payload = {
        status: nextStatus,
        isFavorite: nextFavorite,
        rating: nextRating,
        review: nextReview.trim() || null,
        watchedAt:
          nextStatus === 'WATCHED'
            ? current?.watchedAt ?? new Date().toISOString()
            : current?.watchedAt ?? null,
        genreIds: ids.length
          ? ids
          : current?.genreIds?.length
            ? current.genreIds
            : undefined,
        ...(mediaType === 'TV'
          ? {
              currentSeason: nextSeason,
              currentEpisode: nextEpisode,
            }
          : {
              currentSeason: null,
              currentEpisode: null,
            }),
      }

      try {
        if (current) {
          const updated = await libraryApi.update(current.id, payload)
          applyItem(updated)
          setMessage('Tracking atualizado')
        } else {
          const created = await libraryApi.create({
            tmdbId,
            mediaType,
            ...payload,
          })
          applyItem(created)
          setMessage('Adicionado à sua lista')
        }
      } catch (err) {
        applyItem(current)
        setError(
          err instanceof ApiError ? err.message : 'Não foi possível salvar',
        )
      } finally {
        setIsSaving(false)
      }
    },
    [
      applyItem,
      currentEpisode,
      currentSeason,
      isFavorite,
      mediaType,
      rating,
      review,
      status,
      tmdbId,
    ],
  )

  const markEpisodeWatched = useCallback(
    async (season: number, episode: number) => {
      const next = nextEpisode(seasons, season, episode)
      if (!next) {
        await persist({
          status: 'WATCHED',
          currentSeason: season,
          currentEpisode: episode,
        })
        return
      }

      await persist({
        status: 'WATCHING',
        currentSeason: next.season,
        currentEpisode: next.episode,
      })
    },
    [persist, seasons],
  )

  const continueFromEpisode = useCallback(
    async (season: number, episode: number) => {
      await persist({
        status: 'WATCHING',
        currentSeason: season,
        currentEpisode: episode,
      })
    },
    [persist],
  )

  const markSeasonWatched = useCallback(
    async (season: number) => {
      const following = firstEpisodeAfterSeason(seasons, season)
      if (!following) {
        const last = lastEpisodeOfSeason(seasons, season)
        await persist({
          status: 'WATCHED',
          currentSeason: last?.season ?? season,
          currentEpisode: last?.episode ?? 1,
        })
        return
      }

      await persist({
        status: 'WATCHING',
        currentSeason: following.season,
        currentEpisode: following.episode,
      })
    },
    [persist, seasons],
  )

  const rewindToEpisode = useCallback(
    async (season: number, episode: number) => {
      await persist({
        status: 'WATCHING',
        currentSeason: season,
        currentEpisode: episode,
      })
    },
    [persist],
  )

  const remove = useCallback(async () => {
    const current = itemRef.current
    if (!current) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      await libraryApi.remove(current.id)
      applyItem(null)
      setMessage('Removido da sua lista')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível remover',
      )
    } finally {
      setIsSaving(false)
    }
  }, [applyItem])

  const value = useMemo<TitleLibraryContextValue>(
    () => ({
      item,
      status,
      rating,
      review,
      isFavorite,
      currentSeason,
      currentEpisode,
      isLoading,
      isSaving,
      message,
      error,
      mediaType,
      seasons,
      setReview,
      persist,
      markEpisodeWatched,
      continueFromEpisode,
      markSeasonWatched,
      rewindToEpisode,
      remove,
    }),
    [
      continueFromEpisode,
      currentEpisode,
      currentSeason,
      error,
      isFavorite,
      isLoading,
      isSaving,
      item,
      markEpisodeWatched,
      markSeasonWatched,
      mediaType,
      message,
      persist,
      rating,
      remove,
      review,
      rewindToEpisode,
      seasons,
      status,
    ],
  )

  return (
    <TitleLibraryContext.Provider value={value}>
      {children}
    </TitleLibraryContext.Provider>
  )
}

export const useTitleLibrary = () => {
  const value = useContext(TitleLibraryContext)
  if (!value) {
    throw new Error('useTitleLibrary precisa estar dentro de TitleLibraryProvider')
  }
  return value
}
