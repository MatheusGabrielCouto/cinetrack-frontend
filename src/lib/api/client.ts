import {
  ACCESS_TOKEN_KEY,
  API_URL,
  REFRESH_TOKEN_KEY,
} from '@/lib/constants'
import type { AuthTokens } from '@/types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const getStoredTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined') return null

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

  if (!accessToken || !refreshToken) return null

  return { accessToken, refreshToken }
}

export const storeTokens = (tokens: AuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as {
      message?: string | string[]
    }

    if (Array.isArray(data.message)) {
      return data.message.join(', ')
    }

    return data.message ?? 'Falha na requisição'
  } catch {
    return 'Falha na requisição'
  }
}

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  const tokens = getStoredTokens()

  if (!tokens?.refreshToken) {
    return null
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })

  if (!response.ok) {
    clearTokens()
    return null
  }

  const data = (await response.json()) as { accessToken: string }
  storeTokens({
    accessToken: data.accessToken,
    refreshToken: tokens.refreshToken,
  })

  return data.accessToken
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> => {
  const tokens = getStoredTokens()
  const headers = new Headers(options.headers)
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!isFormData && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && retry) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const newAccessToken = await refreshPromise

    if (newAccessToken) {
      return apiFetch<T>(path, options, false)
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status)
  }

  return (await response.json()) as T
}

export const apiUpload = async <T>(
  path: string,
  file: File,
  fieldName = 'file',
): Promise<T> => {
  const formData = new FormData()
  formData.append(fieldName, file)
  return apiFetch<T>(path, {
    method: 'POST',
    body: formData,
  })
}
