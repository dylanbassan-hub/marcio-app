import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import { formatBRL, whatsappLink } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, MessageCircle } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

type ProfileCliente = {
  role: string
}

type ClienteDetalhe = {
  id: number
  nome: string
  telefone: string | null
  instagram: string | null
  observacoes: string | null
  origem_primeira_compra: string | null
  created_at: string
}

export default async function ClientePage({ params }: Props) {
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

  const profile = profileData as ProfileCliente | null

  if (!profile || profile.role === 'barbeiro') redirect('/dashboard')

  const { data: clienteData } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  const cliente = clienteData as ClienteDetalhe | null

  if (!cliente) notFound()

  // Histórico de agendamentos
  const { data: historico } = await supabase
    .from('agendamentos')
    .select(`
      id, status, inicio, origem, valor_servico, valor_protese,
      servico:servicos(nome),
      executor:users!agendamentos_executor_id_fkey(nome)
    `)
    .eq('cliente_id', id)
    .order('inicio', { ascending: false })
    .limit(20)

  // Total gasto (REALIZADOS)
  const totalServicos =
    historico
      ?.filter((a: any) => a.status === 'REALIZADO')
      .reduce((s: number, a: any) => s + (Number(a.valor_servico) || 0), 0) ?? 0

  const totalProteses =
    historico
      ?.filter((a: any) => a.status === 'REALIZADO')
      .reduce((s: number, a: any) => s + (Number(a.valor_protese) || 0), 0) ?? 0

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="pt-2">
        <Link
          href="/dashboard/clientes"
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite"
        >
          <ChevronLeft size={15} />
          Clientes
        </Link>
      </div>

      {/* Nome e contato */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-syne font-bold text-xl text-offwhite">{cliente.nome}</h1>
          {cliente.origem_primeira_compra && (
            <div className="mt-1.5">
              <BadgeOrigem origem={cliente.origem_primeira_compra as any} />
            </div>
          )}
        </div>

        {cliente.telefone && (
          <a
            href={whatsappLink(cliente.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-800/40 text-emerald-300 px-3 py-2 rounded-lg text-sm hover:bg-emerald-900/50 transition-colors"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        )}
      </div>

      {/* Dados */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {cliente.telefone && <Row label="Telefone" value={cliente.telefone} />}
          {cliente.instagram && (
            <Row label="Instagram" value={`@${cliente.instagram.replace('@', '')}`} />
          )}
          {cliente.observacoes && <Row label="Observações" value={cliente.observacoes} />}
          <Row
            label="Cadastrado em"
            value={format(new Date(cliente.created_at), "d 'de' MMMM yyyy", { locale: ptBR })}
          />
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      {totalServicos > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-gold/70 uppercase tracking-wide">Total gasto</p>

            <div className="flex justify-between">
              <span className="text-sm text-offwhite/60">Serviços</span>
              <span className="text-sm font-medium text-offwhite">
                {formatBRL(totalServicos)}
              </span>
            </div>

            {totalProteses > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-offwhite/60">Próteses (material)</span>
                <span className="text-sm font-medium text-offwhite">
                  {formatBRL(totalProteses)}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-gold/10">
              <span className="text-sm font-medium text-gold">Total</span>
              <span className="text-sm font-bold text-gold">
                {formatBRL(totalServicos + totalProteses)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <div>
        <h2 className="font-syne font-semibold text-offwhite mb-3">Histórico</h2>

        {!historico?.length ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-offwhite/40 text-sm">Sem agendamentos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {historico.map((ag: any) => (
              <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
                <Card className="hover:border-gold/40 transition-colors cursor-pointer">
                  <CardContent className="py-2.5 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-offwhite">
                          {ag.servico?.nome}
                          {ag.valor_servico && (
                            <span className="text-offwhite/50 ml-1.5">
                              · {formatBRL(ag.valor_servico)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-offwhite/40 mt-0.5">
                          {format(new Date(ag.inicio), 'd/MM/yy HH:mm')} ·{' '}
                          {ag.executor?.nome}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <BadgeStatus status={ag.status as any} />
                        <BadgeOrigem origem={ag.origem as any} />
                      </div>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-offwhite/50 shrink-0">{label}</span>
      <span className="text-sm text-offwhite text-right">{value}</span>
    </div>
  )
}