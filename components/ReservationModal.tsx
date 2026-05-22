'use client'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

type Room = 'studio' | 'jam'

interface ReservationModalProps {
  defaultStart?: Date
  defaultRoom?: Room
  onSave: (data: { title: string; start: Date; end: Date; room: Room }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  existing?: { title: string; start: Date; end: Date; kurzname: string; room: Room }
  isOwner?: boolean
}

const ROOM_DEFAULTS: Record<Room, number> = {
  studio: 13,
  jam:    18,
}

function defaultStartForRoom(room: Room, base?: Date): Date {
  const d = base ? new Date(base) : new Date()
  d.setHours(ROOM_DEFAULTS[room], 0, 0, 0)
  return d
}

function defaultEndForRoom(start: Date): Date {
  const proposed = new Date(start.getTime() + 3 * 60 * 60 * 1000) // +3h
  const midnight = new Date(start)
  midnight.setHours(23, 59, 0, 0)
  return proposed > midnight ? midnight : proposed
}

export default function ReservationModal({
  defaultStart, defaultRoom, onSave, onDelete, onClose, existing, isOwner
}: ReservationModalProps) {
  const [room,  setRoom]  = useState<Room>(existing?.room ?? defaultRoom ?? 'studio')
  const [title, setTitle] = useState(existing?.title ?? '')

  const initialStart = existing?.start ?? defaultStartForRoom(existing?.room ?? defaultRoom ?? 'studio', defaultStart)
  const [start, setStart] = useState<Date>(initialStart)
  const [end,   setEnd]   = useState<Date>(existing?.end ?? defaultEndForRoom(initialStart))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeModified, setTimeModified] = useState(false)

  function handleRoomChange(r: Room) {
    setRoom(r)
    if (!timeModified) {
      const newStart = defaultStartForRoom(r, start)
      setStart(newStart)
      setEnd(defaultEndForRoom(newStart))
    }
  }

  async function handleSave() {
    if (end <= start) { setError('Endzeit muss nach Startzeit liegen.'); return }
    setLoading(true); setError('')
    try { await onSave({ title, start, end, room }) }
    catch (e: any) { setError(e.message ?? 'Fehler beim Speichern') }
    setLoading(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    setLoading(true)
    try { await onDelete() }
    catch (e: any) { setError(e.message ?? 'Fehler beim Löschen') }
    setLoading(false)
  }

  const readOnly = !!existing && !isOwner

  const ROOM_COLOR: Record<Room, string> = {
    studio: '#C84B31',
    jam:    '#2D6A4F',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem'
    }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: '440px' }}
        onClick={e => e.stopPropagation()}>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>
          {existing ? 'Reservation' : 'Raum reservieren'}
        </h2>

        {existing && (
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Gebucht von: <strong>{existing.kurzname}</strong>
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Raum-Auswahl */}
          <div>
            <label>Raum</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['studio', 'jam'] as Room[]).map(r => (
                <button key={r} disabled={readOnly}
                  onClick={() => !readOnly && handleRoomChange(r)}
                  style={{
                    flex: 1, padding: '0.6rem', border: '2px solid',
                    borderColor: room === r ? ROOM_COLOR[r] : 'var(--border)',
                    borderRadius: 'var(--radius)',
                    background: room === r ? ROOM_COLOR[r] : 'var(--surface)',
                    color: room === r ? '#fff' : 'var(--text)',
                    fontWeight: 600, cursor: readOnly ? 'default' : 'pointer',
                    textTransform: 'capitalize', fontSize: '0.9rem',
                  }}>
                  {r === 'studio' ? 'Studio' : 'Jam'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label>Titel (optional)</label>
            <input value={title} disabled={readOnly}
              onChange={e => setTitle(e.target.value)} placeholder="z.B. Bandprobe" />
          </div>
          <div>
            <label>Start</label>
            <DatePicker
              selected={start} disabled={readOnly}
              onChange={(d: Date | null) => { if (d) { setStart(d); setEnd(defaultEndForRoom(d)); setTimeModified(true) } }}
              showTimeSelect timeFormat="HH:mm" timeIntervals={15}
              dateFormat="dd.MM.yyyy HH:mm"
              customInput={<input />}
            />
          </div>
          <div>
            <label>Ende</label>
            <DatePicker
              selected={end} disabled={readOnly}
              onChange={(d: Date | null) => { if (d) { setEnd(d); setTimeModified(true) } }}
              showTimeSelect timeFormat="HH:mm" timeIntervals={15}
              dateFormat="dd.MM.yyyy HH:mm"
              customInput={<input />}
            />
          </div>
        </div>

        {error && <div className="error-msg" style={{ marginTop: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Schliessen</button>
          {isOwner && onDelete && (
            <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>Löschen</button>
          )}
          {!readOnly && (
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
