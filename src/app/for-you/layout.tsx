import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Para você',
}

const ForYouLayout = ({ children }: { children: ReactNode }) => {
  return children
}

export default ForYouLayout
