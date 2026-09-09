'use client'

import { useEffect, useState } from 'react'
import { IconPlay } from '@/components/icons'
import { useTitleLibrary } from '@/components/library/title-library-context'
import { formatEpisodeCode } from '@/lib/library/progress'

export const TrackingDock = () => {
  const {
    item,
    status,
    currentSeason,
    currentEpisode,
    mediaType,
    isLoading,
    isSaving,
    persist,
  } = useTitleLibrary()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 520)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (isLoading || !isVisible) return null

  const continueLabel =
    mediaType === 'TV' && currentSeason && currentEpisode
      ? formatEpisodeCode(currentSeason, currentEpisode)
      : null

  const handleContinue = () => {
    if (mediaType === 'TV') {
      if (!item || status === 'WANT_TO_WATCH') {
        void persist({
          status: 'WATCHING',
          currentSeason: currentSeason ?? 1,
          currentEpisode: currentEpisode ?? 1,
        })
      }
      document.getElementById('episodios')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (status !== 'WATCHED') {
      void persist({ status: 'WATCHED' })
    }
  }

  const dockLabel =
    mediaType === 'TV'
      ? status === 'WATCHING' && continueLabel
        ? continueLabel
        : 'Episódios'
      : status === 'WATCHED'
        ? 'Assistido'
        : 'Visto'

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-md xl:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSaving || (mediaType === 'MOVIE' && status === 'WATCHED')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <IconPlay className="size-3.5" />
          {dockLabel}
        </button>
      </div>
    </div>
  )
}
