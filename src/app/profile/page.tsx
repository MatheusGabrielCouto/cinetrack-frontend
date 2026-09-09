'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { UserAvatar } from '@/components/ui/user-avatar'
import { statsApi, usersApi } from '@/lib/api/cinetrack'
import { ApiError, clearTokens } from '@/lib/api/client'
import { formatRating } from '@/lib/utils'
import type { Stats } from '@/types'

const avatarForSave = (value: string, fallback: string | null) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('blob:')) return fallback
  return trimmed
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser, logout } = useAuth()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setAvatar(user.avatar ?? '')
  }, [user])

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStats(await statsApi.get())
      } catch {
        setStats(null)
      }
    }

    void loadStats()
  }, [])

  const persistAvatar = async (nextAvatar: string) => {
    if (!user) return
    if (nextAvatar.trim().startsWith('blob:')) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      await usersApi.updateMe({
        name: name.trim() || user.name,
        avatar: nextAvatar.trim() ? nextAvatar.trim() : null,
      })
      await refreshUser()
      setMessage(nextAvatar.trim() ? 'Foto atualizada' : 'Foto removida')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível atualizar a foto',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = useMemo(() => {
    if (!user) return false
    return name.trim() !== user.name || (avatar.trim() || null) !== user.avatar
  }, [avatar, name, user])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      await usersApi.updateMe({
        name: name.trim(),
        avatar: avatarForSave(avatar, user.avatar),
      })
      await refreshUser()
      setMessage('Perfil atualizado')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await usersApi.deleteMe()
      clearTokens()
      logout()
      router.replace('/')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível excluir a conta',
      )
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancel = () => {
    if (!user) return
    setName(user.name)
    setAvatar(user.avatar ?? '')
    setError(null)
    setMessage(null)
  }

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const statItems = stats
    ? [
        { href: '/library', label: 'Na lista', value: String(stats.totalItems) },
        { href: '/stats', label: 'Assistidos', value: String(stats.watched) },
        { href: '/library', label: 'Favoritos', value: String(stats.favorites) },
        { href: '/stats', label: 'Nota média', value: formatRating(stats.averageRating) },
      ]
    : []

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-8 sm:py-14">
        {!user ? (
          <div className="animate-rise flex items-center gap-6">
            <div className="size-28 rounded-full bg-surface-2" />
            <div className="space-y-3">
              <div className="h-8 w-48 rounded bg-surface-2" />
              <div className="h-4 w-36 rounded bg-surface-2" />
            </div>
          </div>
        ) : (
          <>
            <section className="animate-rise flex flex-col gap-6 sm:flex-row sm:items-end">
              <UserAvatar
                src={avatar}
                name={name || user.name}
                className="size-28 rounded-full text-3xl font-bold sm:size-32"
              />

              <div className="min-w-0">
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  {user.name}
                </h1>
                <p className="mt-2 text-mute">{user.email}</p>
                {memberSince ? (
                  <p className="mt-1 text-sm text-mute">
                    Na CineTrack desde {memberSince}
                  </p>
                ) : null}
              </div>
            </section>

            {statItems.length > 0 ? (
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-y border-line py-6">
                {statItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="block transition hover:text-ink"
                    >
                      <p className="font-display text-3xl font-bold tracking-tight">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-mute">{item.label}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <form onSubmit={handleSave} className="mt-12">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Seus dados
              </h2>
              <p className="mt-2 text-sm text-mute">
                O e-mail fica ligado ao login e não muda por aqui.
              </p>

              <div className="mt-8 space-y-5">
                <Input
                  label="Nome"
                  name="name"
                  value={name}
                  minLength={2}
                  maxLength={100}
                  required
                  onChange={(event) => setName(event.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-mute">E-mail</p>
                  <p className="mt-2 text-ink">{user.email}</p>
                </div>

                <ImageUploadField
                  label="Foto"
                  value={avatar}
                  onChange={setAvatar}
                  onUploaded={(url) => void persistAvatar(url)}
                  onCleared={() => void persistAvatar('')}
                  folder="avatars"
                  showPreview={false}
                  showUrl={false}
                  hint="JPEG, PNG, WebP ou GIF · até 5MB. Salva na hora."
                />
              </div>

              {error ? (
                <p className="mt-5 text-sm text-accent" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="mt-5 text-sm text-ok" role="status">
                  {message}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving || !isDirty}>
                  {isSaving ? 'Salvando…' : 'Salvar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving || !isDirty}
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </div>
            </form>

            <section className="mt-16 border-t border-line pt-10">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Excluir conta
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-mute">
                Isso apaga o perfil e a biblioteca. Não dá para desfazer.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-6"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Excluir conta
                </Button>
              ) : (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-ink">
                    Tem certeza? A exclusão é permanente.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={isDeleting}
                      onClick={handleDeleteAccount}
                    >
                      {isDeleting ? 'Excluindo…' : 'Excluir definitivamente'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Manter conta
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </RequireAuth>
  )
}
