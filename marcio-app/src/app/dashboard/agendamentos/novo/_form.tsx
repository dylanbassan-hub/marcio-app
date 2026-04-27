'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ORIGEM_LABELS, type OrigemLead, type CodigoServico } from '@/lib/types/database'
import { addMinutes, format } from 'date-fns'

interface Props {
  executores: { id: string; nome: string; role: string }[]
  servicos: { id: number; nome: string; codigo: string; duracao_min: number }[]
  recepcionistaId: string
}

const ORIGENS = Object.entries(ORIGEM_LABELS) as [OrigemLead, string][]

const PAGAMENTOS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO', label: 'Cartão de débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
]

export function NovoAgendamentoForm({ executores, servicos, recepcionistaId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [form, setForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    clienteInstagram: '',
    servicoId: servicos[0]?.id.toString() ?? '',
    executorId: executores[0]?.id ?? '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00',
    origem: '' as OrigemLead | '',
    origemDetalhe: '',
    observacoes: '',
  })

  const [error, setError] = useState<string | null>(null)

  const servicoSelecionado = servicos.find(s => s.id === parseInt(form.servicoId))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.origem) { setError('Selecione a origem do lead'); return }

    startTransition(async () => {
      // 1. Criar ou buscar cliente
      let clienteId: number

      // Busca por telefone (se preenchido)
      if (form.clienteTelefone) {
        const { data: existing } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', form.clienteTelefone)
          .single()

        if (existing) {
          clienteId = existing.id
        } else {
          const { data: novo, error: errCliente } = await supabase
            .from('clientes')
            .insert({
              nome: form.clienteNome,
              telefone: form.clienteTelefone || null,
              instagram: form.clienteInstagram || null,
              origem_primeira_compra: form.origem as OrigemLead,
              created_by: recepcionistaId,
            })
            .select('id')
            .single()

          if (errCliente || !novo) { setError('Erro ao criar cliente'); return }
          clienteId = novo.id
        }
      } else {
        const { data: novo, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nome: form.clienteNome,
            telefone: null,
            instagram: form.clienteInstagram || null,
            origem_primeira_compra: form.origem as OrigemLead,
            created_by: recepcionistaId,
          })
          .select('id')
          .single()

        if (errCliente || !novo) { setError('Erro ao criar cliente'); return }
        clienteId = novo.id
      }

      // 2. Calcular horário de início e fim
      const inicio = new Date(`${form.data}T${form.hora}:00`)
      const fim = addMinutes(inicio, servicoSelecionado?.duracao_min ?? 60)

      // 3. Criar agendamento
      const { data: ag, error: errAg } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id: clienteId,
          servico_id: parseInt(form.servicoId),
          executor_id: form.executorId,
          recepcionista_id: recepcionistaId,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          origem: form.origem as OrigemLead,
          origem_detalhe: form.origemDetalhe || null,
          observacoes: form.observacoes || null,
          status: 'AGENDADO',
        })
        .select('id')
        .single()

      if (errAg || !ag) { setError(`Erro ao agendar: ${errAg?.message}`); return }

      router.push(`/dashboard/agendamentos/${ag.id}`)
      router.refresh()
    })
  }

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="block text-sm text-offwhite/70">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
    </div>
  )

  const Select = ({ value, onChange, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      value={value}
      onChange={onChange}
      className="flex h-9 w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-1 text-sm text-offwhite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 disabled:opacity-50"
      {...props}
    >
      {children}
    </select>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Serviço */}
      <Field label="Serviço" required>
        <div className="flex gap-2">
          {servicos.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setForm(f => ({ ...f, servicoId: s.id.toString() }))}
              className={`flex-1 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                form.servicoId === s.id.toString()
                  ? 'bg-gold/15 border-gold/50 text-gold'
                  : 'border-gold/20 text-offwhite/60 hover:border-gold/30 hover:text-offwhite'
              }`}
            >
              {s.nome.replace(' de Prótese', '')}
              <span className="block text-xs font-normal opacity-60 mt-0.5">{s.duracao_min}min</span>
            </button>
          ))}
        </div>
      </Field>

      {/* Origem — OBRIGATÓRIA e em destaque */}
      <Field label="Origem do lead" required>
        <Select
          value={form.origem}
          onChange={e => setForm(f => ({ ...f, origem: e.target.value as OrigemLead }))}
          required
        >
          <option value="">Selecionar origem…</option>
          {ORIGENS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
        {form.origem === 'OUTRO' && (
          <Input
            placeholder="Descrever origem…"
            value={form.origemDetalhe}
            onChange={e => setForm(f => ({ ...f, origemDetalhe: e.target.value }))}
            className="mt-2"
          />
        )}
        {(form.origem === 'META_ADS' || form.origem === 'GOOGLE_ADS') && (
          <p className="text-xs text-gold/70 mt-1">
            ✓ Comissão de tráfego será gerada automaticamente ao fechar.
          </p>
        )}
      </Field>

      {/* Cliente */}
      <div className="border border-gold/15 rounded-xl p-4 space-y-4">
        <p className="text-xs text-offwhite/50 font-medium uppercase tracking-wide">Cliente</p>
        <Field label="Nome completo" required>
          <Input
            value={form.clienteNome}
            onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))}
            placeholder="Ex: Carlos Silva"
            required
          />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={form.clienteTelefone}
            onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))}
            placeholder="(11) 99999-9999"
            type="tel"
            inputMode="tel"
          />
        </Field>
        <Field label="Instagram">
          <Input
            value={form.clienteInstagram}
            onChange={e => setForm(f => ({ ...f, clienteInstagram: e.target.value }))}
            placeholder="@usuario"
          />
        </Field>
      </div>

      {/* Executor */}
      <Field label="Executor" required>
        <Select
          value={form.executorId}
          onChange={e => setForm(f => ({ ...f, executorId: e.target.value }))}
          required
        >
          {executores.map(e => (
            <option key={e.id} value={e.id}>
              {e.nome} {e.role === 'admin' ? '(Márcio)' : ''}
            </option>
          ))}
        </Select>
      </Field>

      {/* Data e hora */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" required>
          <Input
            type="date"
            value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            required
          />
        </Field>
        <Field label="Hora" required>
          <Input
            type="time"
            value={form.hora}
            onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
            step="900"
            required
          />
        </Field>
      </div>

      {/* Observações */}
      <Field label="Observações">
        <textarea
          value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          rows={2}
          placeholder="Ex: Cliente prefere horário pela manhã, tem alergia a X…"
          className="flex w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-2 text-sm text-offwhite placeholder:text-offwhite/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 resize-none"
        />
      </Field>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Confirmar agendamento'}
      </Button>

    </form>
  )
}
