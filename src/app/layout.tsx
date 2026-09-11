import type { Metadata, Viewport } from 'next'
import { Figtree, Syne } from 'next/font/google'
import { LibrarySnapshotProvider } from '@/components/library/library-snapshot'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppHeader } from '@/components/layout/app-header'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
})

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'CineTrack',
    template: '%s · CineTrack',
  },
  description:
    'Lista, progresso e notas de filmes e séries. O CineTrack não reproduz conteúdo. Catálogo com dados do TMDB.',
  applicationName: 'CineTrack',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '1024x1024' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${figtree.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.themoviedb.org" />
      </head>
      <body className="min-h-full font-sans antialiased">
        <AuthProvider>
          <LibrarySnapshotProvider>
            <AppHeader />
            <main className="flex-1">{children}</main>
          </LibrarySnapshotProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
