import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import { startOfWeek, endOfWeek, addWeeks, format, eachDayOfInterval, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ semana?: string }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, is_marcio')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const { semana } = await searchParams
  const semanaOffset = parseInt(semana ?? '0', 10) || 0
  const hoje = new Date()
  const referenciaData = addWeeks(hoje, semanaOffset)
  const semanaInicio = startOfWeek(referenciaData, { weekStartsOn: 1 }) // Segunda
  const semanaFim    = endOfWeek(referenciaData, { weekStartsOn: 1 })   // Domingo
  const dias = eachDayOfInterval({ start: semanaInicio, end: semanaFim })

  // Filtrar por executor se for barbeiro
  let query = supabase
    .from('agendamentos')
    .select(`
      id, status, inicio, fim, origem,
      cliente:clientes(id, nome),
      executor:users!agendamentos_executor_id_fkey(id, nome),
      servico:servicos(nome, codigo)
    `)
    .gte('inicio', startOfDay(semanaInicio).toISOString())
    .lte('inicio', endOfDay(semanaFim).toISOString())
    .not('status', 'in', '(CANCELADO)')
    .order('inicio')

  if (profile.role === 'barbeiro') {
    query = query.eq('executor_id', profile.id)
  }

  const { data: agendamentos } = await query

  const prevSemana = semanaOffset - 1
  const nextSemana = semanaOffset + 1

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto lg:max-w-none">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="font-syne font-bold text-xl text-gold">Agenda</h1>
        {profile.role !== 'barbeiro' && (
          <Button asChild size="sm">
            <Link href="/dashboard/agendamentos/novo">
              <CalendarPlus size={16} />
              Novo
            </Link>
          </Button>
        )}
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/agenda?semana=${prevSemana}`}>
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Anterior</span>
          </Link>
        </Button>

        <div className="text-center">
          <p className="text-offwhite font-medium text-sm">
            {format(semanaInicio, "d MMM", { locale: ptBR })} – {format(semanaFim, "d MMM yyyy", { locale: ptBR })}
          </p>
          {semanaOffset === 0 && (
            <p className="text-xs text-gold/70">Semana atual</p>
          )}
        </div>

        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/agenda?semana=${nextSemana}`}>
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight size={16} />
          </Link>
        </Button>
      </div>

      {/* View por dia */}
      <div className="space-y-4">
        {dias.map((dia) => {
          const agsDia = (agendamentos ?? []).filter((ag: any) =>
            isSameDay(new Date(ag.inicio), dia)
          )
          const isHoje = isSameDay(dia, hoje)

          return (
            <div key={dia.toISOString()}>
              {/* Cabeçalho do dia */}
              <div className={`flex items-center gap-2 mb-2 ${isHoje ? 'text-gold' : 'text-offwhite/50'}`}>
                <span className="text-xs font-medium uppercase tracking-wide">
                  {format(dia, 'EEEE', { locale: ptBR })}
                </span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isHoje ? 'bg-gold/20 text-gold' : ''}`}>
                  {format(dia, 'd/MM')}
                </span>
                <span className="text-xs text-offwhite/30">({agsDia.length})</span>
              </div>

              {agsDia.length === 0 ? (
                <p className="text-offwhite/20 text-sm px-1 pb-2">—</p>
              ) : (
                <div className="space-y-1.5">
                  {agsDia.map((ag: any) => (
                    <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
                      <Card className={`hover:border-gold/40 transition-colors cursor-pointer ${isHoje ? 'border-gold/25' : ''}`}>
                        <CardContent className="py-2.5 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 flex items-center gap-3">
                              <span className="text-offwhite/60 text-xs font-mono shrink-0 w-10">
                                {format(new Date(ag.inicio), 'HH:mm')}
                              </span>
                              <div className="min-w-0">
                                <p className="text-offwhite font-medium text-sm truncate">
                                  {ag.cliente?.nome}
                                </p>
                                <p className="text-offwhite/40 text-xs">
                                  {ag.servico?.nome} · {ag.executor?.nome}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <BadgeOrigem origem={ag.origem} />
                              <BadgeStatus status={ag.status} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
