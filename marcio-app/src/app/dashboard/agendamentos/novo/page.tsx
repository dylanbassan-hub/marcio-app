import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NovoAgendamentoForm } from './_form'

type ProfileNovoAgendamento = { role: string }
type ExecutorForm = { id: string; nome: string; role: string }
type ServicoForm = { id: number; nome: string; codigo: string; duracao_min: number }

interface NovoAgendamentoPageProps {
  searchParams: Promise<{ data?: string; hora?: string; executor?: string }>
}

export default async function NovoAgendamentoPage({ searchParams }: NovoAgendamentoPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const profile = profileData as ProfileNovoAgendamento | null
  if (!profile) redirect('/dashboard/agenda')

  // Admin, recepcionista e barbeiro podem criar agendamentos
  // Buscar executores: apenas barbeiros + Márcio (is_marcio=true)
  // Dylan e Liandra são admin mas não executam serviços
  const { data: executoresData } = await supabase
    .from('users').select('id, nome, role').eq('ativo', true).or('role.eq.barbeiro,is_marcio.eq.true').order('nome')
  const executores = (executoresData ?? []) as ExecutorForm[]

  const { data: servicosData } = await supabase
    .from('servicos').select('id, nome, codigo, duracao_min').eq('ativo', true)
  const servicos = (servicosData ?? []) as ServicoForm[]

  const { data: dataParam, hora: horaParam, executor: executorParam } = await searchParams

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
        defaultData={dataParam}
        defaultHora={horaParam}
        defaultExecutorId={executorParam}
      />
    </div>
  )
}
