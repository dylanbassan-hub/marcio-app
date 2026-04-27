import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { BadgeStatus } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign } from 'lucide-react'
import type { UserRow } from '@/lib/types/database'

export async function BarbeiroDashboard({ profile }: { profile: UserRow }) {
  const supabase = await createClient()
  const now = new Date()
  const mesInicio = startOfMonth(now).toISOString()
  const mesFim = endOfMonth(now).toISOString()

  // Minha agenda: hoje + amanhã
  const { data: agenda } = await supabase
    .from('agendamentos')
    .select(`
      id, status, inicio, fim,
      cliente:clientes(nome),
      servico:servicos(nome, codigo)
    `)
    .eq('executor_id', profile.id)
    .gte('inicio', startOfDay(now).toISOString())
    .lte('inicio', endOfDay(addDays(now, 1)).toISOString())
    .not('status', 'in', '(CANCELADO)')
    .order('inicio')

  const hoje = (agenda ?? []).filter((ag: any) => new Date(ag.inicio) <= endOfDay(now))
  const amanha = (agenda ?? []).filter((ag: any) => new Date(ag.inicio) > endOfDay(now))

  // Minhas comissões do mês
  const { data: comissoes } = await supabase
    .from('comissoes')
    .select('valor, pago, agendamento_id')
    .eq('user_id', profile.id)
    .gte('created_at', mesInicio)
    .lte('created_at', mesFim)

  const totalMes = comissoes?.reduce((s: number, c: any) => s + c.valor, 0) ?? 0
  const totalPago = comissoes?.filter((c: any) => c.pago).reduce((s: number, c: any) => s + c.valor, 0) ?? 0
  const totalPendente = totalMes - totalPago

  const AgendaList = ({ items, label }: { items: any[], label: string }) => (
    <div>
      <p className="text-xs font-medium text-offwhite/50 uppercase tracking-wide mb-2">{label}</p>
      {items.length === 0 ? (
        <p className="text-offwhite/25 text-sm px-1">Sem agendamentos</p>
      ) : (
        <div className="space-y-2">
          {items.map((ag: any) => (
            <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
              <Card className="hover:border-gold/40 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-offwhite font-medium text-sm truncate">
                        {ag.cliente?.nome}
                      </p>
                      <p className="text-offwhite/50 text-xs mt-0.5">
                        {format(new Date(ag.inicio), 'HH:mm')} · {ag.servico?.nome}
                      </p>
                    </div>
                    <BadgeStatus status={ag.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="pt-2">
        <h1 className="font-syne font-bold text-xl text-gold">Minha agenda</h1>
        <p className="text-offwhite/50 text-sm">
          {profile.nome} · {format(now, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Comissões do mês */}
      <Card className="border-gold/30 bg-gold/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <DollarSign size={18} className="text-gold" />
            <div className="flex-1">
              <p className="text-xs text-gold/70">Minhas comissões — {format(now, 'MMMM', { locale: ptBR })}</p>
              <p className="text-lg font-syne font-bold text-gold">{formatBRL(totalMes)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-offwhite/40">A receber</p>
              <p className="text-sm font-medium text-offwhite">{formatBRL(totalPendente)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agenda hoje */}
      <AgendaList items={hoje} label={`Hoje · ${format(now, "d/MM")}`} />

      {/* Agenda amanhã */}
      <AgendaList items={amanha} label={`Amanhã · ${format(addDays(now, 1), "d/MM")}`} />

    </div>
  )
}
