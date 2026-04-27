import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata valor em reais: 1500 → "R$ 1.500,00" */
export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Formata porcentagem: 20 → "20,00%" */
export function formatPct(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value.toFixed(2).replace('.', ',')}%`
}

/** Link WhatsApp direto: "11999999999" → "https://wa.me/5511999999999" */
export function whatsappLink(telefone: string, mensagem?: string): string {
  const numero = telefone.replace(/\D/g, '')
  const base = `https://wa.me/55${numero}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}

/** Retorna iniciais do nome para Avatar: "Márcio Gonzalez" → "MG" */
export function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
