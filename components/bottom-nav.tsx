'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Plus, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/history', icon: FileText, label: 'ROs' },
  { href: '/ro/new', icon: Plus, label: 'New', isAction: true },
  { href: '/audit', icon: BarChart3, label: 'Audit' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          if (item.isAction) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-5 gap-0.5">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50 active:scale-95 transition-transform">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-[52px] active:opacity-70 transition-opacity"
            >
              <item.icon className={cn('w-[22px] h-[22px] transition-colors', isActive ? 'text-blue-400' : 'text-slate-500')} />
              <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-blue-400' : 'text-slate-500')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
