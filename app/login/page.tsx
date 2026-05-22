'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Login fehlgeschlagen: ' + error.message)
    } else {
      router.push('/kalender')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Raumkalender</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Bitte mit deinem Konto einloggen.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>E-Mail</label>
            <input
              type="email" value={email} required autoComplete="email"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label>Passwort</label>
            <input
              type="password" value={password} required autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? 'Einloggen…' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
