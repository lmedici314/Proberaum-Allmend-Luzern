-- ============================================================
-- RAUMKALENDER – Supabase SQL Schema
-- Ausführen in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Benutzerprofil-Tabelle (ergänzt Supabase Auth)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  kurzname    TEXT NOT NULL,
  natel       TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Reservationen
CREATE TABLE public.reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT,                        -- optionaler Titel
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    tstzrange(start_at, end_at) WITH &&
  )
);

-- Für EXCLUDE USING gist wird die Extension benötigt:
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Profiles: jeder sieht alle (für Kalenderanzeige), nur eigene editierbar
CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Reservationen: alle eingeloggten sehen alles
CREATE POLICY "reservations_select"  ON public.reservations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reservations_insert"  ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_delete"  ON public.reservations FOR DELETE USING (auth.uid() = user_id);

-- Admins dürfen alles (via Service Role Key aus API-Routes)
-- → kein RLS nötig, Service Role umgeht RLS

-- 4. Trigger: Profil automatisch bei User-Erstellung anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, kurzname, natel, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'kurzname', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'natel',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
