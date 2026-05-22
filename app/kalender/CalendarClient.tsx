'use client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { de } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '../../lib/supabase-browser'
import ReservationModal from '../../components/ReservationModal'

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: { de }
})

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
}

interface Props { userId: string; kurzname: string }

export default function CalendarClient({ userId, kurzname }: Props) {
  const supabase = createClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room>('studio')
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | undefined>()

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, title, start_at, end_at, user_id, room, profiles(kurzname)')
    if (error) { console.error(error); return }
    setEvents((data ?? []).map((r: any) => ({
      id:       r.id,
      title:    `[${r.room === 'studio' ? 'Studio' : 'Jam'}] ${r.profiles?.kurzname ?? '?'}${r.title ? ' – ' + r.title : ''}`,
      start:    new Date(r.start_at),
      end:      new Date(r.end_at),
      userId:   r.user_id,
      kurzname: r.profiles?.kurzname ?? '?',
      room:     r.room as Room,
    })))
  }, [supabase])

  useEffect(() => { loadEvents() }, [loadEvents])

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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.6rem' }}>Reservation Proberaum Kegelsporthalle – Luzern</h2>
        <button className="btn btn-primary" onClick={() => {
          setSelectedEvent(undefined)
          setSelectedSlot(new Date())
          setSelectedRoom('studio')
          setModalOpen(true)
        }}>
          + Reservieren
        </button>
      </div>

      {/* Legende */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: ROOM_COLORS.studio.other }} />
          Studio
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: ROOM_COLORS.jam.other }} />
          Jam
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginLeft: '0.5rem' }}>
          Dunklere Farbe = eigene Buchung
        </div>
      </div>

      <Calendar
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
          setSelectedRoom('studio')
          setModalOpen(true)
        }}
        onSelectEvent={(event) => {
          setSelectedEvent(event as CalEvent)
          setSelectedSlot(undefined)
          setModalOpen(true)
        }}
        selectable
        eventPropGetter={(event) => {
          const e = event as CalEvent
          const colors = ROOM_COLORS[e.room] ?? ROOM_COLORS.studio
          return {
            style: {
              background: e.userId === userId ? colors.own : colors.other,
              border: 'none',
              borderRadius: '4px',
            }
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
