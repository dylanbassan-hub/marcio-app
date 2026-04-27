import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeOrigem } from '@/components/ui/badge'
import { formatBRL, formatPct } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ORIGENS_PAGAS, type OrigemLead } from '@/lib/types/database'

interface PageProps {
  searchParams: Promise<{ mes?: string }>
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_trafego')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role === 'barbeiro') redirect('/dashboard')

  const { mes } = await searchParams
  const mesOffset = parseInt(mes ?? '0', 10) || 0
  const referencia = subMonths(new Date(), -mesOffset)
  const mesInicio = startOfMonth(referencia).toISOString()
  const mesFim = endOfMonth(referencia).toISOString()
  const mesLabel = format(referencia, 'MMMM yyyy', { locale: ptBR })

  // Agendamentos realizados no mês
  const { data: realizados } = await supabase
    .from('agendamentos')
    .select(`
      id, origem, valor_servico, valor_protese,
      servico:servicos(nome, codigo),
      executor:users!agendamentos_executor_id_fkey(id, nome)
    `)
    .eq('status', 'REALIZADO')
    .gte('inicio', mesInicio)
    .lte('inicio', mesFim)

  // Totais gerais
  const totalServicos = realizados?.reduce((s, a) => s + (a.valor_servico ?? 0), 0) ?? 0
  const totalProteses = realizados?.reduce((s, a) => s + (a.valor_protese ?? 0), 0) ?? 0
  const total = totalServicos + totalProteses

  // Por serviço
  const porServico = (realizados ?? []).reduce((acc: Record<string, { nome: string; servicos: number; proteses: number; count: number }>, a: any) => {
    const k = a.servico?.codigo ?? 'OUTRO'
    if (!acc[k]) acc[k] = { nome: a.servico?.nome ?? k, servicos: 0, proteses: 0, count: 0 }
    acc[k].servicos += a.valor_servico ?? 0
    acc[k].proteses += a.valor_protese ?? 0
    acc[k].count++
    return acc
  }, {})

  // Por origem
  const porOrigem = (realizados ?? []).reduce((acc: Record<string, { count: number; servicos: number }>, a: any) => {
    const k = a.origem as OrigemLead
    if (!acc[k]) acc[k] = { count: 0, servicos: 0 }
    acc[k].count++
    acc[k].servicos += a.valor_servico ?? 0
    return acc
  }, {})

  // Por executor (ranking)
  const porExecutor = (realizados ?? []).reduce((acc: Record<string, { nome: string; count: number; servicos: number }>, a: any) => {
    const k = a.executor?.id ?? 'x'
    if (!acc[k]) acc[k] = { nome: a.executor?.nome ?? '?', count: 0, servicos: 0 }
    acc[k].count++
    acc[k].servicos += a.valor_servico ?? 0
    return acc
  }, {})

  const executorRanking = Object.values(porExecutor).sort((a, b) => b.servicos - a.servicos)

  // Comissões a pagar
  const { data: comissoes } = await supabase
    .from('comissoes')
    .select('valor, pago, papel, user:users(id, nome, is_trafego, role)')
    .eq('pago', false)
    .gte('created_at', mesInicio)
    .lte('created_at', mesFim)

  const comissoesPorUsuario = (comissoes ?? []).reduce((acc: Record<string, { nome: string; valor: number; isTrafego: boolean }>, c: any) => {
    const k = c.user?.id ?? 'x'
    if (!acc[k]) acc[k] = { nome: c.user?.nome ?? '?', valor: 0, isTrafego: c.user?.is_trafego ?? false }
    acc[k].valor += c.valor
    return acc
  }, {})

  const totalTrafegoPago = (realizados ?? [])
    .filter((a: any) => ORIGENS_PAGAS.includes(a.origem))
    .reduce((s: number, a: any) => s + (a.valor_servico ?? 0), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">

      {/* Header + navegação de mês */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-syne font-bold text-xl text-gold">Relatórios</h1>
          <p className="text-offwhite/50 text-sm capitalize">{mesLabel}</p>
        </div>
        <div className="flex gap-1">
          <a href={`?mes=${mesOffset - 1}`} className="btn-ghost text-xs px-2 py-1.5">← Anterior</a>
          {mesOffset < 0 && <a href={`?mes=${mesOffset + 1}`} className="btn-ghost text-xs px-2 py-1.5">Próximo →</a>}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-offwhite/50">Faturamento total</p>
            <p className="text-xl font-syne font-bold text-offwhite mt-1">{formatBRL(total)}</p>
            <p className="text-xs text-offwhite/30">{realizados?.length ?? 0} atendimentos</p>
          </CardContent>
        </Card>
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="pt-4">
            <p className="text-xs text-gold/70">Tráfego pago</p>
            <p className="text-xl font-syne font-bold text-gold mt-1">{formatBRL(totalTrafegoPago)}</p>
            <p className="text-xs text-gold/40">
              {totalServicos > 0 ? `${((totalTrafegoPago / totalServicos) * 100).toFixed(0)}% do serviço` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Por serviço */}
      <Card>
        <CardHeader><CardTitle className="text-base">Por serviço</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          {Object.entries(porServico).map(([k, s]) => (
            <div key={k} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-offwhite">{s.nome}</p>
                <p className="text-xs text-offwhite/40">{s.count} atendimentos</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-offwhite">{formatBRL(s.servicos)}</p>
                {s.proteses > 0 && (
                  <p className="text-xs text-offwhite/40">+ {formatBRL(s.proteses)} mat.</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Por origem */}
      <Card>
        <CardHeader><CardTitle className="text-base">Por origem</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          {Object.entries(porOrigem)
            .sort(([, a], [, b]) => b.servicos - a.servicos)
            .map(([origem, o]) => (
            <div key={origem} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BadgeOrigem origem={origem as OrigemLead} />
                <span className="text-xs text-offwhite/40">{o.count}x</span>
              </div>
              <span className="text-sm font-medium text-offwhite">{formatBRL(o.servicos)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ranking executores */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ranking de executores</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          {executorRanking.map((e, i) => (
            <div key={e.nome} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-offwhite/30 w-4">{i + 1}.</span>
                <p className="text-sm text-offwhite">{e.nome}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-offwhite">{formatBRL(e.servicos)}</p>
                <p className="text-xs text-offwhite/40">{e.count} atend.</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Comissões a pagar */}
      <Card>
        <CardHeader><CardTitle className="text-base">Comissões a pagar</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          {Object.entries(comissoesPorUsuario).map(([, c]) => (
            <div key={c.nome} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-offwhite">{c.nome}</p>
                {c.isTrafego && (
                  <span className="text-xs text-gold/60 bg-gold/10 px-1.5 py-0.5 rounded">tráfego</span>
                )}
              </div>
              <span className="text-sm font-semibold text-offwhite">{formatBRL(c.valor)}</span>
            </div>
          ))}
          {Object.keys(comissoesPorUsuario).length === 0 && (
            <p className="text-offwhite/40 text-sm">Nenhuma comissão pendente.</p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
