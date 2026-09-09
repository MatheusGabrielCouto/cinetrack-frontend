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

  useEffect(() => {
    if (!mobileOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [mobileOpen])

  useEffect(() => {
    const query = isAuthenticated ? '(min-width: 1024px)' : '(min-width: 768px)'
    const media = window.matchMedia(query)
    const handleChange = () => {
      if (media.matches) setMobileOpen(false)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleToggleMenu = () => {
    setMobileOpen((value) => !value)
  }

  const handleCloseMenu = () => {
    setMobileOpen(false)
  }

  const isCinematic =
    pathname === '/' ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/title/') ||
    pathname.startsWith('/upcoming') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/for-you') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/stats') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  const moreActive = moreLinks.some((link) => pathname.startsWith(link.href))
  const overlayBreakpoint = isAuthenticated ? 'lg:hidden' : 'md:hidden'
  const isActivePath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          mobileOpen
            ? 'bg-transparent'
            : scrolled || !isCinematic
              ? 'bg-bg/95 backdrop-blur-md'
              : 'bg-gradient-to-b from-black/80 to-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href={isAuthenticated ? '/discover' : '/'}
              className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-tight text-accent sm:gap-2.5 sm:text-2xl"
              aria-label="Início CineTrack"
            >
              <img
                src="/icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg"
              />
              <span className="hidden sm:inline">
                CINE<span className="text-ink">TRACK</span>
              </span>
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

                <div className="hidden lg:block">
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
                </div>

                <button
                  type="button"
                  aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                  aria-expanded={mobileOpen}
                  onClick={handleToggleMenu}
                  className="flex size-10 items-center justify-center rounded text-ink lg:hidden"
                >
                  {mobileOpen ? (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
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
                    className={cn(
                      'hidden h-8 px-2.5 text-xs md:inline-flex sm:h-9 sm:px-3 sm:text-sm',
                      isCinematic && !scrolled
                        ? 'border-white/40 bg-black/25 text-ink hover:bg-white/10'
                        : undefined,
                    )}
                    onClick={() => router.push('/login')}
                  >
                    Entrar
                  </Button>
                )}
                {pathname.startsWith('/register') ? null : (
                  <Button
                    size="sm"
                    className="hidden h-8 px-2.5 text-xs md:inline-flex sm:h-9 sm:px-3 sm:text-sm"
                    onClick={() => router.push('/register')}
                  >
                    Criar conta
                  </Button>
                )}
                <button
                  type="button"
                  aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                  aria-expanded={mobileOpen}
                  onClick={handleToggleMenu}
                  className="flex size-10 items-center justify-center rounded text-ink md:hidden"
                >
                  {mobileOpen ? (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"
                      />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className={cn('fixed inset-0 z-40', overlayBreakpoint)}>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={handleCloseMenu}
            className="menu-frost absolute inset-0 bg-black/72 backdrop-blur-xl"
          />
          <nav
            className="menu-frost-list pointer-events-none relative flex h-full flex-col overflow-y-auto px-6 pb-10 pt-24"
            aria-label="Menu"
          >
            {isAuthenticated ? (
              <div className="pointer-events-auto flex min-h-full flex-col">
                <div className="flex flex-col gap-0.5">
                  {allLinks.map((link) => {
                    const active = isActivePath(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-md py-2 pl-2 pr-3 text-lg tracking-tight transition',
                          active
                            ? 'bg-accent/15 font-bold text-accent'
                            : 'font-medium text-white/40 hover:text-white/80',
                        )}
                      >
                        <span
                          className={cn(
                            'h-4 w-[3px] shrink-0 rounded-full',
                            active ? 'bg-accent' : 'bg-transparent',
                          )}
                          aria-hidden="true"
                        />
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-auto border-t border-white/10 pt-6">
                  <Link
                    href="/profile"
                    aria-current={isActivePath('/profile') ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2.5 text-base',
                      isActivePath('/profile')
                        ? 'bg-accent/15 font-bold text-accent'
                        : 'text-white/40',
                    )}
                  >
                    <UserAvatar
                      src={user?.avatar}
                      name={user?.name ?? 'CT'}
                      className="size-9 rounded text-xs font-bold text-ink"
                    />
                    Perfil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-md px-2 py-2.5 text-left text-base text-white/40"
                  >
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-full flex-col justify-between">
                <div className="pointer-events-auto">
                  <p className="font-display text-4xl font-extrabold tracking-tight">
                    Filmes e séries, na sua lista.
                  </p>
                  <p className="mt-3 max-w-sm text-base leading-relaxed text-white/70">
                    Entre para acompanhar o que você assiste e salvar o que quer ver.
                  </p>
                </div>
                <div className="pointer-events-auto flex flex-col gap-3">
                  {pathname.startsWith('/register') ? null : (
                    <Button
                      size="lg"
                      className="h-12 w-full"
                      onClick={() => router.push('/register')}
                    >
                      Criar conta
                    </Button>
                  )}
                  {pathname.startsWith('/login') ? null : (
                    <Button
                      variant="ghost"
                      size="lg"
                      className="h-12 w-full border-white/35 bg-white/10 text-ink hover:bg-white/20"
                      onClick={() => router.push('/login')}
                    >
                      Entrar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </>
  )
}
