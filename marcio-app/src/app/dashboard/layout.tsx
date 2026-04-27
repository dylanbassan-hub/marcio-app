import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav, Sidebar } from '@/components/nav'

type DashboardProfile = {
  id: string
  ativo: boolean
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verifica se o usuário tem profile na tabela users
  const { data: profileData } = await supabase
    .from('users')
    .select('id, ativo')
    .eq('id', user.id)
    .single()

  const profile = profileData as DashboardProfile | null

  if (!profile || !profile.ativo) {
    // Conta sem profile ou desativada — redireciona pro login com mensagem
    redirect('/login?error=sem_acesso')
  }

  return (
    <div className="flex min-h-dvh bg-brand-black">
      {/* Sidebar — desktop */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <BottomNav />
    </div>
  )
}