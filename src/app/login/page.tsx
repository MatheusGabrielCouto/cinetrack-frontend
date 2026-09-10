'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AuthScreen } from '@/components/auth/auth-screen'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { safeInternalPath } from '@/lib/safe-path'

const nextPath = () =>
  safeInternalPath(new URLSearchParams(window.location.search).get('next')) ??
  '/discover'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [switchHref, setSwitchHref] = useState('/register')

  useEffect(() => {
    setSwitchHref(`/register${window.location.search}`)
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(nextPath())
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      await login(email, password)
      router.push(nextPath())
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível entrar. Confira o e-mail e a senha.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthScreen>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Entrar
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Acesse sua lista e continue de onde parou.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-mute">
        Novo no CineTrack?{' '}
        <Link
          href={switchHref}
          className="font-semibold text-ink underline-offset-2 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </AuthScreen>
  )
}
