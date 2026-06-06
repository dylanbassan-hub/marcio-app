import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeOrigem, BadgeStatus } from '@/components/ui/badge'
import {
  startOfWeek, endOfWeek, addWeeks, addDays, subDays,
  format, eachDayOfInterval, isSameDay, startOfDay, endOfDay, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatHora } from '@/lib/date'
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { AgendaGrid } from './_agenda-grid'

interface PageProps {
  searchParams: Promise<{ semana?: string; view?: string; dia?: string }>
}

type ProfileAgenda = { id: string; role: string; is_marcio: boolean | null }

export default async function AgendaPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users').select('id, role, is_marcio').eq('id', user.id).single()
  const profile = profileData as ProfileAgenda | null
  if (!profile) redirect('/login')

  const { semana, view, dia: diaParam } = await searchParams
  const isGrid = view === 'grid'
  const hoje = new Date()
  const diaAtual = diaParam ? parseISO(diaParam) : hoje
  const prevDia = subDays(diaAtual, 1)
  const nextDia = addDays(diaAtual, 1)
  const semanaOffset = parseInt(semana ?? '0', 10) || 0
  const referenciaData = addWeeks(hoje, semanaOffset)
  const semanaInicio = startOfWeek(referenciaData, { weekStartsOn: 1 })
  const semanaFim = endOfWeek(referenciaData, { weekStartsOn: 1 })
  const dias = eachDayOfInterval({ start: semanaInicio, end: semanaFim })

  const rangeInicio = isGrid ? startOfDay(diaAtual) : startOfDay(semanaInicio)
  const rangeFim    = isGrid ? endOfDay(diaAtual)   : endOfDay(semanaFim)

  let query = supabase
    .from('agendamentos')
    .select(`id, status, inicio, fim, origem, executor_id,
      cliente:clientes(id, nome),
      executor:users!agendamentos_executor_id_fkey(id, nome),
      servico:servicos(nome, codigo)`)
    .gte('inicio', rangeInicio.toISOString())
    .lte('inicio', rangeFim.toISOString())
    .not('status', 'in', '(CANCELADO)')
    .order('inicio')

  if (profile.role === 'barbeiro') query = query.eq('executor_id', profile.id)
  const { data: agendamentos } = await query

  let executoresGrid: { id: string; nome: string }[] = []
  if (isGrid) {
    const { data: execData } = await supabase
      .from('users').select('id, nome').in('role', ['admin', 'barbeiro']).eq('ativo', true).order('nome')
    executoresGrid = profile.role === 'barbeiro'
      ? (execData ?? []).filter((e: { id: string; nome: string }) => e.id === profile.id)
      : (execData ?? []) as { id: string; nome: string }[]
  }

  const prevSemana = semanaOffset - 1
  const nextSemana = semanaOffset + 1
  const diaFmt    = format(diaAtual, 'yyyy-MM-dd')
  const prevDiaFmt = format(prevDia, 'yyyy-MM-dd')
  const nextDiaFmt = format(nextDia, 'yyyy-MM-dd')
  const isAdmin = profile.role === 'admin' || profile.is_marcio === true
  const agsTyped = (agendamentos ?? []) as Parameters<typeof AgendaGrid>[0]['agendamentos']

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto lg:max-w-none lg:h-[calc(100vh-4rem)] lg:flex lg:flex-col">
      <div className="flex items-center justify-between pt-2 shrink-0">
        <h1 className="font-syne font-bold text-xl text-gold">Agenda</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gold/20 overflow-hidden">
            <Link
              href={`/dashboard/agenda?view=lista&semana=${semanaOffset}`}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${!isGrid ? 'bg-gold/20 text-gold font-medium' : 'text-offwhite/50 hover:text-offwhite'}`}
            >
              <List size={13} /><span className="hidden sm:inline">Lista</span>
            </Link>
            <Link
              href={`/dashboard/agenda?view=grid&dia=${diaFmt}`}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-gold/20 transition-colors ${isGrid ? 'bg-gold/20 text-gold font-medium' : 'text-offwhite/50 hover:text-offwhite'}`}
            >
              <LayoutGrid size={13} /><span className="hidden sm:inline">Grade</span>
            </Link>
          </div>
          {isAdmin && (
            <Button asChild size="sm">
              <Link href="/dashboard/agendamentos/novo">
                <CalendarPlus size={16} /><span className="hidden sm:inline">Novo</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isGrid && (
        <div className="flex-1 min-h-0">
          <AgendaGrid
            dia={diaAtual}
            agendamentos={agsTyped}
            executores={executoresGrid}
            isAdmin={isAdmin}
            prevDiaHref={`/dashboard/agenda?view=grid&dia=${prevDiaFmt}`}
            nextDiaHref={`/dashboard/agenda?view=grid&dia=${nextDiaFmt}`}
            semanaHref={`/dashboard/agenda?view=lista&semana=${semanaOffset}`}
          />
        </div>
      )}

      {!isGrid && (
        <>
          <div className="flex items-center justify-between shrink-0">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/agenda?view=lista&semana=${prevSemana}`}>
                <ChevronLeft size={16} /><span className="hidden sm:inline">Anterior</span>
              </Link>
            </Button>
            <div className="text-center">
              <p className="text-offwhite font-medium text-sm">
                {format(semanaInicio, 'd MMM', { locale: ptBR })} {String.fromCharCode(8211)} {format(semanaFim, 'd MMM yyyy', { locale: ptBR })}
              </p>
              {semanaOffset === 0 && <p className="text-xs text-gold/70">Semana atual</p>}
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/agenda?view=lista&semana=${nextSemana}`}>
                <span className="hidden sm:inline">Proxima</span><ChevronRight size={16} />
              </Link>
            </Button>
          </div>

          <div className="space-y-4 overflow-y-auto flex-1">
            {dias.map((dia) => {
              const agsDia = (agendamentos ?? []).filter(
                (ag: { inicio: string }) => isSameDay(new Date(ag.inicio), dia)
              )
              const isHoje = isSameDay(dia, hoje)
              return (
                <div key={dia.toISOString()}>
                  <div className={`flex items-center gap-2 mb-2 ${isHoje ? 'text-gold' : 'text-offwhite/50'}`}>
                    <span className="text-xs font-medium uppercase tracking-wide">{format(dia, 'EEEE', { locale: ptBR })}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isHoje ? 'bg-gold/20 text-gold' : ''}`}>{format(dia, 'd/MM')}</span>
                    <span className="text-xs text-offwhite/30">({agsDia.length})</span>
                    <Link
                      href={`/dashboard/agenda?view=grid&dia=${format(dia, 'yyyy-MM-dd')}`}
                      className="ml-auto text-[10px] text-offwhite/25 hover:text-gold/60 transition-colors"
                    >
                      Grade
                    </Link>
                  </div>
                  {agsDia.length === 0 ? (
                    <p className="text-offwhite/20 text-sm px-1 pb-2">-</p>
                  ) : (
                    <div className="space-y-1.5">
                      {agsDia.map((ag: {
                        id: number; inicio: string; status: string; origem: string;
                        cliente: { nome: string } | null;
                        servico: { nome: string } | null;
                        executor: { nome: string } | null;
                      }) => (
                        <Link key={ag.id} href={`/dashboard/agendamentos/${ag.id}`}>
                          <Card className={`hover:border-gold/40 transition-colors cursor-pointer ${isHoje ? 'border-gold/25' : ''}`}>
                            <CardContent className="py-2.5 px-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1 flex items-center gap-3">
                                  <span className="text-offwhite/60 text-xs font-mono shrink-0 w-10">{formatHora(ag.inicio)}</span>
                                  <div className="min-w-0">
                                    <p className="text-offwhite font-medium text-sm truncate">{ag.cliente?.nome}</p>
                                    <p className="text-offwhite/40 text-xs">{ag.servico?.nome} {ag.executor?.nome ? `· ${ag.executor.nome}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <BadgeOrigem origem={ag.origem as any} />
                                  <BadgeStatus status={ag.status as any} />
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
        </>
      )}
    </div>
  )
}
