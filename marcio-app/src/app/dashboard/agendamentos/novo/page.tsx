import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NovoAgendamentoForm } from './_form'

type ProfileNovoAgendamento = {
  role: string
}

type ExecutorForm = {
  id: string
  nome: string
  role: string
}

type ServicoForm = {
  id: number
  nome: string
  codigo: string
  duracao_min: number
}

export default async function NovoAgendamentoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileNovoAgendamento | null

  // Só admin e recepcionista podem criar
  if (!profile || profile.role === 'barbeiro') redirect('/dashboard/agenda')

  // Buscar executores ativos (admin + barbeiro)
  const { data: executoresData } = await supabase
    .from('users')
    .select('id, nome, role')
    .eq('ativo', true)
    .in('role', ['admin', 'barbeiro'])
    .order('nome')

  const executores = (executoresData ?? []) as ExecutorForm[]

  // Buscar serviços ativos
  const { data: servicosData } = await supabase
    .from('servicos')
    .select('id, nome, codigo, duracao_min')
    .eq('ativo', true)

  const servicos = (servicosData ?? []) as ServicoForm[]

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-2 mb-6">
        <h1 className="font-syne font-bold text-xl text-gold">Novo agendamento</h1>
        <p className="text-offwhite/50 text-sm">Preencha todos os campos obrigatórios</p>
      </div>

      <NovoAgendamentoForm
        executores={executores}
        servicos={servicos}
        recepcionistaId={user.id}
      />
    </div>
  )
}