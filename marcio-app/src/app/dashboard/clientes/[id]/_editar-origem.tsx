'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BadgeOrigem } from '@/components/ui/badge'
import { ORIGEM_LABELS, type OrigemLead } from '@/lib/types/database'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  clienteId: number
  origemAtual: OrigemLead | null
}

const ORIGENS = Object.entries(ORIGEM_LABELS) as [OrigemLead, string][]

export function EditarOrigemCliente({ clienteId, origemAtual }: Props) {
  const [editando, setEditando] = useState(false)
  const [origem, setOrigem] = useState<OrigemLead | ''>(origemAtual ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function salvar() {
    startTransition(async () => {
      await (supabase as any)
        .from('clientes')
        .update({ origem_primeira_compra: origem === '' ? null : origem })
        .eq('id', clienteId)

      setEditando(false)
      router.refresh()
    })
  }

  function cancelar() {
    setOrigem(origemAtual ?? '')
    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        {origemAtual ? (
          <BadgeOrigem origem={origemAtual} />
        ) : (
          <span className="text-xs text-offwhite/30">Sem tag de tráfego</span>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-offwhite/30 hover:text-gold transition-colors"
          title="Corrigir origem (1ª compra)"
        >
          <Pencil size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1.5 mt-1.5 w-full max-w-[240px]">
      <select
        value={origem}
        onChange={(e) => setOrigem(e.target.value as OrigemLead | '')}
        className="flex h-8 w-full rounded-md border border-gold/20 bg-brand-800 px-2 py-1 text-xs text-offwhite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60"
      >
        <option value="">— Sem tag de tráfego —</option>
        {ORIGENS.map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={salvar}
          disabled={isPending}
          className="flex items-center gap-1 rounded-md bg-gold/15 hover:bg-gold/25 text-gold text-[11px] px-2 py-1 transition-colors disabled:opacity-50"
        >
          <Check size={12} /> {isPending ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={isPending}
          className="flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 text-offwhite/50 text-[11px] px-2 py-1 transition-colors"
        >
          <X size={12} /> Cancelar
        </button>
      </div>
      <p className="text-[10px] text-offwhite/30 leading-snug">
        Esta tag identifica o cliente como vindo de tráfego pago para sempre — vale para
        a 1ª aplicação e todas as próximas, mesmo que ele volte direto pelo WhatsApp.
      </p>
    </div>
  )
}
