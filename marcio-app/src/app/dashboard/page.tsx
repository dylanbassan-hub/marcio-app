import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './_views/admin'
import { RecepDashboard } from './_views/recep'
import { BarbeiroDashboard } from './_views/barbeiro'

type DashboardProfile = {
  id: string
  nome: string
  email: string | null
  role: 'admin' | 'recepcionista' | 'barbeiro'
  ativo: boolean
  telefone: string | null
  is_marcio: boolean | null
  is_trafego: boolean | null
  comissao_padrao_pct: number | null
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as DashboardProfile | null

  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    return <AdminDashboard profile={profile as any} />
  }

  if (profile.role === 'recepcionista') {
    return <RecepDashboard profile={profile as any} />
  }

  if (profile.role === 'barbeiro') {
    return <BarbeiroDashboard profile={profile as any} />
  }

  redirect('/login')
}