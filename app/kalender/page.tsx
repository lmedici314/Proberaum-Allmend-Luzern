import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '../../lib/supabase-admin'
import Navbar from '../../components/Navbar'
import CalendarClient from './CalendarClient'

export default async function KalenderPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('kurzname, is_admin')
    .eq('id', user.id)
    .single()

  return (
    <>
      <Navbar kurzname={profile?.kurzname ?? user.email!} isAdmin={!!profile?.is_admin} />
      <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <CalendarClient userId={user.id} kurzname={profile?.kurzname ?? ''} />
      </main>
    </>
  )
}
