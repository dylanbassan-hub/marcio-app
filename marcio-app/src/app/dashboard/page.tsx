import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './_views/admin'
import { RecepDashboard } from './_views/recep'
import { BarbeiroDashboard } from './_views/barbeiro'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.role === 'admin')        return <AdminDashboard profile={profile} />
  if (profile.role === 'recepcionista') return <RecepDashboard profile={profile} />
  if (profile.role === 'barbeiro')      return <BarbeiroDashboard profile={profile} />

  redirect('/login')
}
