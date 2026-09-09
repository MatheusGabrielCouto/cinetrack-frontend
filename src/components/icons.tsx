import { cn } from '@/lib/utils'

type IconProps = {
  className?: string
}

const base = 'size-5 shrink-0'

export const IconPlay = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M8.2 5.4a1 1 0 0 1 1.52-.86l10.1 6.6a1 1 0 0 1 0 1.72l-10.1 6.6A1 1 0 0 1 8 18.6V5.4Z" />
  </svg>
)

export const IconHeart = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M12 20s-7.2-4.4-9.2-8.4C1.2 8.4 3 5 6.4 5c2 0 3.2 1.1 3.6 1.7C10.4 6.1 11.6 5 13.6 5 17 5 18.8 8.4 17.2 11.6 15.2 15.6 12 20 12 20Z" />
  </svg>
)

export const IconHeartFill = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M12 20s-7.2-4.4-9.2-8.4C1.2 8.4 3 5 6.4 5c2 0 3.2 1.1 3.6 1.7C10.4 6.1 11.6 5 13.6 5 17 5 18.8 8.4 17.2 11.6 15.2 15.6 12 20 12 20Z" />
  </svg>
)

export const IconCheck = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="m5 12.5 4.4 4.4L19 7.2" />
  </svg>
)

export const IconClose = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M6 6 18 18M18 6 6 18" />
  </svg>
)

export const IconExternal = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M14 5h5v5" />
    <path d="M20 4 11 13" />
    <path d="M19 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5" />
  </svg>
)

export const IconStar = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="m12 3.2 2.4 5.7 6.2.6-4.7 4.1 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.7-4.1 6.2-.6L12 3.2Z" />
  </svg>
)

export const IconPlus = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconList = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M8 7h12M8 12h12M8 17h12" />
    <path d="M4 7h.01M4 12h.01M4 17h.01" />
  </svg>
)

export const IconSearch = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.2 4.2" />
  </svg>
)

export const IconChevronLeft = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="m14.5 5-7 7 7 7" />
  </svg>
)

export const IconInfo = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 11.2V16" />
    <path d="M12 8.2h.01" />
  </svg>
)

export const IconChevronRight = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="m9.5 5 7 7-7 7" />
  </svg>
)

export const IconVolume = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M4 10v4h3.2L12 18V6L7.2 10H4Z" />
    <path d="M16 9.2a4.2 4.2 0 0 1 0 5.6" />
    <path d="M18.4 7a7 7 0 0 1 0 10" />
  </svg>
)

export const IconVolumeOff = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cn(base, className)}
  >
    <path d="M4 10v4h3.2L12 18V6L7.2 10H4Z" />
    <path d="m16 10 5 5M21 10l-5 5" />
  </svg>
)
