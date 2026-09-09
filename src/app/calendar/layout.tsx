import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Calendário',
}

const CalendarLayout = ({ children }: { children: ReactNode }) => {
  return children
}

export default CalendarLayout
