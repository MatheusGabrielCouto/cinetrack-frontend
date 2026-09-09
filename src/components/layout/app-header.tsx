'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Dropdown } from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'

const primaryLinks = [
  { href: '/discover', label: 'Início' },
  { href: '/for-you', label: 'Para você' },
  { href: '/library', label: 'Minha lista' },
  { href: '/lists', label: 'Coleções' },
  { href: '/upcoming', label: 'Em breve' },
]

const moreLinks = [
  { href: '/calendar', label: 'Calendário' },
  { href: '/stats', label: 'Estatísticas' },
  { href: '/achievements', label: 'Conquistas' },
  { href: '/wrapped', label: 'Wrapped' },
]

const allLinks = [...primaryLinks, { href: '/search', label: 'Busca' }, ...moreLinks]

const navLinkClass = (active: boolean) =>
  cn(
    'rounded px-2 py-2 text-sm transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
    active ? 'font-semibold text-ink' : 'text-mute hover:text-ink',
  )

const menuItemClass = (active: boolean) =>
  cn(
    'flex w-full items-center px-4 py-2 text-sm transition duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
    active ? 'bg-white/10 text-ink' : 'text-mute hover:bg-white/10 hover:text-ink',
  )

export const AppHeader = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const isCinematic =
    pathname.startsWith('/discover') ||
    pathname.startsWith('/title/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  const moreActive = moreLinks.some((link) => pathname.startsWith(link.href))

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        scrolled || !isCinematic || mobileOpen
          ? 'bg-bg/95 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href={isAuthenticated ? '/discover' : '/'}
            className="flex shrink-0 items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-accent"
            aria-label="Início CineTrack"
          >
            <img
              src="/icon.png"
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
            CINE<span className="text-ink">TRACK</span>
          </Link>

          {isAuthenticated ? (
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(navLinkClass(pathname.startsWith(link.href)), 'whitespace-nowrap')}
                >
                  {link.label}
                </Link>
              ))}
              <Dropdown
                ariaLabel="Mais páginas"
                triggerClassName={navLinkClass(moreActive)}
                trigger={<span>Mais</span>}
              >
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={menuItemClass(pathname.startsWith(link.href))}
                  >
                    {link.label}
                  </Link>
                ))}
              </Dropdown>
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isLoading ? (
            <span className="text-sm text-mute">Carregando…</span>
          ) : isAuthenticated ? (
            <>
              <Link
                href="/search"
                aria-label="Buscar"
                className="flex size-10 items-center justify-center rounded text-mute transition hover:text-ink"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 1 1 10.5 3m0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11"
                  />
                </svg>
              </Link>

              <Dropdown
                align="end"
                ariaLabel="Conta"
                triggerClassName="rounded px-1 py-1 text-mute hover:text-ink"
                trigger={
                  <UserAvatar
                    src={user?.avatar}
                    name={user?.name ?? 'CT'}
                    className="size-8 rounded text-xs font-bold text-ink"
                  />
                }
              >
                <Link
                  href="/profile"
                  role="menuitem"
                  className={menuItemClass(pathname.startsWith('/profile'))}
                >
                  Perfil
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className={menuItemClass(false)}
                >
                  Sair
                </button>
              </Dropdown>

              <button
                type="button"
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((value) => !value)}
                className="flex size-10 items-center justify-center rounded text-mute lg:hidden"
              >
                {mobileOpen ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"
                    />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <>
              {pathname.startsWith('/login') ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  Entrar
                </Button>
              )}
              {pathname.startsWith('/register') ? null : (
                <Button size="sm" onClick={() => router.push('/register')}>
                  Criar conta
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isAuthenticated && mobileOpen ? (
        <nav
          className="border-t border-line bg-bg px-4 py-3 lg:hidden"
          aria-label="Menu"
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded px-3 py-2.5 text-sm',
                  pathname.startsWith(link.href)
                    ? 'bg-surface-2 font-semibold text-ink'
                    : 'text-mute',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
