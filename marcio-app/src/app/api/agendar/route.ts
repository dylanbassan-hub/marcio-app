import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMinutes } from 'date-fns'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/agendar
 * Body: { servico_id, executor_id, data, hora, nome, telefone, instagram? }
 * Cria ou reutiliza cliente, cria agendamento. Origem = INSTAGRAM_ORGANICO por padrão.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { servico_id, executor_id, data, hora, nome, telefone, instagram } = body

    if (!servico_id || !executor_id || !data || !hora || !nome) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    // Buscar serviço para obter duração
    const { data: servico } = await supabaseAdmin
      .from('servicos')
      .select('id, duracao_min')
      .eq('id', servico_id)
      .single()

    if (!servico) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    // Criar ou reutilizar cliente por telefone
    let clienteId: number

    if (telefone) {
      const { data: existing } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .eq('telefone', telefone)
        .single()

      if (existing) {
        clienteId = existing.id
      } else {
        const { data: novo, error: errCliente } = await supabaseAdmin
          .from('clientes')
          .insert({
            nome,
            telefone: telefone || null,
            instagram: instagram || null,
            origem_primeira_compra: 'INSTAGRAM_ORGANICO',
          })
          .select('id')
          .single()

        if (errCliente || !novo) {
          return NextResponse.json({ error: 'Erro ao registrar cliente' }, { status: 500 })
        }
        clienteId = novo.id
      }
    } else {
      const { data: novo, error: errCliente } = await supabaseAdmin
        .from('clientes')
        .insert({
          nome,
          telefone: null,
          instagram: instagram || null,
          origem_primeira_compra: 'INSTAGRAM_ORGANICO',
        })
        .select('id')
        .single()

      if (errCliente || !novo) {
        return NextResponse.json({ error: 'Erro ao registrar cliente' }, { status: 500 })
      }
      clienteId = novo.id
    }

    // Criar agendamento
    const inicio = new Date(`${data}T${hora}:00`)
    const fim    = addMinutes(inicio, servico.duracao_min ?? 60)

    const { data: ag, error: errAg } = await supabaseAdmin
      .from('agendamentos')
      .insert({
        cliente_id: clienteId,
        servico_id,
        executor_id,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        origem: 'INSTAGRAM_ORGANICO',
        status: 'AGENDADO',
        // recepcionista_id fica null — agendamento feito pelo próprio cliente
      })
      .select('id')
      .single()

    if (errAg || !ag) {
      return NextResponse.json({ error: `Erro ao agendar: ${errAg?.message}` }, { status: 500 })
    }

    return NextResponse.json({ agendamento_id: ag.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
