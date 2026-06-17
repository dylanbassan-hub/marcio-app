import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { BadgeOrigem } from '@/components/ui/badge'
import { formatBRL, whatsappLink } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { ORIGENS_PAGAS, type OrigemLead } from '@/lib/types/database'

type ProfileTrafego = { role: string }

type AgendamentoTrafego = {
  id: number
  status: string
  inicio: string
  valor_servico: number | null
  valor_protese: number | null
}

type ClienteTrafego = {
  id: number
  nome: string
  telefone: string | null
  origem_primeira_compra: OrigemLead | null
  created_at: string
  agendamentos: AgendamentoTrafego[] | null
}

export default async function TrafegoPagoPage() {
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

  const profile = profileData as ProfileTrafego | null

  if (!profile || profile.role === 'barbeiro') redirect('/dashboard')

  const { data: clientesData } = await supabase
    .from('clientes')
    .select(`
      id, nome, telefone, origem_primeira_compra, created_at,
      agendamentos:agendamentos(id, status, inicio, valor_servico, valor_protese)
    `)
    .in('origem_primeira_compra', ORIGENS_PAGAS)
    .order('nome')

  const clientes = (clientesData ?? []) as ClienteTrafego[]

  const linhas = clientes.map((c) => {
    const realizados = (c.agendamentos ?? []).filter((a) => a.status === 'REALIZADO')
    const totalServicos = realizados.reduce((s, a) => s + (Number(a.valor_servico) || 0), 0)
    const totalProteses = realizados.reduce((s, a) => s + (Number(a.valor_protese) || 0), 0)
    const ultimo = realizados
      .map((a) => a.inicio)
      .sort()
      .at(-1)

    return {
      cliente: c,
      fechamentos: realizados.length,
      total: totalServicos + totalProteses,
      ultimo,
    }
  })

  const totalGeralFechamentos = linhas.reduce((s, l) => s + l.fechamentos, 0)
  const totalGeralReceita = linhas.reduce((s, l) => s + l.total, 0)

  const porOrigem = clientes.reduce(
    (acc: Record<string, number>, c) => {
      const k = c.origem_primeira_compra ?? 'OUTRO'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    },
    {}
  )

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-2">
        <Link
          href="/dashboard/relatorios"
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite transition-colors"
        >
          <ChevronLeft size={15} />
          Relatórios
        </Link>
      </div>

      <div>
        <h1 className="font-syne font-bold text-xl text-gold">Clientes via tráfego pago</h1>
        <p className="text-offwhite/50 text-sm">
          Clientes cuja 1ª compra veio de Meta Ads ou Google Ads — comissão vale para
          todos os fechamentos seguintes, mesmo voltando direto pelo WhatsApp.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-offwhite/50">Clientes</p>
            <p className="text-xl font-syne font-bold text-offwhite mt-1">{clientes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-offwhite/50">Fechamentos</p>
            <p className="text-xl font-syne font-bold text-offwhite mt-1">{totalGeralFechamentos}</p>
          </CardContent>
        </Card>
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="pt-4">
            <p className="text-xs text-gold/70">Receita</p>
            <p className="text-xl font-syne font-bold text-gold mt-1">{formatBRL(totalGeralReceita)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Por origem */}
      {clientes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {ORIGENS_PAGAS.map((o) => (
            <div key={o} className="flex items-center gap-1.5">
              <BadgeOrigem origem={o} />
              <span className="text-xs text-offwhite/40">{porOrigem[o] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2 pb-4">
        {linhas.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-offwhite/40 text-sm">
                Nenhum cliente marcado com tag de tráfego pago ainda.
              </p>
              <p className="text-offwhite/25 text-xs mt-1">
                Marque a origem na ficha do cliente para que ele apareça aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          linhas
            .sort((a, b) => b.total - a.total)
            .map(({ cliente, fechamentos, total, ultimo }) => (
              <Card key={cliente.id} className="hover:border-gold/40 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/clientes/${cliente.id}`}
                        className="text-sm font-medium text-offwhite hover:text-gold transition-colors truncate block"
                      >
                        {cliente.nome}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <BadgeOrigem origem={cliente.origem_primeira_compra as OrigemLead} />
                        <span className="text-xs text-offwhite/35">
                          {fechamentos} {fechamentos === 1 ? 'fechamento' : 'fechamentos'}
                        </span>
                      </div>
                      {ultimo && (
                        <p className="text-[11px] text-offwhite/30 mt-0.5">
                          Último fechamento: {format(new Date(ultimo), "d 'de' MMM yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-semibold text-gold">{formatBRL(total)}</span>
                      {cliente.telefone && (
                        <a
                          href={whatsappLink(cliente.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px]"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  )
}
