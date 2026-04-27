'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { StatusAgendamento } from '@/lib/types/database'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  agendamentoId: number
  novoStatus: StatusAgendamento
  variant?: 'default' | 'danger'
}

const LABELS: Partial<Record<StatusAgendamento, string>> = {
  CONFIRMADO: 'Confirmar presença',
  CANCELADO:  'Cancelar agendamento',
  NAO_COMPARECEU: 'Marcar não compareceu',
}

export function AtualizarStatusBtn({ agendamentoId, novoStatus, variant = 'default' }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function handleClick() {
    startTransition(async () => {
      await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', agendamentoId)
      router.refresh()
    })
  }

  return (
    <Button
      variant={variant === 'danger' ? 'danger' : 'outline'}
      className="w-full"
      onClick={handleClick}
      disabled={isPending}
    >
      {novoStatus === 'CANCELADO' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
      {isPending ? 'Atualizando…' : LABELS[novoStatus]}
    </Button>
  )
}
