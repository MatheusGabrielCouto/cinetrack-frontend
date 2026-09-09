'use client'

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { IconVolume, IconVolumeOff } from '@/components/icons'
import { cn } from '@/lib/utils'

type HeroTrailerProps = {
  videoKey: string
  isModalOpen: boolean
  onPlayingChange?: (playing: boolean) => void
}

const DELAY_MS = 2000
const FADE_MS = 700
const YT_ORIGINS = new Set([
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
])

const commandPlayer = (
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = [],
) => {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    '*',
  )
}

export const HeroTrailer = ({
  videoKey,
  isModalOpen,
  onPlayingChange,
}: HeroTrailerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inViewRef = useRef(true)
  const startTimer = useRef(0)
  const unmountTimer = useRef(0)
  const readyTimer = useRef(0)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(70)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [canHover, setCanHover] = useState(false)
  const lastVolume = useRef(70)
  const volumeLeaveTimer = useRef(0)
  const draggingVolume = useRef(false)
  const volumeTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)')
    const syncMotion = () => setReducedMotion(motion.matches)
    const syncHover = () => setCanHover(hover.matches)
    syncMotion()
    syncHover()
    motion.addEventListener('change', syncMotion)
    hover.addEventListener('change', syncHover)
    return () => {
      motion.removeEventListener('change', syncMotion)
      hover.removeEventListener('change', syncHover)
    }
  }, [])

  useEffect(() => {
    onPlayingChange?.(visible)
    if (!visible) setVolumeOpen(false)
    return () => onPlayingChange?.(false)
  }, [onPlayingChange, visible])

  useEffect(() => {
    const stopPlayback = () => {
      window.clearTimeout(readyTimer.current)
      setVisible(false)
      setMuted(true)
      window.clearTimeout(unmountTimer.current)
      unmountTimer.current = window.setTimeout(() => {
        setMounted(false)
      }, FADE_MS)
    }

    const startPlayback = () => {
      window.clearTimeout(unmountTimer.current)
      setMounted(true)
    }

    const cancelStart = () => {
      window.clearTimeout(startTimer.current)
      startTimer.current = 0
    }

    const arm = () => {
      cancelStart()
      if (reducedMotion || isModalOpen || !inViewRef.current) return
      startTimer.current = window.setTimeout(() => {
        if (!reducedMotion && !isModalOpen && inViewRef.current && !document.hidden) {
          startPlayback()
        }
      }, DELAY_MS)
    }

    if (reducedMotion || isModalOpen) {
      cancelStart()
      stopPlayback()
      return
    }

    const root = rootRef.current
    if (!root) return

    const io = new IntersectionObserver(
      ([entry]) => {
        const nowInView =
          !document.hidden &&
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.35

        if (nowInView && !inViewRef.current) arm()
        if (!nowInView && inViewRef.current) {
          cancelStart()
          stopPlayback()
        }
        inViewRef.current = nowInView
      },
      { threshold: [0, 0.35, 0.6, 1] },
    )

    io.observe(root)
    inViewRef.current =
      root.getBoundingClientRect().top < window.innerHeight &&
      root.getBoundingClientRect().bottom > 0
    if (inViewRef.current) arm()

    const handleVisibility = () => {
      if (document.hidden) {
        cancelStart()
        stopPlayback()
        inViewRef.current = false
        return
      }
      const rect = root.getBoundingClientRect()
      inViewRef.current =
        rect.top < window.innerHeight * 0.85 && rect.bottom > 80
      if (inViewRef.current) arm()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelStart()
      window.clearTimeout(unmountTimer.current)
      window.clearTimeout(readyTimer.current)
      io.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isModalOpen, reducedMotion, videoKey])

  useEffect(() => {
    if (!mounted) return

    const handleMessage = (event: MessageEvent) => {
      if (!YT_ORIGINS.has(event.origin)) return

      let payload: unknown = event.data
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload)
        } catch {
          return
        }
      }

      if (!payload || typeof payload !== 'object') return
      const data = payload as {
        event?: string
        info?: number | { playerState?: number }
      }

      const state =
        typeof data.info === 'number'
          ? data.info
          : data.info && typeof data.info === 'object'
            ? data.info.playerState
            : undefined

      if (state === 1) {
        window.clearTimeout(readyTimer.current)
        readyTimer.current = window.setTimeout(() => setVisible(true), 700)
      }
      if (state === 0) {
        setVisible(false)
        setMuted(true)
        window.clearTimeout(unmountTimer.current)
        unmountTimer.current = window.setTimeout(() => {
          setMounted(false)
        }, FADE_MS)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [mounted])

  const handleIframeLoad = () => {
    const frame = iframeRef.current
    if (!frame?.contentWindow) return

    frame.contentWindow.postMessage(
      JSON.stringify({ event: 'listening', id: 1 }),
      '*',
    )
    commandPlayer(frame, 'addEventListener', ['onStateChange'])
    window.clearTimeout(readyTimer.current)
    readyTimer.current = window.setTimeout(() => setVisible(true), 1600)
  }

  const applyVolume = (next: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(next)))
    setVolume(clamped)

    if (clamped <= 0) {
      setMuted(true)
      commandPlayer(iframeRef.current, 'mute')
      return
    }

    lastVolume.current = clamped
    setMuted(false)
    commandPlayer(iframeRef.current, 'unMute')
    commandPlayer(iframeRef.current, 'setVolume', [clamped])
  }

  const volumeFromClientY = (clientY: number) => {
    const track = volumeTrackRef.current
    if (!track) return muted ? 0 : volume
    const rect = track.getBoundingClientRect()
    if (rect.height <= 0) return muted ? 0 : volume
    const ratio = (rect.bottom - clientY) / rect.height
    return ratio * 100
  }

  const handleToggleMute = () => {
    if (muted) {
      applyVolume(lastVolume.current || 70)
      return
    }
    setMuted(true)
    commandPlayer(iframeRef.current, 'mute')
  }

  const handleVolumeEnter = () => {
    window.clearTimeout(volumeLeaveTimer.current)
    setVolumeOpen(true)
  }

  const handleVolumeLeave = () => {
    if (draggingVolume.current) return
    window.clearTimeout(volumeLeaveTimer.current)
    volumeLeaveTimer.current = window.setTimeout(() => {
      setVolumeOpen(false)
    }, 140)
  }

  const handleVolumeBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    handleVolumeLeave()
  }

  const handleVolumePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingVolume.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    applyVolume(volumeFromClientY(event.clientY))
  }

  const handleVolumePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingVolume.current) return
    applyVolume(volumeFromClientY(event.clientY))
  }

  const handleVolumePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingVolume.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleVolumeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      applyVolume((muted ? 0 : volume) + 5)
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      applyVolume((muted ? 0 : volume) - 5)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      applyVolume(100)
    }
    if (event.key === 'End') {
      event.preventDefault()
      applyVolume(0)
    }
  }

  if (reducedMotion) return null

  const origin =
    typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin)
  const src = `https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=1&origin=${origin}`

  return (
    <>
      <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[1]">
        {mounted ? (
          <div
            className={cn(
              'absolute inset-0 overflow-hidden transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
              visible ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          >
            <iframe
              ref={iframeRef}
              title="Trailer em segundo plano"
              src={src}
              allow="autoplay; encrypted-media"
              onLoad={handleIframeLoad}
              tabIndex={-1}
              className="absolute left-1/2 top-1/2 h-[118%] w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 border-0 sm:h-[56.25vw] sm:w-[177.78vh] sm:min-h-[115%] sm:min-w-[115%] sm:scale-[1.22]"
            />
          </div>
        ) : null}
      </div>

      {visible ? (
        <div
          className="absolute bottom-3 right-3 z-30 sm:bottom-8 sm:right-8"
          onMouseEnter={canHover ? handleVolumeEnter : undefined}
          onMouseLeave={canHover ? handleVolumeLeave : undefined}
          onFocus={canHover ? handleVolumeEnter : undefined}
          onBlur={canHover ? handleVolumeBlur : undefined}
        >
          {canHover ? (
            <div
              className={cn(
                'absolute bottom-11 left-1/2 flex -translate-x-1/2 flex-col items-center pb-2',
                'origin-bottom transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                volumeOpen
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0',
              )}
            >
              <div className="rounded-full border border-white/20 bg-black/60 px-2.5 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
                <div
                  ref={volumeTrackRef}
                  role="slider"
                  aria-label="Volume do trailer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={muted ? 0 : volume}
                  aria-valuetext={`${muted ? 0 : volume}%`}
                  tabIndex={0}
                  onPointerDown={handleVolumePointerDown}
                  onPointerMove={handleVolumePointerMove}
                  onPointerUp={handleVolumePointerUp}
                  onPointerCancel={handleVolumePointerUp}
                  onKeyDown={handleVolumeKeyDown}
                  className="relative h-24 w-7 cursor-ns-resize touch-none"
                >
                  <div className="absolute inset-x-[11px] inset-y-0 rounded-full bg-white/25" />
                  <div
                    className="absolute inset-x-[11px] bottom-0 rounded-full bg-white"
                    style={{ height: `${muted ? 0 : volume}%` }}
                  />
                  <div
                    className="absolute left-1/2 size-3.5 rounded-full bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.35)]"
                    style={{
                      top: `${100 - (muted ? 0 : volume)}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Ativar som do trailer' : 'Desativar som do trailer'}
            aria-pressed={!muted}
            tabIndex={0}
            className="flex size-10 items-center justify-center rounded-full border border-white/45 bg-black/70 text-white transition duration-200 hover:bg-black/85 sm:size-11"
          >
            {muted || volume === 0 ? <IconVolumeOff /> : <IconVolume />}
          </button>
        </div>
      ) : null}
    </>
  )
}
