import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, format, parseISO, setHours, setMinutes } from 'date-fns'

// Cliente com service key para leitura de agendamentos sem RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Horário de funcionamento
const HORA_INICIO = 9   // 09:00
const HORA_FIM    = 19  // 19:00
const INTERVALO   = 30  // minutos entre slots

/**
 * GET /api/agendar/disponibilidade
 * Query params: executor_id, data (yyyy-MM-dd), duracao_min
 * Retorna array de { hora: "HH:mm", disponivel: boolean }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const executorId = searchParams.get('executor_id')
  const data       = searchParams.get('data')
  const duracao    = parseInt(searchParams.get('duracao_min') ?? '60', 10)

  if (!executorId || !data) {
    return NextResponse.json({ error: 'executor_id e data são obrigatórios' }, { status: 400 })
  }

  // Agendamentos existentes do executor nesse dia
  const inicioDia = `${data}T00:00:00`
  const fimDia    = `${data}T23:59:59`

  const { data: agendamentos, error } = await supabaseAdmin
    .from('agendamentos')
    .select('inicio, fim, status')
    .eq('executor_id', executorId)
    .gte('inicio', inicioDia)
    .lte('inicio', fimDia)
    .not('status', 'in', '("CANCELADO","NAO_COMPARECEU")')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Gerar todos os slots do dia
  const dataBase = parseISO(data)
  const slots: { hora: string; disponivel: boolean }[] = []

  let cursor = setMinutes(setHours(dataBase, HORA_INICIO), 0)
  const limite = setMinutes(setHours(dataBase, HORA_FIM), 0)

  while (cursor < limite) {
    const slotFim = addMinutes(cursor, duracao)
    if (slotFim > limite) break

    // Verificar conflito com qualquer agendamento existente
    const conflito = (agendamentos ?? []).some((ag: any) => {
      const agInicio = new Date(ag.inicio)
      const agFim    = new Date(ag.fim)
      // Sobreposição: slot começa antes do fim E termina depois do início
      return cursor < agFim && slotFim > agInicio
    })

    slots.push({ hora: format(cursor, 'HH:mm'), disponivel: !conflito })
    cursor = addMinutes(cursor, INTERVALO)
  }

  return NextResponse.json({ slots })
}
