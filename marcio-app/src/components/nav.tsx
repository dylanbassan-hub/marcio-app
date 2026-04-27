'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, BarChart3, PlusCircle, User, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
  sidebarOnly?: boolean  // aparece só no sidebar desktop, não no bottom nav
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: <BarChart3 size={20} />,
    roles: ['admin', 'recepcionista', 'barbeiro'],
  },
  {
    href: '/dashboard/agenda',
    label: 'Agenda',
    icon: <CalendarDays size={20} />,
    roles: ['admin', 'recepcionista', 'barbeiro'],
  },
  {
    href: '/dashboard/agendamentos/novo',
    label: 'Novo',
    icon: <PlusCircle size={22} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: <Users size={20} />,
    roles: ['admin', 'recepcionista'],
  },
  {
    href: '/dashboard/relatorios',
    label: 'Relatórios',
    icon: <TrendingUp size={20} />,
    roles: ['admin', 'recepcionista'],
    sidebarOnly: true,  // no mobile, acessa via link no dashboard
  },
  {
    href: '/dashboard/perfil',
    label: 'Perfil',
    icon: <User size={20} />,
    roles: ['admin', 'recepcionista', 'barbeiro'],
  },
]

/** Bottom tab bar — mobile (default) */
export function BottomNav() {
  const pathname = usePathname()
  const { user } = useUser()
  if (!user) return null

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role) && !i.sidebarOnly)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-900 border-t border-gold/10 pb-safe">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px]',
                active
                  ? 'text-gold'
                  : 'text-offwhite/40 hover:text-offwhite/70'
              )}
            >
              {item.href === '/dashboard/agendamentos/novo' ? (
                <span className={cn(
                  'p-1.5 rounded-full',
                  active ? 'bg-gold/20' : 'hover:bg-brand-700'
                )}>
                  {item.icon}
                </span>
              ) : (
                item.icon
              )}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** Sidebar — desktop (lg+) */
export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  if (!user) return null

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role))

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-brand-900 border-r border-gold/10 px-3 py-6">
      {/* Logo */}
      <div className="px-3 mb-8">
        <span className="font-syne font-bold text-gold text-lg">Márcio Gonzalez</span>
        <p className="text-offwhite/40 text-xs mt-0.5">Salão · Agendamentos</p>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-offwhite/60 hover:bg-brand-800 hover:text-offwhite'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-3 pt-4 border-t border-gold/10">
        <p className="text-xs text-offwhite/60 truncate">{user.nome}</p>
        <p className="text-xs text-offwhite/30 capitalize">{user.role}</p>
      </div>
    </aside>
  )
}
