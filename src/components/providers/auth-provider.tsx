'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '@/lib/api/cinetrack'
import {
  clearTokens,
  getStoredTokens,
  storeTokens,
} from '@/lib/api/client'
import type { AuthTokens, User } from '@/types'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const bootstrap = useCallback(async () => {
    const tokens = getStoredTokens()

    if (!tokens) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const applyTokens = async (tokens: AuthTokens) => {
    storeTokens(tokens)
    const me = await authApi.me()
    setUser(me)
  }

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password })
    await applyTokens(tokens)
  }

  const register = async (name: string, email: string, password: string) => {
    const tokens = await authApi.register({ name, email, password })
    await applyTokens(tokens)
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  const refreshUser = async () => {
    const me = await authApi.me()
    setUser(me)
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
