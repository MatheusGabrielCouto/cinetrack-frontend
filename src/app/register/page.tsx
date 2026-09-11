'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AuthScreen } from '@/components/auth/auth-screen'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { safeInternalPath } from '@/lib/safe-path'
import { withNext } from '@/lib/auth-href'

const nextPath = () =>
  safeInternalPath(new URLSearchParams(window.location.search).get('next')) ??
  '/discover'

const afterRegisterPath = () => {
  const next = nextPath()
  if (next === '/discover' || next === '/for-you') return '/onboarding'
  return withNext('/onboarding', next)
}

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [switchHref, setSwitchHref] = useState('/login')
  const justRegistered = useRef(false)

  useEffect(() => {
    setSwitchHref(`/login${window.location.search}`)
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated && !justRegistered.current) {
      router.replace(nextPath())
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      await register(name, email, password)
      justRegistered.current = true
      router.push(afterRegisterPath())
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível criar a conta',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthScreen>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Criar conta
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Monte sua biblioteca em menos de um minuto.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Nome"
          name="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-mute">
        Já acompanha títulos?{' '}
        <Link
          href={switchHref}
          className="font-semibold text-ink underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </AuthScreen>
  )
}
