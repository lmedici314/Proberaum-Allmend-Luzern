import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase-admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

// POST /api/users – Benutzer erstellen
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Nicht authorisiert' }, { status: 403 })

  const { email, password, kurzname, natel, is_admin } = await req.json()
  if (!email || !password || !kurzname)
    return NextResponse.json({ error: 'email, password, kurzname sind pflicht' }, { status: 400 })

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { kurzname, natel },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({ is_admin: !!is_admin, natel: natel || null })
    .eq('id', authData.user.id)
    .select()
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  return NextResponse.json({ user: profile }, { status: 201 })
}

// PATCH /api/users – Benutzer mutieren
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Nicht authorisiert' }, { status: 403 })

  const { id, kurzname, natel, is_admin } = await req.json()
  if (!id || !kurzname)
    return NextResponse.json({ error: 'id und kurzname sind pflicht' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .update({ kurzname, natel: natel || null, is_admin: !!is_admin })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: profile })
}

// DELETE /api/users?id=xxx – Benutzer löschen
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Nicht authorisiert' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
