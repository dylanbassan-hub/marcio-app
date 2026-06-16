/**
 * Meta Offline Conversions — Fase 1 (Conversões Offline)
 *
 * Envia pro Meta eventos que aconteceram fora do navegador (telefone, sem
 * clique/cookie) casando por telefone hasheado. Reaproveita o mesmo Pixel +
 * token já usados em `src/app/api/meta-capi/route.ts`, mas com
 * `action_source: 'other'` — esse é o tipo certo pra evento que nasce de uma
 * conversa de WhatsApp, não de navegação no site.
 *
 * Três eventos usam essa função (ver 07_Conversoes_Offline_Jun16/00_PLANO_FASE1.md):
 *   - "Agendou"             → disparado ao criar um agendamento
 *   - "ConversaQualificada" → disparado quando a Aline marca uma conversa como qualificada
 *   - "Fechou"              → disparado quando o agendamento vira REALIZADO
 *
 * Variáveis de ambiente (já configuradas em .env.local, mesmas do meta-capi):
 *   META_PIXEL_ID, META_CAPI_TOKEN, META_TEST_EVENT_CODE
 */

import crypto from 'crypto'

const PIXEL_ID   = process.env.META_PIXEL_ID
const CAPI_TOKEN = process.env.META_CAPI_TOKEN
const CAPI_URL   = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/**
 * Normaliza telefone brasileiro pro formato que o Meta espera antes do hash:
 * só dígitos, com código do país (55) na frente.
 *
 * Aceita os formatos que já existem no banco hoje, ex: "(11) 99774-1721",
 * "11997741721", "5511997741721".
 */
export function normalizarTelefoneBR(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (!digitos) return null

  // Já vem com código do país
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos

  // DDD + número (10 ou 11 dígitos) → adiciona 55
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`

  // Formato inesperado — manda como está (melhor tentar do que descartar)
  return digitos
}

export type MetaOfflineEventName = 'Agendou' | 'ConversaQualificada' | 'Fechou'

export const META_OFFLINE_EVENTOS: MetaOfflineEventName[] = [
  'Agendou',
  'ConversaQualificada',
  'Fechou',
]

interface EnviarConversaoOfflineParams {
  eventName: MetaOfflineEventName
  telefone: string
  origem?: string | null
  value?: number
  currency?: string
  eventTime?: number
}

interface EnviarConversaoOfflineResult {
  ok: boolean
  error?: string
}

export async function enviarConversaoOffline({
  eventName,
  telefone,
  origem,
  value,
  currency = 'BRL',
  eventTime,
}: EnviarConversaoOfflineParams): Promise<EnviarConversaoOfflineResult> {
  if (!PIXEL_ID || !CAPI_TOKEN) {
    console.warn('[OfflineConversions] META_PIXEL_ID ou META_CAPI_TOKEN não configurados — evento ignorado')
    return { ok: false, error: 'not_configured' }
  }

  const telefoneNormalizado = normalizarTelefoneBR(telefone)
  if (!telefoneNormalizado) {
    return { ok: false, error: 'telefone_invalido' }
  }

  const event = {
    event_name: eventName,
    event_time: eventTime ?? Math.floor(Date.now() / 1000),
    action_source: 'other',
    user_data: {
      ph: sha256(telefoneNormalizado),
      // Cidade padrão São Paulo — mesma convenção do meta-capi, ajuda no matching
      ct: sha256('sao paulo'),
      st: sha256('sp'),
      country: sha256('br'),
    },
    custom_data: {
      ...(origem && { origem }),
      ...(value !== undefined && { value, currency }),
    },
  }

  try {
    const res = await fetch(CAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        test_event_code: process.env.META_TEST_EVENT_CODE,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[OfflineConversions] Erro Meta:', result)
      return { ok: false, error: JSON.stringify(result) }
    }

    return { ok: true }
  } catch (err) {
    console.error('[OfflineConversions] Fetch error:', err)
    return { ok: false, error: 'upstream_error' }
  }
}
