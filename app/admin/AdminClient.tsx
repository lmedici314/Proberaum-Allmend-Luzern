'use client'
import { useState } from 'react'

interface UserProfile {
  id: string
  email: string
  kurzname: string
  natel: string | null
  is_admin: boolean
  created_at: string
}

interface EditForm {
  id: string
  kurzname: string
  natel: string
  is_admin: boolean
}

export default function AdminClient({ initialUsers }: { initialUsers: UserProfile[] }) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [form, setForm] = useState({ email: '', kurzname: '', natel: '', password: '', is_admin: false })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Edit-Modal State
  const [editUser, setEditUser] = useState<EditForm | null>(null)
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error ?? 'Fehler' })
    } else {
      setMsg({ type: 'success', text: `Benutzer ${form.kurzname} erstellt.` })
      setUsers([data.user, ...users])
      setForm({ email: '', kurzname: '', natel: '', password: '', is_admin: false })
    }
    setLoading(false)
  }

  async function deleteUser(id: string) {
    if (!confirm('Benutzer wirklich löschen?')) return
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    if (res.ok) setUsers(users.filter(u => u.id !== id))
    else setMsg({ type: 'error', text: 'Löschen fehlgeschlagen' })
  }

  function openEdit(u: UserProfile) {
    setEditMsg(null)
    setEditUser({ id: u.id, kurzname: u.kurzname, natel: u.natel ?? '', is_admin: u.is_admin })
  }

  async function saveEdit() {
    if (!editUser) return
    setEditLoading(true); setEditMsg(null)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editUser),
    })
    const data = await res.json()
    if (!res.ok) {
      setEditMsg({ type: 'error', text: data.error ?? 'Fehler beim Speichern' })
    } else {
      setUsers(users.map(u => u.id === data.user.id ? { ...u, ...data.user } : u))
      setEditUser(null)
    }
    setEditLoading(false)
  }

  return (
    <>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Benutzerverwaltung</h2>

      {/* Neuer Benutzer */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Neuer Benutzer</h3>
        <form onSubmit={createUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label>E-Mail *</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Kurzname *</label>
              <input required value={form.kurzname} placeholder="z.B. muster"
                onChange={e => setForm({ ...form, kurzname: e.target.value })} />
            </div>
            <div>
              <label>Passwort *</label>
              <input type="password" required value={form.password} minLength={8}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label>Natel</label>
              <input value={form.natel} placeholder="+41 79 123 45 67"
                onChange={e => setForm({ ...form, natel: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input type="checkbox" id="is_admin" checked={form.is_admin} style={{ width: 'auto' }}
              onChange={e => setForm({ ...form, is_admin: e.target.checked })} />
            <label htmlFor="is_admin" style={{ marginBottom: 0, textTransform: 'none', fontSize: '0.9rem', letterSpacing: 0 }}>
              Admin-Rechte
            </label>
          </div>
          {msg && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: '1rem' }}>{msg.text}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Erstellen…' : 'Benutzer erstellen'}
          </button>
        </form>
      </div>

      {/* Benutzerliste */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Benutzer ({users.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              {['Kurzname', 'E-Mail', 'Natel', 'Admin', 'Erstellt', ''].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{u.kurzname}</td>
                <td style={{ padding: '0.65rem 0.75rem' }}>{u.email}</td>
                <td style={{ padding: '0.65rem 0.75rem', color: 'var(--muted)' }}>{u.natel ?? '–'}</td>
                <td style={{ padding: '0.65rem 0.75rem' }}>{u.is_admin ? '✓' : '–'}</td>
                <td style={{ padding: '0.65rem 0.75rem', color: 'var(--muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('de-CH')}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => openEdit(u)}>
                    Bearbeiten
                  </button>
                  <button className="btn btn-danger" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => deleteUser(u.id)}>
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem'
        }} onClick={() => setEditUser(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '420px' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Benutzer bearbeiten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Kurzname *</label>
                <input required value={editUser.kurzname}
                  onChange={e => setEditUser({ ...editUser, kurzname: e.target.value })} />
              </div>
              <div>
                <label>Natel</label>
                <input value={editUser.natel} placeholder="+41 79 123 45 67"
                  onChange={e => setEditUser({ ...editUser, natel: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="edit_is_admin" checked={editUser.is_admin} style={{ width: 'auto' }}
                  onChange={e => setEditUser({ ...editUser, is_admin: e.target.checked })} />
                <label htmlFor="edit_is_admin" style={{ marginBottom: 0, textTransform: 'none', fontSize: '0.9rem', letterSpacing: 0 }}>
                  Admin-Rechte
                </label>
              </div>
            </div>
            {editMsg && <div className={editMsg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginTop: '1rem' }}>{editMsg.text}</div>}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={editLoading}>
                {editLoading ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
