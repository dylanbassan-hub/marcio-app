import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FecharAgendamentoForm } from './_form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

type ProfileFechamento = {
  role: string
}

type AgendamentoFechamento = {
  id: number
  status: string
  servico: {
    nome: string
    codigo: string
  }
  cliente: {
    nome: string
  }
}

export default async function FecharAgendamentoPage({ params }: Props) {
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

  const profile = profileData as ProfileFechamento | null

  if (!profile || profile.role === 'barbeiro') {
    redirect(`/dashboard/agendamentos/${id}`)
  }

  const { data: agData } = await supabase
    .from('agendamentos')
    .select(`*, servico:servicos(nome, codigo), cliente:clientes(nome)`)
    .eq('id', id)
    .single()

  const ag = agData as AgendamentoFechamento | null

  if (!ag) notFound()

  if (ag.status === 'REALIZADO' || ag.status === 'CANCELADO') {
    redirect(`/dashboard/agendamentos/${id}`)
  }

  const isAplicacao = ag.servico.codigo === 'APLICACAO'

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="pt-2">
        <Link
          href={`/dashboard/agendamentos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite"
        >
          <ChevronLeft size={15} />
          Voltar
        </Link>
      </div>

      <div>
        <h1 className="font-syne font-bold text-xl text-gold">Fechar agendamento</h1>
        <p className="text-offwhite/50 text-sm mt-0.5">
          {ag.cliente.nome} · {ag.servico.nome}
        </p>
      </div>

      <FecharAgendamentoForm
        agendamentoId={ag.id}
        isAplicacao={isAplicacao}
        closerId={user.id}
      />
    </div>
  )
}