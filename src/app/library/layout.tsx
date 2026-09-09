import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Minha lista',
}

const LibraryLayout = ({ children }: { children: ReactNode }) => {
  return children
}

export default LibraryLayout
