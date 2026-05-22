# Raumkalender – Setup

## Voraussetzungen
- Node.js 18+
- Ein Supabase-Konto (kostenlos): https://supabase.com
- Ein Vercel-Konto (kostenlos): https://vercel.com

---

## 1. Supabase einrichten

1. Neues Projekt auf supabase.com erstellen
2. Im SQL Editor den Inhalt von `supabase_schema.sql` ausführen
3. Unter **Settings → API** diese Werte kopieren:
   - `Project URL`
   - `anon public` Key
   - `service_role` Key (geheim halten!)

---

## 2. Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Umgebungsvariablen setzen
cp .env.local.example .env.local
# → .env.local mit deinen Supabase-Werten befüllen

# Dev-Server starten
npm run dev
# → http://localhost:3000
```

---

## 3. Ersten Admin-Benutzer erstellen

Da das Admin-Interface selbst Admin-Rechte braucht, den ersten Admin direkt in Supabase erstellen:

1. Supabase Dashboard → **Authentication → Users → Add User**
2. E-Mail + Passwort setzen
3. Im SQL Editor:
```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'deine@email.ch';
```
4. Einloggen → /admin → weitere Benutzer anlegen

---

## 4. Deployment auf Vercel

```bash
# Vercel CLI installieren
npm i -g vercel

# Deployen
vercel

# Umgebungsvariablen in Vercel setzen:
# → vercel.com → Projekt → Settings → Environment Variables
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

---

## Projektstruktur

```
app/
  login/          → Login-Seite
  kalender/       → Kalender + Reservation
  admin/          → Benutzerverwaltung
  api/users/      → REST-Endpoint für Admin-Operationen
components/
  Navbar.tsx
  ReservationModal.tsx
lib/
  supabase-browser.ts   → Client-seitiger Supabase-Client
  supabase-admin.ts     → Server-seitiger Admin-Client (Service Role)
supabase_schema.sql     → Datenbank-Schema (einmalig ausführen)
```

---

## Funktionen

| Feature | Status |
|---|---|
| Login mit E-Mail + Passwort | ✅ |
| Kalender (Tag/Woche/Monat) | ✅ |
| Reservation per Klick | ✅ |
| Kurzname im Kalender sichtbar | ✅ |
| Eigene Reservationen löschen | ✅ |
| Überlappungsschutz (DB-Ebene) | ✅ |
| Admin: Benutzer erstellen | ✅ |
| Admin: Benutzer löschen | ✅ |
| Eigene Farbe vs. fremde Buchungen | ✅ (grün = du, rot = andere) |
