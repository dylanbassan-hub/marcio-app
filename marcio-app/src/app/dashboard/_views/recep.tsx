import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, MessageCircle } from 'lucide-react'
import { whatsappLink } from '@/lib/utils'
import type { UserRow } from '@/lib/types/database'

export async function RecepDashboard({ profile }: { profile: UserRow }) {
  const supabase = await createClient()
  const now = new Date()

  // Próximos 3 dias
  const dias = [now, addDays(now, 1), addDays(now, 2)]

  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select(`
      id, status, inicio, fim, origem,
      cliente:clientes(id, nome, telefone),
      executor:users!agendamentos_executor_id_fkey(nome),
      servico:servicos(nome, codigo)
    `)
    .gte('inicio', startOfDay(now).toISOString())
    .lte('inicio', endOfDay(addDays(now, 2)).toISOString())
    .not('status', 'in', '(CANCELADO)')
    .order('inicio')

  // Agrupa por dia
  const porDia = dias.map(dia => ({
    dia,
    label: format(dia, "EEE d/MM", { locale: ptBR }),
    items: (agendamentos ?? []).filter((ag: any) => {
      const d = new Date(ag.inicio)
      return d >= startOfDay(dia) && d <= endOfDay(dia)
    }),
  }))

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-syne font-bold text-xl text-gold">Agenda</h1>
          <p className="text-offwhite/50 text-sm">
            {format(now, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agendamentos/novo">
            <CalendarPlus size={16} />
            + Novo
          </Link>
        </Button>
      </div>

      {/* Próximos 3 dias */}
      {porDia.map(({ dia, label, items }) => (
        <div key={dia.toISOString()}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-offwhite/50 uppercase tracking-wide">{label}</span>
            <span className="text-xs text-offwhite/30">({items.length})</span>
          </div>

          {items.length === 0 ? (
            <p className="text-offwhite/25 text-sm px-1">Sem agendamentos</p>
          ) : (
            <div className="space-y-2">
              {items.map((ag: any) => (
                <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
                  <Card className="hover:border-gold/40 transition-colors cursor-pointer active:scale-[0.99]">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-offwhite font-medium text-sm truncate">
                              {ag.cliente?.nome}
                            </span>
                            <BadgeOrigem origem={ag.origem} />
                          </div>
                          <p className="text-offwhite/50 text-xs mt-0.5">
                            {format(new Date(ag.inicio), 'HH:mm')} · {ag.servico?.nome}
                          </p>
                          <p className="text-offwhite/40 text-xs">{ag.executor?.nome}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <BadgeStatus status={ag.status} />
                          {ag.cliente?.telefone && (
                            <a
                              href={whatsappLink(ag.cliente.telefone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-emerald-400/70 hover:text-emerald-400 transition-colors"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

    </div>
  )
}
