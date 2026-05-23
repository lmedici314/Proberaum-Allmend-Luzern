'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { de } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { createClient } from '../../lib/supabase-browser'
import ReservationModal from '../../components/ReservationModal'

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: { de }
})

const DnDCalendar = withDragAndDrop(Calendar)

type Room = 'studio' | 'jam'

const ROOM_COLORS: Record<Room, { other: string; own: string }> = {
  studio: { other: '#F0957A', own: '#C84B31' },
  jam:    { other: '#6DBF9E', own: '#2D6A4F' },
}

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  userId: string
  kurzname: string
  room: Room
  rawTitle: string // Titel ohne Prefix
}

interface Props { userId: string; kurzname: string }

export default function CalendarClient({ userId, kurzname }: Props) {
  const supabase = createClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room>('studio')
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | undefined>()

  // Key-State tracking
  const keysRef = useRef({ meta: false, alt: false, shift: false })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') keysRef.current.meta = true
      if (e.key === 'Alt') keysRef.current.alt = true
      if (e.key === 'Shift') keysRef.current.shift = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') keysRef.current.meta = false
      if (e.key === 'Alt') keysRef.current.alt = false
      if (e.key === 'Shift') keysRef.current.shift = false
    }
    const onBlur = () => { keysRef.current = { meta: false, alt: false, shift: false } }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, title, start_at, end_at, user_id, room, profiles(kurzname)')
    if (error) { console.error(error); return }
    setEvents((data ?? []).map((r: any) => ({
      id:       r.id,
      title:    `[${r.room === 'studio' ? 'Studio' : 'Jam'}] ${r.profiles?.kurzname ?? '?'}${r.title ? ' \u2013 ' + r.title : ''}`,
      rawTitle: r.title ?? '',
      start:    new Date(r.start_at),
      end:      new Date(r.end_at),
      userId:   r.user_id,
      kurzname: r.profiles?.kurzname ?? '?',
      room:     r.room as Room,
    })))
  }, [supabase])

  useEffect(() => { loadEvents() }, [loadEvents])

  function showError(msg: string) {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  async function handleSave({ title, start, end, room }: { title: string; start: Date; end: Date; room: Room }) {
    const { error } = await supabase.from('reservations').insert({
      user_id:  userId,
      title:    title || null,
      start_at: start.toISOString(),
      end_at:   end.toISOString(),
      room,
    })
    if (error) throw new Error(error.message)
    setModalOpen(false)
    loadEvents()
  }

  async function handleDelete() {
    if (!selectedEvent) return
    const { error } = await supabase.from('reservations').delete().eq('id', selectedEvent.id)
    if (error) throw new Error(error.message)
    setModalOpen(false)
    loadEvents()
  }

  function applyLocalUpdate(id: string, start: Date, end: Date) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, start, end } : e))
  }

  // Prüft ob ein Zeitraum frei ist (exkludiert eigene Events und optionale excludeId)
  function hasConflictWithOthers(room: Room, start: Date, end: Date, excludeId?: string): boolean {
    return events.some(e =>
      e.room === room &&
      e.userId !== userId &&
      e.id !== excludeId &&
      e.start < end && e.end > start
    )
  }

  async function copyEvent(source: CalEvent, newStart: Date, newEnd: Date) {
    // Prüfe Konflikt mit fremden Events
    if (hasConflictWithOthers(source.room, newStart, newEnd)) {
      showError('Überlappung: Dieser Zeitraum ist durch jemand anderen gebucht.')
      return
    }

    // Lösche eigene Events am Zielort die überlappen (nur eigene)
    const ownConflicts = events.filter(e =>
      e.room === source.room &&
      e.userId === userId &&
      e.id !== source.id &&
      e.start < newEnd && e.end > newStart
    )
    for (const conflict of ownConflicts) {
      await supabase.from('reservations').delete().eq('id', conflict.id)
    }

    const { error } = await supabase.from('reservations').insert({
      user_id:  userId,
      title:    source.rawTitle || null,
      start_at: newStart.toISOString(),
      end_at:   newEnd.toISOString(),
      room:     source.room,
    })
    if (error) {
      showError('Fehler beim Kopieren: ' + error.message)
    } else {
      showSuccess('Termin kopiert.')
    }
    loadEvents()
  }

  async function handleEventDrop({ event, start }: any) {
    const e = event as CalEvent
    if (e.userId !== userId) return

    const { meta, alt, shift } = keysRef.current
    const isCopy = meta // CMD/CTRL alleine oder mit Kombinationen

    if (!isCopy) {
      // Normales Verschieben
      const newStart = new Date(start)
      const duration = e.end.getTime() - e.start.getTime()
      const newEnd = new Date(newStart.getTime() + duration)
      applyLocalUpdate(e.id, newStart, newEnd)

      const { error } = await supabase
        .from('reservations')
        .update({ start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
        .eq('id', e.id)

      if (error) {
        loadEvents()
        if (error.message.includes('exclusion constraint')) {
          showError('Überlappung: Dieser Zeitraum ist bereits gebucht.')
        } else {
          showError('Fehler beim Verschieben: ' + error.message)
        }
      } else {
        loadEvents()
      }
      return
    }

    // === KOPIER-MODUS (CMD gedrückt) ===
    const newStart = new Date(start)
    const sourceDuration = e.end.getTime() - e.start.getTime()

    if (meta && !alt && !shift) {
      // Regel 2: CMD only – gleiche Dauer
      const newEnd = new Date(newStart.getTime() + sourceDuration)
      await copyEvent(e, newStart, newEnd)

    } else if (meta && alt && !shift) {
      // Regel 3: CMD+OPT – 15 Minuten
      const newEnd = new Date(newStart.getTime() + 15 * 60 * 1000)
      await copyEvent(e, newStart, newEnd)

    } else if (meta && alt && shift) {
      // Regel 4: CMD+OPT+SHIFT – gleiche Dauer, aber kürzen bis zum nächsten Event (eigen oder fremd)
      const idealEnd = new Date(newStart.getTime() + sourceDuration)

      // Finde nächstes Event im selben Raum nach newStart (eigen oder fremd, aber nicht das Source-Event)
      const nextEvent = events
        .filter(ev => ev.room === e.room && ev.id !== e.id && ev.start >= newStart)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0]

      let newEnd = idealEnd
      if (nextEvent && nextEvent.start < idealEnd) {
        newEnd = nextEvent.start // kürzen bis zum nächsten Event
      }

      // Mindestdauer 15 min
      if (newEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
        showError('Zu wenig Platz: Mindestdauer 15 Minuten nicht möglich.')
        return
      }

      // Bei CMD+OPT+SHIFT: keine eigenen Events am Ziel löschen (folgende Buchung bleibt)
      // Prüfe nur fremde Konflikte
      if (hasConflictWithOthers(e.room, newStart, newEnd, e.id)) {
        showError('Überlappung: Dieser Zeitraum ist durch jemand anderen gebucht.')
        return
      }

      const { error } = await supabase.from('reservations').insert({
        user_id:  userId,
        title:    e.rawTitle || null,
        start_at: newStart.toISOString(),
        end_at:   newEnd.toISOString(),
        room:     e.room,
      })
      if (error) {
        showError('Fehler beim Kopieren: ' + error.message)
      } else {
        showSuccess('Termin kopiert und angepasst.')
      }
      loadEvents()
    }
  }

  async function handleEventResize({ event, start, end }: any) {
    const e = event as CalEvent
    if (e.userId !== userId) return

    const newStart = new Date(start)
    const newEnd = new Date(end)
    applyLocalUpdate(e.id, newStart, newEnd)

    const { error } = await supabase
      .from('reservations')
      .update({ start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
      .eq('id', e.id)

    if (error) {
      loadEvents()
      if (error.message.includes('exclusion constraint')) {
        showError('Überlappung: Dieser Zeitraum ist bereits gebucht.')
      } else {
        showError('Fehler beim Ändern: ' + error.message)
      }
    } else {
      loadEvents()
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.6rem' }}>Reservation Proberaum Kegelsporthalle \u2013 Luzern</h2>
        <button className="btn btn-primary" onClick={() => {
          setSelectedEvent(undefined)
          setSelectedSlot(new Date())
          setSelectedRoom('jam')
          setModalOpen(true)
        }}>
          + Reservieren
        </button>
      </div>

      {/* Legende */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: ROOM_COLORS.studio.other }} />
          Studio
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: ROOM_COLORS.jam.other }} />
          Jam
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          Dunklere Farbe = eigene Buchung &nbsp;·&nbsp;
          Drag = verschieben &nbsp;·&nbsp;
          CMD+Drag = kopieren (gleiche Dauer) &nbsp;·&nbsp;
          CMD+OPT+Drag = kopieren (15 min) &nbsp;·&nbsp;
          CMD+OPT+SHIFT+Drag = kopieren (kürzt automatisch)
        </div>
      </div>

      {errorMsg && <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{errorMsg}</div>}
      {successMsg && <div className="success-msg" style={{ marginBottom: '0.75rem' }}>{successMsg}</div>}

      <DnDCalendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        style={{ height: 640 }}
        culture="de"
        messages={{
          next: 'Vor', previous: 'Zurück', today: 'Heute',
          month: 'Monat', week: 'Woche', day: 'Tag', agenda: 'Agenda',
          noEventsInRange: 'Keine Reservationen.',
        }}
        onSelectSlot={({ start }) => {
          setSelectedEvent(undefined)
          setSelectedSlot(start as Date)
          setSelectedRoom('jam')
          setModalOpen(true)
        }}
        onSelectEvent={(event) => {
          setSelectedEvent(event as CalEvent)
          setSelectedSlot(undefined)
          setModalOpen(true)
        }}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        selectable
        draggableAccessor={(event) => (event as CalEvent).userId === userId}
        resizableAccessor={(event) => (event as CalEvent).userId === userId}
        eventPropGetter={(event) => {
          const e = event as CalEvent
          const colors = ROOM_COLORS[e.room] ?? ROOM_COLORS.studio
          const bg = e.userId === userId ? colors.own : colors.other
          return {
            style: { backgroundColor: bg, background: bg, borderColor: bg, color: '#fff', border: 'none', borderRadius: '4px' },
            className: '',
          }
        }}
      />

      {modalOpen && !selectedEvent && (
        <ReservationModal
          defaultStart={selectedSlot}
          defaultRoom={selectedRoom}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {modalOpen && selectedEvent && (
        <ReservationModal
          existing={{
            title:    selectedEvent.title,
            start:    selectedEvent.start,
            end:      selectedEvent.end,
            kurzname: selectedEvent.kurzname,
            room:     selectedEvent.room,
          }}
          isOwner={selectedEvent.userId === userId}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
