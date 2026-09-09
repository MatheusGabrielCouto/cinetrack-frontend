'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const Input = ({
  label,
  error,
  id,
  className,
  type = 'text',
  ...props
}: InputProps) => {
  const inputId = id ?? props.name
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  const resolvedType = isPassword && revealed ? 'text' : type

  const handleToggleReveal = () => {
    setRevealed((value) => !value)
  }

  return (
    <label className="flex w-full flex-col gap-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-mute">{label}</span>
      <span className="relative block">
        <input
          id={inputId}
          {...props}
          type={resolvedType}
          className={cn(
            'h-12 w-full rounded border border-line bg-surface-2 px-3 text-ink placeholder:text-mute/70 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-accent',
            isPassword && 'pr-12',
            error && 'border-accent',
            className,
          )}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={handleToggleReveal}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-mute transition hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {revealed ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9.3 3 11 7a11 11 0 0 1-4.4 4.8" />
                  <path d="M6.6 6.6A11 11 0 0 0 1 12c1.7 4 6 7 11 7 1.1 0 2.1-.2 3.1-.5" />
                </>
              ) : (
                <>
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </span>
      {error ? (
        <span className="text-sm text-accent" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
