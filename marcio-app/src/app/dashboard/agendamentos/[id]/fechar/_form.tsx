'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  agendamentoId: number
  isAplicacao: boolean
  closerId: string
}

const PAGAMENTOS = ['PIX', 'Cartão de débito', 'Cartão de crédito', 'Dinheiro']

export function FecharAgendamentoForm({ agendamentoId, isAplicacao, closerId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [form, setForm] = useState({
    resultado: 'REALIZADO' as 'REALIZADO' | 'NAO_COMPARECEU',
    valorProtese: '',
    valorServico: '',
    pagamento: 'PIX',
  })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.resultado === 'REALIZADO' && !form.valorServico) {
      setError('Informe o valor do serviço')
      return
    }

    startTransition(async () => {
      const update: Record<string, unknown> = {
        status: form.resultado,
        fechado_at: new Date().toISOString(),
        fechado_by: closerId,
      }

      if (form.resultado === 'REALIZADO') {
        update.valor_servico = parseFloat(form.valorServico.replace(',', '.'))
        update.pagamento_forma = form.pagamento
        if (isAplicacao && form.valorProtese) {
          update.valor_protese = parseFloat(form.valorProtese.replace(',', '.'))
        }
      }

      const { error: err } = await (supabase as any)
        .from('agendamentos')
        .update(update)
        .eq('id', agendamentoId)

      if (err) {
        setError(`Erro: ${err.message}`)
        return
      }

      router.push(`/dashboard/agendamentos/${agendamentoId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Resultado */}
      <div className="space-y-1.5">
        <label className="block text-sm text-offwhite/70">
          Resultado <span className="text-gold">*</span>
        </label>
        <div className="flex gap-2">
          {(['REALIZADO', 'NAO_COMPARECEU'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setForm((f) => ({ ...f, resultado: opt }))}
              className={`flex-1 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                form.resultado === opt
                  ? opt === 'REALIZADO'
                    ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
                    : 'bg-orange-900/30 border-orange-700/50 text-orange-300'
                  : 'border-gold/20 text-offwhite/50 hover:border-gold/30'
              }`}
            >
              {opt === 'REALIZADO' ? '✓ Realizado' : '✗ Não compareceu'}
            </button>
          ))}
        </div>
      </div>

      {form.resultado === 'REALIZADO' && (
        <>
          {/* Valor da prótese (só aplicação) */}
          {isAplicacao && (
            <div className="space-y-1.5">
              <label className="block text-sm text-offwhite/70">
                Valor da prótese (material)
                <span className="text-offwhite/40 text-xs ml-1">
                  — vai 100% pro salão, não entra no rateio
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-offwhite/40">
                  R$
                </span>
                <Input
                  value={form.valorProtese}
                  onChange={(e) => setForm((f) => ({ ...f, valorProtese: e.target.value }))}
                  className="pl-9"
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
          )}

          {/* Valor do serviço */}
          <div className="space-y-1.5">
            <label className="block text-sm text-offwhite/70">
              Valor do serviço <span className="text-gold">*</span>
              <span className="text-offwhite/40 text-xs ml-1">
                — base do rateio de comissões
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-offwhite/40">
                R$
              </span>
              <Input
                value={form.valorServico}
                onChange={(e) => setForm((f) => ({ ...f, valorServico: e.target.value }))}
                className="pl-9"
                placeholder="0,00"
                inputMode="decimal"
                required
              />
            </div>
            {form.valorServico && (
              <p className="text-xs text-gold/70">
                Comissões serão calculadas sobre{' '}
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(parseFloat(form.valorServico.replace(',', '.')) || 0)}
              </p>
            )}
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <label className="block text-sm text-offwhite/70">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {PAGAMENTOS.map((pag) => (
                <button
                  key={pag}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, pagamento: pag }))}
                  className={`py-2 rounded-md border text-sm transition-colors ${
                    form.pagamento === pag
                      ? 'bg-gold/15 border-gold/50 text-gold'
                      : 'border-gold/20 text-offwhite/50 hover:border-gold/30'
                  }`}
                >
                  {pag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Confirmar fechamento'}
      </Button>

      <p className="text-xs text-center text-offwhite/30">
        {form.resultado === 'REALIZADO'
          ? 'As comissões serão calculadas automaticamente ao salvar.'
          : 'O agendamento será marcado como não compareceu. Nenhuma comissão é gerada.'}
      </p>
    </form>
  )
}