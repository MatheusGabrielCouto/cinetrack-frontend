'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type DropdownProps = {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  ariaLabel: string
  triggerClassName?: string
  className?: string
  matchTriggerWidth?: boolean
}

const MIN_PANEL_WIDTH = 180
const VIEW_MARGIN = 12

export const Dropdown = ({
  trigger,
  children,
  align = 'start',
  ariaLabel,
  triggerClassName,
  className,
  matchTriggerWidth = false,
}: DropdownProps) => {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: MIN_PANEL_WIDTH })
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const triggerEl = rootRef.current?.querySelector('button')
      if (!triggerEl) return

      const rect = triggerEl.getBoundingClientRect()
      const maxWidth = window.innerWidth - VIEW_MARGIN * 2
      const preferred = matchTriggerWidth
        ? rect.width
        : Math.max(rect.width, MIN_PANEL_WIDTH)
      const width = Math.min(preferred, maxWidth)

      let left = align === 'end' ? rect.right - width : rect.left
      left = Math.min(Math.max(VIEW_MARGIN, left), window.innerWidth - width - VIEW_MARGIN)

      const menuHeight = menuRef.current?.offsetHeight ?? 280
      const gap = 8
      const spaceBelow = window.innerHeight - rect.bottom - VIEW_MARGIN
      const openAbove = spaceBelow < Math.min(menuHeight, 220) && rect.top > spaceBelow
      const top = openAbove
        ? Math.max(VIEW_MARGIN, rect.top - menuHeight - gap)
        : rect.bottom + gap

      setPanelPos({ top, left, width })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, matchTriggerWidth, open])

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleClose = () => {
    setOpen(false)
  }

  const handleToggle = () => {
    setOpen((value) => !value)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={cn(
          'inline-flex items-center gap-2 text-sm transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none',
          triggerClassName,
        )}
      >
        {trigger}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          aria-hidden="true"
          className={cn(
            'shrink-0 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open && 'rotate-180',
          )}
        >
          <path fill="currentColor" d="M6.7 9.2 12 14.1l5.3-4.9 1.4 1.5L12 17 5.3 10.7z" />
        </svg>
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
              }}
              className="fixed z-[70] max-h-[min(20rem,calc(100vh-5rem))] overflow-y-auto rounded-lg border border-white/12 bg-surface py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
              onClick={handleClose}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

type DropdownItemProps = {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}

export const DropdownItem = ({
  children,
  active = false,
  onClick,
}: DropdownItemProps) => {
  const handleClick = () => {
    onClick?.()
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className={cn(
        'flex min-h-11 w-full items-center px-3.5 text-left text-sm transition duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
        active
          ? 'bg-white/10 font-medium text-ink'
          : 'text-mute hover:bg-white/10 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
