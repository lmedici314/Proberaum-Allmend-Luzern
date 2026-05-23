'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase-browser'

interface Props {
  userId: string
  initialKurzname: string
  initialNatel: string
  initialDefaultTitle: string
}

export default function ProfilClient({ userId, initialKurzname, initialNatel, initialDefaultTitle }: Props) {
  const supabase = createClient()
  const [kurzname, setKurzname] = useState(initialKurzname)
  const [natel, setNatel] = useState(initialNatel)
  const [defaultTitle, setDefaultTitle] = useState(initialDefaultTitle)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)

    const { error } = await supabase
      .from('profiles')
      .update({ kurzname, natel: natel || null, default_title: defaultTitle || null })
      .eq('id', userId)

    if (error) {
      setMsg({ type: 'error', text: 'Fehler: ' + error.message })
    } else {
      setMsg({ type: 'success', text: 'Profil gespeichert.' })
    }
    setLoading(false)
  }

  return (
    <>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Mein Profil</h2>
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Kurzname *</label>
            <input required value={kurzname}
              onChange={e => setKurzname(e.target.value)}
              placeholder="z.B. muster" />
          </div>
          <div>
            <label>Natel</label>
            <input value={natel}
              onChange={e => setNatel(e.target.value)}
              placeholder="+41 79 123 45 67" />
          </div>
          <div>
            <label>Standard-Titel für Buchungen</label>
            <input value={defaultTitle}
              onChange={e => setDefaultTitle(e.target.value)}
              placeholder="z.B. Bandprobe" />
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
              Wird beim Erstellen einer neuen Reservation als Vorschlag eingetragen.
            </p>
          </div>

          {msg && (
            <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <a href="/kalender" className="btn btn-ghost">Abbrechen</a>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
