import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NovoAgendamentoForm } from './_form'

export default async function NovoAgendamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Só admin e recepcionista podem criar
  if (!profile || profile.role === 'barbeiro') redirect('/dashboard/agenda')

  // Buscar executores ativos (admin + barbeiro)
  const { data: executores } = await supabase
    .from('users')
    .select('id, nome, role')
    .eq('ativo', true)
    .in('role', ['admin', 'barbeiro'])
    .order('nome')

  // Buscar serviços ativos
  const { data: servicos } = await supabase
    .from('servicos')
    .select('id, nome, codigo, duracao_min')
    .eq('ativo', true)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-2 mb-6">
        <h1 className="font-syne font-bold text-xl text-gold">Novo agendamento</h1>
        <p className="text-offwhite/50 text-sm">Preencha todos os campos obrigatórios</p>
      </div>
      <NovoAgendamentoForm
        executores={executores ?? []}
        servicos={servicos ?? []}
        recepcionistaId={user.id}
      />
    </div>
  )
}
