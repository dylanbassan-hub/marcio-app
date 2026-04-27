import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import { formatBRL, whatsappLink } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { AtualizarStatusBtn } from './_status-btn'

interface Props {
  params: Promise<{ id: string }>
}

type ProfileAgendamento = {
  id: string
  role: string
}

type AgendamentoDetalhe = {
  id: number
  status: string
  inicio: string
  fim: string | null
  origem: string | null
  origem_detalhe: string | null
  observacoes: string | null
  valor_servico: number | null
  valor_protese: number | null
  pagamento_forma: string | null
  fechado_at: string | null
  cliente: {
    id: number
    nome: string
    telefone: string | null
    instagram: string | null
  }
  servico: {
    nome: string
    codigo: string
    duracao_min: number
  }
  executor: {
    id: string
    nome: string
    telefone: string | null
  } | null
  recepcionista: {
    id: string
    nome: string
  } | null
}

export default async function AgendamentoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileAgendamento | null

  if (!profile) redirect('/login')

  const { data: agData } = await supabase
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      servico:servicos(*),
      executor:users!agendamentos_executor_id_fkey(id, nome, telefone),
      recepcionista:users!agendamentos_recepcionista_id_fkey(id, nome)
    `)
    .eq('id', id)
    .single()

  const ag = agData as AgendamentoDetalhe | null

  if (!ag) notFound()

  // Comissões do agendamento (se já fechado)
  const { data: comissoes } = await supabase
    .from('comissoes')
    .select('*, user:users(nome, is_trafego)')
    .eq('agendamento_id', id)
    .order('percentual', { ascending: false })

  const canClose =
    profile.role !== 'barbeiro' && ag.status !== 'REALIZADO' && ag.status !== 'CANCELADO'

  const canUpdateStatus =
    profile.role === 'admin' ||
    profile.role === 'recepcionista' ||
    profile.id === ag.executor?.id

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Back */}
      <div className="pt-2">
        <Link
          href="/dashboard/agenda"
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite transition-colors"
        >
          <ChevronLeft size={15} />
          Agenda
        </Link>
      </div>

      {/* Status + ações */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne font-bold text-xl text-offwhite">{ag.cliente.nome}</h1>
          <p className="text-offwhite/50 text-sm">
            {format(new Date(ag.inicio), "EEE, d 'de' MMM · HH:mm", { locale: ptBR })}
          </p>
        </div>
        <BadgeStatus status={ag.status as any} />
      </div>

      {/* Detalhes */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Row label="Serviço" value={ag.servico.nome} />
          <Row label="Executor" value={ag.executor?.nome ?? '—'} />
          <Row label="Recepcionista" value={ag.recepcionista?.nome ?? '—'} />
          <Row label="Duração" value={`${ag.servico.duracao_min}min`} />
          <Row label="Origem" value={<BadgeOrigem origem={ag.origem as any} />} />
          {ag.origem_detalhe && <Row label="Detalhe" value={ag.origem_detalhe} />}
          {ag.observacoes && <Row label="Obs." value={ag.observacoes} />}
        </CardContent>
      </Card>

      {/* Cliente */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-xs text-offwhite/40 uppercase tracking-wide font-medium">Cliente</p>
          <Row label="Nome" value={ag.cliente.nome} />
          {ag.cliente.telefone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-offwhite/50">WhatsApp</span>
              <a
                href={whatsappLink(ag.cliente.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm"
              >
                <MessageCircle size={14} />
                {ag.cliente.telefone}
              </a>
            </div>
          )}
          {ag.cliente.instagram && (
            <Row label="Instagram" value={`@${ag.cliente.instagram.replace('@', '')}`} />
          )}
          <Link
            href={`/dashboard/clientes/${ag.cliente.id}`}
            className="text-xs text-gold/70 hover:text-gold underline"
          >
            Ver ficha completa →
          </Link>
        </CardContent>
      </Card>

      {/* Fechamento (se realizado) */}
      {ag.status === 'REALIZADO' && ag.valor_servico && (
        <Card className="border-emerald-800/40">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wide font-medium">
              Fechamento
            </p>
            {ag.valor_protese && (
              <Row label="Prótese (material)" value={formatBRL(ag.valor_protese)} />
            )}
            <Row label="Serviço" value={formatBRL(ag.valor_servico)} />
            {ag.pagamento_forma && <Row label="Pagamento" value={ag.pagamento_forma} />}
            {ag.fechado_at && (
              <Row label="Fechado em" value={format(new Date(ag.fechado_at), 'd/MM HH:mm')} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Comissões */}
      {comissoes && comissoes.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-offwhite/40 uppercase tracking-wide font-medium mb-3">
              Comissões geradas
            </p>
            {comissoes.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-offwhite">{c.user?.nome}</span>
                  <span className="text-xs text-offwhite/40">{c.percentual}%</span>
                  {c.user?.is_trafego && (
                    <span className="text-xs text-gold/60 bg-gold/10 px-1.5 py-0.5 rounded">
                      tráfego
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    c.pago ? 'text-offwhite/40 line-through' : 'text-offwhite'
                  }`}
                >
                  {formatBRL(c.valor)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="space-y-2 pb-4">
        {canClose && (
          <Button asChild className="w-full" size="lg">
            <Link href={`/dashboard/agendamentos/${id}/fechar`}>
              <CheckCircle2 size={16} />
              Fechar agendamento
            </Link>
          </Button>
        )}

        {canUpdateStatus && ag.status === 'AGENDADO' && (
          <AtualizarStatusBtn agendamentoId={ag.id} novoStatus="CONFIRMADO" />
        )}

        {canUpdateStatus && ag.status !== 'CANCELADO' && ag.status !== 'REALIZADO' && (
          <AtualizarStatusBtn agendamentoId={ag.id} novoStatus="CANCELADO" variant="danger" />
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-offwhite/50 shrink-0">{label}</span>
      <span className="text-sm text-offwhite text-right">{value}</span>
    </div>
  )
}