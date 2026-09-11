'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLibrarySnapshot } from '@/components/library/library-snapshot'
import { useAuth } from '@/components/providers/auth-provider'
import { isOnboarded, markOnboarded } from '@/lib/onboarding'
import { hasPreferredGenres } from '@/lib/recommendations/preferred-genres'

export const OnboardingGate = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { items, isReady } = useLibrarySnapshot()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || !isReady) return
    if (pathname === '/onboarding') return

    if (items.length > 0 || hasPreferredGenres(user.id)) {
      markOnboarded(user.id)
      return
    }

    if (!isOnboarded(user.id)) {
      router.replace('/onboarding')
    }
  }, [isAuthenticated, isLoading, isReady, items.length, pathname, router, user])

  return null
}
