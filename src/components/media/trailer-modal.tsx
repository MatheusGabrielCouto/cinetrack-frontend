'use client'

import { useEffect } from 'react'
import { IconClose } from '@/components/icons'

type TrailerModalProps = {
  videoKey: string | null
  onClose: () => void
}

export const TrailerModal = ({ videoKey, onClose }: TrailerModalProps) => {
  useEffect(() => {
    if (!videoKey) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose, videoKey])

  if (!videoKey) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Trailer"
      onClick={onClose}
    >
      <div
        className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <iframe
          title="Trailer"
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar trailer"
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
        >
          <IconClose />
        </button>
      </div>
    </div>
  )
}
