'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/auth/require-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { listsApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export default function NewListPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const list = await listsApi.create({
        name: name.trim(),
        description: description.trim() || null,
        coverUrl: coverUrl.trim() || null,
        isPublic,
      })
      router.push(`/lists/${list.id}`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível criar a lista',
      )
      setIsSaving(false)
    }
  }

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-mute transition hover:text-ink"
          aria-label="Voltar"
        >
          ← Voltar
        </button>

        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Nova lista
        </h1>
        <p className="mt-2 text-mute">
          Dê um nome, uma capa e escolha se ela fica só pra você ou aberta ao
          mundo.
        </p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          <Input
            label="Nome"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Filmes para assistir no Halloween"
            minLength={2}
            maxLength={100}
            required
            aria-label="Nome da lista"
          />

          <label className="flex w-full flex-col gap-1.5" htmlFor="description">
            <span className="text-sm font-medium text-mute">Descrição</span>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="O que une esses títulos?"
              className="rounded border border-line bg-surface-2 px-3 py-2 text-ink placeholder:text-mute/70 transition focus:border-accent"
              aria-label="Descrição da lista"
            />
          </label>

          <ImageUploadField
            label="Capa"
            value={coverUrl}
            onChange={setCoverUrl}
            folder="covers"
            previewShape="wide"
          />

          <fieldset>
            <legend className="text-sm font-medium text-mute">Visibilidade</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: false,
                    title: 'Privada',
                    hint: 'Só você vê e edita',
                  },
                  {
                    value: true,
                    title: 'Pública',
                    hint: 'Aparece em Explorar',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setIsPublic(option.value)}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition',
                    isPublic === option.value
                      ? 'border-accent bg-accent/10'
                      : 'border-line hover:border-mute',
                  )}
                  aria-pressed={isPublic === option.value}
                  aria-label={`Marcar como ${option.title}`}
                >
                  <span className="block font-semibold text-ink">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-mute">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {error ? <p className="text-sm text-accent">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={isSaving || name.trim().length < 2}>
              {isSaving ? 'Criando…' : 'Criar lista'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/lists')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </RequireAuth>
  )
}
