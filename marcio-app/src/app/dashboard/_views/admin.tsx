import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, TrendingUp, Users, DollarSign } from 'lucide-react'
import type { UserRow } from '@/lib/types/database'

export async function AdminDashboard({ profile }: { profile: UserRow }) {
  const supabase = await createClient()
  const now = new Date()
  const mesInicio = startOfMonth(now).toISOString()
  const mesFim    = endOfMonth(now).toISOString()
  const hojeInicio = startOfDay(now).toISOString()
  const hojeFim    = endOfDay(now).toISOString()

  // Agendamentos de hoje
  const { data: agendamentosHoje } = await supabase
    .from('agendamentos')
    .select('id, status, inicio, fim, origem, cliente:clientes(nome), executor:users!agendamentos_executor_id_fkey(nome), servico:servicos(nome, codigo)')
    .gte('inicio', hojeInicio)
    .lte('inicio', hojeFim)
    .not('status', 'in', '(CANCELADO)')
    .order('inicio')

  // Faturamento do mês (agendamentos REALIZADOS)
  const { data: realizados } = await supabase
    .from('agendamentos')
    .select('valor_servico, valor_protese, origem')
    .eq('status', 'REALIZADO')
    .gte('inicio', mesInicio)
    .lte('inicio', mesFim)

  const faturamentoServicos = realizados?.reduce((s, a) => s + (a.valor_servico ?? 0), 0) ?? 0
  const faturamentoProteses = realizados?.reduce((s, a) => s + (a.valor_protese ?? 0), 0) ?? 0
  const totalMes = faturamentoServicos + faturamentoProteses
  const totalTrafegoPago = realizados
    ?.filter(a => a.origem === 'META_ADS' || a.origem === 'GOOGLE_ADS')
    .reduce((s, a) => s + (a.valor_servico ?? 0), 0) ?? 0

  // Clientes novos do mês
  const { count: clientesNovos } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', mesInicio)
    .lte('created_at', mesFim)

  // Comissão do Dylan (tráfego) não paga no mês
  const { data: comissoesDylan } = await supabase
    .from('comissoes')
    .select('valor, user:users!comissoes_user_id_fkey(is_trafego)')
    .eq('pago', false)
    .gte('created_at', mesInicio)

  const comissaoPendente = comissoesDylan
    ?.filter((c: any) => c.user?.is_trafego)
    .reduce((s: number, c: any) => s + c.valor, 0) ?? 0

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto lg:max-w-none">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-syne font-bold text-xl text-gold">Dashboard</h1>
          <p className="text-offwhite/50 text-sm capitalize">
            {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/agendamentos/novo">
            <CalendarPlus size={16} />
            Novo
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-offwhite/50">Hoje</p>
                <p className="text-2xl font-syne font-bold text-offwhite mt-0.5">
                  {agendamentosHoje?.length ?? 0}
                </p>
                <p className="text-xs text-offwhite/40">agendamentos</p>
              </div>
              <CalendarPlus size={18} className="text-gold/60 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-offwhite/50">Mês</p>
                <p className="text-xl font-syne font-bold text-offwhite mt-0.5 truncate">
                  {formatBRL(totalMes)}
                </p>
                <p className="text-xs text-offwhite/40">faturamento</p>
              </div>
              <TrendingUp size={18} className="text-gold/60 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-offwhite/50">Novos</p>
                <p className="text-2xl font-syne font-bold text-offwhite mt-0.5">
                  {clientesNovos ?? 0}
                </p>
                <p className="text-xs text-offwhite/40">clientes/mês</p>
              </div>
              <Users size={18} className="text-gold/60 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-offwhite/50">Tráfego</p>
                <p className="text-xl font-syne font-bold text-gold mt-0.5 truncate">
                  {formatBRL(comissaoPendente)}
                </p>
                <p className="text-xs text-offwhite/40">comissão pend.</p>
              </div>
              <DollarSign size={18} className="text-gold/60 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tráfego pago do mês */}
      {totalTrafegoPago > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gold/70">Serviços via tráfego pago (mês)</p>
                <p className="text-lg font-syne font-bold text-gold">{formatBRL(totalTrafegoPago)}</p>
              </div>
              <Link href="/dashboard/relatorios" className="text-xs text-gold/60 hover:text-gold underline">
                ver relatório
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda de hoje */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-syne font-semibold text-offwhite">Hoje</h2>
          <Link href="/dashboard/agenda" className="text-xs text-gold/70 hover:text-gold">
            ver agenda completa →
          </Link>
        </div>

        {!agendamentosHoje?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-offwhite/40 text-sm">Nenhum agendamento hoje.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {agendamentosHoje.map((ag: any) => (
              <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
                <Card className="hover:border-gold/40 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-offwhite font-medium text-sm truncate">
                            {ag.cliente?.nome}
                          </span>
                          <BadgeOrigem origem={ag.origem} />
                        </div>
                        <p className="text-offwhite/50 text-xs mt-0.5">
                          {format(new Date(ag.inicio), 'HH:mm')} — {ag.servico?.nome} · {ag.executor?.nome}
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

    </div>
  )
}
