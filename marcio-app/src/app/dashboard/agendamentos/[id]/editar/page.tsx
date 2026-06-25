import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditarAgendamentoForm } from './_form'

interface Props {
  params: Promise<{ id: string }>
}

type ProfileRow = { role: string }
type ExecutorForm = { id: string; nome: string; role: string }
type ServicoForm = { id: number; nome: string; codigo: string; duracao_min: number }

type AgendamentoEdit = {
  id: number
  cliente_id: number
  servico_id: number
  executor_id: string
  inicio: string
  status: string
  origem: string | null
  origem_detalhe: string | null
  observacoes: string | null
  cliente: { id: number; nome: string; telefone: string | null; instagram: string | null } | null
}

export default async function EditarAgendamentoPage({ params }: Props) {
  const { id } = await params
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

  const profile = profileData as ProfileRow | null
  if (!profile) redirect('/login')

  // Só admin e recepcionista editam o cadastro completo do agendamento.
  if (profile.role === 'barbeiro') redirect(`/dashboard/agendamentos/${id}`)

  const { data: agData } = await supabase
    .from('agendamentos')
    .select(
      'id, cliente_id, servico_id, executor_id, inicio, status, origem, origem_detalhe, observacoes, cliente:clientes(id, nome, telefone, instagram)'
    )
    .eq('id', id)
    .single()

  const ag = agData as AgendamentoEdit | null
  if (!ag) notFound()

  // Executores: barbeiros + Márcio (mesma regra do novo agendamento)
  const { data: executoresData } = await supabase
    .from('users')
    .select('id, nome, role')
    .eq('ativo', true)
    .or('role.eq.barbeiro,is_marcio.eq.true')
    .order('nome')
  const executores = (executoresData ?? []) as ExecutorForm[]

  const { data: servicosData } = await supabase
    .from('servicos')
    .select('id, nome, codigo, duracao_min')
    .eq('ativo', true)
  const servicos = (servicosData ?? []) as ServicoForm[]

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-2 mb-6">
        <Link
          href={`/dashboard/agendamentos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite transition-colors mb-3"
        >
          <ChevronLeft size={15} />
          Voltar
        </Link>
        <h1 className="font-syne font-bold text-xl text-gold">Editar agendamento</h1>
        <p className="text-offwhite/50 text-sm">Altere qualquer campo e salve — sem precisar recriar.</p>
      </div>

      <EditarAgendamentoForm agendamento={ag} executores={executores} servicos={servicos} />
    </div>
  )
}
