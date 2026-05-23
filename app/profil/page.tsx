import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '../../lib/supabase-admin'
import Navbar from '../../components/Navbar'
import ProfilClient from './ProfilClient'

export default async function ProfilPage() {
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
    .select('kurzname, natel, default_title, is_admin')
    .eq('id', user.id)
    .single()

  return (
    <>
      <Navbar kurzname={profile?.kurzname ?? user.email!} isAdmin={!!profile?.is_admin} />
      <main style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <ProfilClient
          userId={user.id}
          initialKurzname={profile?.kurzname ?? ''}
          initialNatel={profile?.natel ?? ''}
          initialDefaultTitle={profile?.default_title ?? ''}
        />
      </main>
    </>
  )
}
