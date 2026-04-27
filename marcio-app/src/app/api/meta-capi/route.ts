/**
 * Meta Conversions API (CAPI) — server-side event relay
 *
 * Recebe eventos do frontend (ou do próprio servidor) e os envia para a
 * Conversions API do Meta, complementando o Pixel client-side.
 *
 * Variáveis de ambiente necessárias em .env.local:
 *   META_PIXEL_ID=<seu pixel id>
 *   META_CAPI_TOKEN=<token de acesso gerado em Events Manager → Settings → Conversions API>
 *
 * Uso no frontend (landing page ou app):
 *   fetch('/api/meta-capi', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       event_name: 'Lead',           // PageView | Lead | Purchase | Schedule
 *       event_source_url: window.location.href,
 *       client_ip_address: '',        // deixar vazio — preenchido aqui no servidor
 *       user_data: {
 *         em: 'hash_sha256_do_email', // opcional, já hasheado no cliente
 *         ph: 'hash_sha256_do_tel',   // opcional
 *         fn: 'hash_sha256_do_nome',  // opcional
 *       },
 *       custom_data: {
 *         content_name: 'hero_cta',   // qual botão acionou
 *         currency: 'BRL',
 *         value: 0,
 *       },
 *     })
 *   })
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const PIXEL_ID  = process.env.META_PIXEL_ID
const CAPI_TOKEN = process.env.META_CAPI_TOKEN
const CAPI_URL  = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!PIXEL_ID || !CAPI_TOKEN) {
    // Em dev sem variáveis configuradas, apenas loga e retorna ok
    console.warn('[CAPI] META_PIXEL_ID ou META_CAPI_TOKEN não configurados — evento ignorado')
    return NextResponse.json({ status: 'skipped' })
  }

  let body: {
    event_name: string
    event_source_url?: string
    user_data?: {
      em?: string   // já deve chegar hasheado (sha256) do cliente
      ph?: string
      fn?: string
      ln?: string
      ge?: string
      ct?: string
      st?: string
      zp?: string
      country?: string
      client_user_agent?: string
      fbc?: string  // _fbc cookie value
      fbp?: string  // _fbp cookie value
    }
    custom_data?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // IP do cliente: preferir header de proxy, fallback para IP da requisição
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  const userAgent = req.headers.get('user-agent') ?? ''

  // Cookies do Meta (_fbp e _fbc) — enviados junto com a requisição
  const fbp = req.cookies.get('_fbp')?.value
  const fbc = req.cookies.get('_fbc')?.value

  const userData: Record<string, string | undefined> = {
    client_ip_address: clientIp,
    client_user_agent: userAgent,
    ...(fbp && { fbp }),
    ...(fbc && { fbc }),
    ...(body.user_data?.em && { em: body.user_data.em }),
    ...(body.user_data?.ph && { ph: body.user_data.ph }),
    ...(body.user_data?.fn && { fn: body.user_data.fn }),
    ...(body.user_data?.ln && { ln: body.user_data.ln }),
    // Cidade padrão São Paulo para matching de localização
    ct: sha256('sao paulo'),
    st: sha256('sp'),
    country: sha256('br'),
  }

  const event = {
    event_name: body.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: body.event_source_url ?? '',
    action_source: 'website',
    user_data: userData,
    ...(body.custom_data && { custom_data: body.custom_data }),
  }

  try {
    const res = await fetch(CAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        test_event_code: process.env.META_TEST_EVENT_CODE, // opcional — remove em produção
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[CAPI] Erro Meta:', result)
      return NextResponse.json({ error: result }, { status: 502 })
    }

    return NextResponse.json({ ok: true, events_received: result.events_received })
  } catch (err) {
    console.error('[CAPI] Fetch error:', err)
    return NextResponse.json({ error: 'upstream error' }, { status: 502 })
  }
}

// GET → apenas health check
export async function GET() {
  return NextResponse.json({
    ok: true,
    pixel: PIXEL_ID ? `...${PIXEL_ID.slice(-4)}` : 'NOT_SET',
    token: CAPI_TOKEN ? 'SET' : 'NOT_SET',
  })
}
