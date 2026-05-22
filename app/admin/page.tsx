import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '../../lib/supabase-admin'
import Navbar from '../../components/Navbar'
import AdminClient from './AdminClient'

export default async function AdminPage() {
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

  if (!profile?.is_admin) redirect('/kalender')

  const { data: users } = await admin
    .from('profiles')
    .select('id, email, kurzname, natel, is_admin, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <Navbar kurzname={profile.kurzname} isAdmin={true} />
      <main style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <AdminClient initialUsers={users ?? []} />
      </main>
    </>
  )
}
