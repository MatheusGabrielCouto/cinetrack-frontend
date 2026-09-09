import { apiFetch, apiUpload } from './client'
import type {
  AddListItemInput,
  AchievementsSummary,
  AuthTokens,
  CreateLibraryItemInput,
  CreateListInput,
  LibraryItem,
  ListDetail,
  ListItem,
  ListSummary,
  MediaType,
  Stats,
  UpdateLibraryItemInput,
  UpdateListInput,
  User,
  WatchStatus,
} from '@/types'

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => apiFetch<User>('/auth/me'),
}

export const usersApi = {
  updateMe: (body: { name?: string; avatar?: string | null }) =>
    apiFetch<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteMe: () =>
    apiFetch<void>('/users/me', {
      method: 'DELETE',
    }),
}

export const libraryApi = {
  list: (filters?: {
    status?: WatchStatus
    mediaType?: MediaType
    favorite?: boolean
  }) => {
    const params = new URLSearchParams()

    if (filters?.status) params.set('status', filters.status)
    if (filters?.mediaType) params.set('mediaType', filters.mediaType)
    if (typeof filters?.favorite === 'boolean') {
      params.set('favorite', String(filters.favorite))
    }

    const query = params.toString()
    return apiFetch<LibraryItem[]>(`/library${query ? `?${query}` : ''}`)
  },

  get: (id: string) => apiFetch<LibraryItem>(`/library/${id}`),

  create: (body: CreateLibraryItemInput) =>
    apiFetch<LibraryItem>('/library', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateLibraryItemInput) =>
    apiFetch<LibraryItem>(`/library/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (id: string) =>
    apiFetch<void>(`/library/${id}`, {
      method: 'DELETE',
    }),
}

export const statsApi = {
  get: () => apiFetch<Stats>('/stats'),
}

export const listsApi = {
  mine: () => apiFetch<ListSummary[]>('/lists'),

  public: () => apiFetch<ListSummary[]>('/lists/public'),

  get: (id: string) => apiFetch<ListDetail>(`/lists/${id}`),

  getPublic: (id: string) => apiFetch<ListDetail>(`/lists/public/${id}`),

  create: (body: CreateListInput) =>
    apiFetch<ListSummary>('/lists', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateListInput) =>
    apiFetch<ListSummary>(`/lists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (id: string) =>
    apiFetch<void>(`/lists/${id}`, {
      method: 'DELETE',
    }),

  addItem: (listId: string, body: AddListItemInput) =>
    apiFetch<ListItem>(`/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  removeItem: (listId: string, itemId: string) =>
    apiFetch<void>(`/lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  reorderItems: (listId: string, itemIds: string[]) =>
    apiFetch<ListItem[]>(`/lists/${listId}/items/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ itemIds }),
    }),
}

export const achievementsApi = {
  get: () => apiFetch<AchievementsSummary>('/achievements'),
}

export type StorageUploadResult = {
  url: string
  key: string
  bucket: string
  contentType: string
  size: number
}

export const storageApi = {
  upload: (file: File, folder: 'avatars' | 'covers' | 'uploads' = 'uploads') =>
    apiUpload<StorageUploadResult>(
      `/storage/upload?folder=${folder}`,
      file,
    ),
}
