'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { storageApi } from '@/lib/api/cinetrack'
import { ApiError } from '@/lib/api/client'
import { cn, toDisplayAssetUrl } from '@/lib/utils'

type ImageUploadFieldProps = {
  label: string
  value: string
  onChange: (url: string) => void
  onUploaded?: (url: string) => void
  onCleared?: () => void
  folder: 'avatars' | 'covers' | 'uploads'
  hint?: string
  previewShape?: 'circle' | 'wide'
  showPreview?: boolean
  showUrl?: boolean
}

export const ImageUploadField = ({
  label,
  value,
  onChange,
  onUploaded,
  onCleared,
  folder,
  hint,
  previewShape = 'wide',
  showPreview = true,
  showUrl = true,
}: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handlePick = () => {
    inputRef.current?.click()
  }

  const revokeLocalPreview = () => {
    if (!previewUrlRef.current) return
    URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    setError(null)
    revokeLocalPreview()

    const localPreview = URL.createObjectURL(file)
    previewUrlRef.current = localPreview
    onChange(localPreview)

    try {
      const uploaded = await storageApi.upload(file, folder)
      onChange(uploaded.url)
      onUploaded?.(uploaded.url)
      revokeLocalPreview()
    } catch (err) {
      onChange('')
      revokeLocalPreview()
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível enviar a imagem',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    revokeLocalPreview()
    onChange('')
    onCleared?.()
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="sr-only"
      onChange={(event) => void handleFileChange(event)}
      aria-label={label}
    />
  )

  const uploadButton = (
    <div className="space-y-2">
      {fileInput}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isUploading}
        onClick={handlePick}
      >
        {isUploading ? 'Enviando…' : 'Enviar do computador'}
      </Button>
      <p className="text-xs text-mute">
        {hint ?? 'JPEG, PNG, WebP ou GIF · até 5MB'}
      </p>
    </div>
  )

  const previewSrc = toDisplayAssetUrl(value)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-mute">{label}</span>
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-mute hover:text-ink"
          >
            Remover
          </button>
        ) : null}
      </div>

      {showPreview ? (
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              'overflow-hidden border border-line bg-surface-2',
              previewShape === 'circle'
                ? 'size-20 rounded-full'
                : 'h-24 w-40 rounded-lg',
            )}
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-mute">
                Sem imagem
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">{uploadButton}</div>
        </div>
      ) : (
        uploadButton
      )}

      {showUrl ? (
        <label className="flex w-full flex-col gap-1.5">
          <span className="text-xs font-medium text-mute">Ou cole uma URL</span>
          <input
            type="text"
            inputMode="url"
            value={value.startsWith('blob:') ? '' : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://…"
            className="h-11 rounded border border-line bg-surface-2 px-3 text-ink placeholder:text-mute/70 focus:border-accent"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  )
}
