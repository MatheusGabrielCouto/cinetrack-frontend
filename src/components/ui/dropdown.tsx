'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type DropdownProps = {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  ariaLabel: string
  triggerClassName?: string
}

export const Dropdown = ({
  trigger,
  children,
  align = 'start',
  ariaLabel,
  triggerClassName,
}: DropdownProps) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
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

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 min-w-[200px] overflow-hidden rounded border border-line bg-surface py-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
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
          'flex w-full items-center px-4 py-2 text-left text-sm transition duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
          active ? 'bg-white/10 text-ink' : 'text-mute hover:bg-white/10 hover:text-ink',
        )}
    >
      {children}
    </button>
  )
}
