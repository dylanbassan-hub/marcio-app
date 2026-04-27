import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { OrigemLead, StatusAgendamento } from '@/lib/types/database'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:   'border-gold/30 bg-gold/10 text-gold',
        secondary: 'border-brand-600 bg-brand-700 text-offwhite/70',
        outline:   'border-brand-600 text-offwhite/60',
        success:   'border-emerald-800/40 bg-emerald-900/30 text-emerald-300',
        warning:   'border-yellow-800/40 bg-yellow-900/30 text-yellow-300',
        danger:    'border-red-800/40 bg-red-900/30 text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Badge de origem (META_ADS, GOOGLE_ADS, etc.)
const ORIGEM_STYLE: Record<OrigemLead, string> = {
  META_ADS:           'border-blue-800/40 bg-blue-900/30 text-blue-300',
  GOOGLE_ADS:         'border-emerald-800/40 bg-emerald-900/30 text-emerald-300',
  INSTAGRAM_ORGANICO: 'border-pink-800/40 bg-pink-900/30 text-pink-300',
  YOUTUBE:            'border-red-800/40 bg-red-900/30 text-red-300',
  INDICACAO:          'border-purple-800/40 bg-purple-900/30 text-purple-300',
  RECORRENTE:         'border-yellow-800/40 bg-yellow-900/30 text-yellow-300',
  OUTRO:              'border-brand-600 bg-brand-700 text-offwhite/60',
}

const ORIGEM_LABEL: Record<OrigemLead, string> = {
  META_ADS:           'Meta Ads',
  GOOGLE_ADS:         'Google Ads',
  INSTAGRAM_ORGANICO: 'IG Orgânico',
  YOUTUBE:            'YouTube',
  INDICACAO:          'Indicação',
  RECORRENTE:         'Recorrente',
  OUTRO:              'Outro',
}

export function BadgeOrigem({ origem }: { origem: OrigemLead }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
      ORIGEM_STYLE[origem]
    )}>
      {ORIGEM_LABEL[origem]}
    </span>
  )
}

// Badge de status do agendamento
const STATUS_STYLE: Record<StatusAgendamento, string> = {
  AGENDADO:       'border-blue-800/40 bg-blue-900/20 text-blue-300',
  CONFIRMADO:     'border-cyan-800/40 bg-cyan-900/20 text-cyan-300',
  REALIZADO:      'border-emerald-800/40 bg-emerald-900/20 text-emerald-300',
  NAO_COMPARECEU: 'border-orange-800/40 bg-orange-900/20 text-orange-300',
  CANCELADO:      'border-red-800/40 bg-red-900/20 text-red-300',
}

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO:       'Agendado',
  CONFIRMADO:     'Confirmado',
  REALIZADO:      'Realizado',
  NAO_COMPARECEU: 'Não veio',
  CANCELADO:      'Cancelado',
}

export function BadgeStatus({ status }: { status: StatusAgendamento }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
      STATUS_STYLE[status]
    )}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export { Badge, badgeVariants }
