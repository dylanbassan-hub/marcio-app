/**
 * Conversões Offline (Fase 1) — endpoint chamado pelo próprio app
 *
 * Recebe telefone em texto puro (vindo direto do banco, sem hash) +
 * event_name, normaliza e hasheia, e relay pro Graph API do Meta com
 * `action_source: other` (ver `src/lib/meta-offline.ts`).
 *
 * Chamado de 3 lugares no app (client components, via fetch):
 *   1. agendamentos/novo/_form.tsx     → event_name: "Agendou"
 *   2. dashboard/conversas/nova/_form.tsx → event_name: "ConversaQualificada"
 *   3. agendamentos/[id]/fechar/_form.tsx → event_name: "Fechou"
 */

import { NextRequest, NextResponse } from 'next/server'
import { enviarConversaoOffline, META_OFFLINE_EVENTOS, type MetaOfflineEventName } from '@/lib/meta-offline'

export async function POST(req: NextRequest) {
  let body: {
    event_name?: string
    telefone?: string
    origem?: string
    value?: number
    currency?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.event_name || !META_OFFLINE_EVENTOS.includes(body.event_name as MetaOfflineEventName)) {
    return NextResponse.json({ error: `event_name inválido — esperado um de: ${META_OFFLINE_EVENTOS.join(', ')}` }, { status: 400 })
  }

  if (!body.telefone) {
    return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })
  }

  const result = await enviarConversaoOffline({
    eventName: body.event_name as MetaOfflineEventName,
    telefone: body.telefone,
    origem: body.origem,
    value: body.value,
    currency: body.currency,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

// GET → apenas health check
export async function GET() {
  return NextResponse.json({
    ok: true,
    pixel: process.env.META_PIXEL_ID ? `...${process.env.META_PIXEL_ID.slice(-4)}` : 'NOT_SET',
    token: process.env.META_CAPI_TOKEN ? 'SET' : 'NOT_SET',
  })
}
