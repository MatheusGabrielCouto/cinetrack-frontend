import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Em breve',
}

const UpcomingLayout = ({ children }: { children: ReactNode }) => {
  return children
}

export default UpcomingLayout
