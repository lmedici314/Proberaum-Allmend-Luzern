'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase-browser'

interface NavbarProps {
  kurzname: string
  isAdmin: boolean
}

export default function Navbar({ kurzname, isAdmin }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const onAdminPage = pathname === '/admin'

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '56px',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.3rem' }}>
        Kalender Proberaum
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          {kurzname}
        </span>
        {isAdmin && (
          <a href={onAdminPage ? '/kalender' : '/admin'}
            className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
            {onAdminPage ? 'Reservation' : 'Admin'}
          </a>
        )}
        <button className="btn btn-secondary" onClick={logout}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
          Logout
        </button>
      </div>
    </nav>
  )
}
