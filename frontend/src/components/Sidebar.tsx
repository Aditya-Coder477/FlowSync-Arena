'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navItems = [
  {
    section: 'Dashboards',
    items: [
      { href: '/attendee', label: 'My Experience', icon: '◉', description: 'Attendee view' },
      { href: '/staff', label: 'Staff', icon: '⚡', description: 'Operations' },
      { href: '/admin', label: 'Admin', icon: '◈', description: 'Analytics' },
      { href: '/control', label: 'Control Room', icon: '⬡', description: 'Risk & operations' },
    ]
  },
  {
    section: 'Planning',
    items: [
      { href: '/digital-twin', label: 'Digital Twin', icon: '◰', description: 'Venue simulation' },
    ]
  }
]

interface SidebarProps {
  calmMode?: boolean
}

export function Sidebar({ calmMode }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="sidebar" aria-label="Application sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {/* Logo mark */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="hsl(196, 80%, 50% / 0.15)" />
            <circle cx="14" cy="14" r="5" stroke="hsl(196, 80%, 50%)" strokeWidth="2" />
            <circle cx="14" cy="14" r="9" stroke="hsl(196, 80%, 50%)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
          </svg>
          <div>
            <div className="wordmark">FlowSync</div>
            <div className="tagline">Arena Operations</div>
          </div>
        </div>
        {calmMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'hsl(196, 30%, 12%)', border: '1px solid hsl(196, 35%, 20%)',
            borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginTop: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-500)' }} />
            <span style={{ fontSize: 10, color: 'var(--accent-400)', fontWeight: 600 }}>CALM MODE ACTIVE</span>
          </div>
        )}
      </div>

      {navItems.map(group => (
        <nav key={group.section} className="nav-section" aria-label={group.section}>
          <div className="nav-section-label" aria-hidden="true">{group.section}</div>
          {group.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('nav-item', { active: pathname.startsWith(item.href) })}
              aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              aria-label={`${item.label} — ${item.description}`}
            >
              <span style={{ fontSize: 16, lineHeight: 1, opacity: 0.9 }} aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      ))}

      {/* Bottom section */}
      <div style={{ marginTop: 'auto', padding: '0 var(--space-3)', paddingBottom: 'var(--space-4)' }}>
        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>
            Event Status
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
            Harmony Live 2026
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--density-green)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>In progress</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
