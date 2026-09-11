const PREFIX = 'cinetrack:onboarded:'

export const onboardedStorageKey = (userId: string) => `${PREFIX}${userId}`

export const isOnboarded = (userId: string) => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(onboardedStorageKey(userId)) === '1'
}

export const markOnboarded = (userId: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(onboardedStorageKey(userId), '1')
}
