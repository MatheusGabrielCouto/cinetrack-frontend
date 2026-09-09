'use client'

import { useEffect, useState } from 'react'
import { cn, toDisplayAssetUrl } from '@/lib/utils'

type UserAvatarProps = {
  src?: string | null
  name: string
  className?: string
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CT'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export const UserAvatar = ({ src, name, className }: UserAvatarProps) => {
  const [broken, setBroken] = useState(false)
  const displaySrc = toDisplayAssetUrl(src)

  useEffect(() => {
    setBroken(false)
  }, [displaySrc])

  return (
    <span
      className={cn(
        'flex items-center justify-center overflow-hidden bg-surface-2',
        className,
      )}
    >
      {displaySrc && !broken ? (
        <img
          key={displaySrc}
          src={displaySrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
