/**
 * Utilitários de data/hora com timezone fixo em America/Sao_Paulo.
 *
 * Problema: o Vercel roda em UTC. Se usarmos date-fns format() direto no servidor,
 * ele exibe a hora UTC em vez da hora local do Brasil (UTC-3), causando +3h no display.
 *
 * Solução: usar Intl.DateTimeFormat com timeZone: 'America/Sao_Paulo' — funciona
 * tanto no servidor (Node.js) quanto no browser, sempre no fuso correto.
 */

const TZ = 'America/Sao_Paulo'

/** "12:00" */
export function formatHora(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(date))
}

/** "qui, 7 de mai · 12:00" */
export function formatDataHora(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(date))
}

/** "07/05/26 12:00" */
export function formatDataHoraCurta(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(date))
}

/** "07/05 12:00" */
export function formatDiaHora(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(date))
}
