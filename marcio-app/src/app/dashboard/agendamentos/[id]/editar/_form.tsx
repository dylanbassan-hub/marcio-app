'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ORIGEM_LABELS,
  STATUS_LABELS,
  type OrigemLead,
  type StatusAgendamento,
} from '@/lib/types/database'
import { addMinutes, format } from 'date-fns'

type ExecutorForm = { id: string; nome: string; role: string }
type ServicoForm = { id: number; nome: string; codigo: string; duracao_min: number }

type AgendamentoEdit = {
  id: number
  cliente_id: number
  servico_id: number
  executor_id: string
  inicio: string
  status: string
  origem: string | null
  origem_detalhe: string | null
  observacoes: string | null
  cliente: { id: number; nome: string; telefone: string | null; instagram: string | null } | null
}

interface Props {
  agendamento: AgendamentoEdit
  executores: ExecutorForm[]
  servicos: ServicoForm[]
}

const ORIGENS = Object.entries(ORIGEM_LABELS) as [OrigemLead, string][]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-offwhite/70">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
    </div>
  )
}

function StyledSelect({ value, onChange, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="flex h-9 w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-1 text-base md:text-sm text-offwhite focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 disabled:opacity-50"
      {...props}
    >
      {children}
    </select>
  )
}

export function EditarAgendamentoForm({ agendamento, executores, servicos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // inicio é um instante UTC; format() usa o fuso local (SP no navegador da Aline),
  // mesma convenção do formulário de novo agendamento.
  const inicioDate = new Date(agendamento.inicio)

  const [form, setForm] = useState({
    clienteNome: agendamento.cliente?.nome ?? '',
    clienteTelefone: agendamento.cliente?.telefone ?? '',
    clienteInstagram: agendamento.cliente?.instagram ?? '',
    servicoId: String(agendamento.servico_id),
    executorId: agendamento.executor_id,
    data: format(inicioDate, 'yyyy-MM-dd'),
    hora: format(inicioDate, 'HH:mm'),
    status: (agendamento.status as StatusAgendamento) ?? 'AGENDADO',
    origem: (agendamento.origem ?? '') as OrigemLead | '',
    origemDetalhe: agendamento.origem_detalhe ?? '',
    observacoes: agendamento.observacoes ?? '',
  })

  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  // REALIZADO só fica disponível se já for o status atual — para marcar como
  // realizado e registrar valores/comissões, usa-se "Fechar agendamento".
  const statusOptions = (Object.keys(STATUS_LABELS) as StatusAgendamento[]).filter(
    (s) => s !== 'REALIZADO' || agendamento.status === 'REALIZADO'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSucesso(false)

    if (!form.clienteNome.trim()) {
      setError('O nome do cliente é obrigatório')
      return
    }
    if (!form.origem) {
      setError('Selecione a origem')
      return
    }

    startTransition(async () => {
      // 1) Atualiza os dados do cliente vinculado
      const { error: errCliente } = await (supabase as any)
        .from('clientes')
        .update({
          nome: form.clienteNome.trim(),
          telefone: form.clienteTelefone.trim() || null,
          instagram: form.clienteInstagram.trim() || null,
        })
        .eq('id', agendamento.cliente_id)

      if (errCliente) {
        setError(`Erro ao salvar dados do cliente: ${errCliente.message}`)
        return
      }

      // 2) Atualiza o agendamento (recalcula o fim pela duração do serviço)
      const inicio = new Date(`${form.data}T${form.hora}:00`)
      const dur = servicos.find((s) => s.id === parseInt(form.servicoId))?.duracao_min ?? 60
      const fim = addMinutes(inicio, dur)

      const { error: errAg } = await (supabase as any)
        .from('agendamentos')
        .update({
          servico_id: parseInt(form.servicoId),
          executor_id: form.executorId,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          status: form.status,
          origem: form.origem as OrigemLead,
          origem_detalhe: form.origemDetalhe.trim() || null,
          observacoes: form.observacoes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agendamento.id)

      if (errAg) {
        setError(`Erro ao salvar agendamento: ${errAg.message}`)
        return
      }

      setSucesso(true)
      router.push(`/dashboard/agendamentos/${agendamento.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cliente */}
      <div className="border border-gold/15 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-offwhite/50 font-medium uppercase tracking-wide">Cliente</p>
          <Link
            href={`/dashboard/clientes/${agendamento.cliente_id}`}
            className="text-xs text-gold/70 hover:text-gold underline"
          >
            ficha completa →
          </Link>
        </div>

        <Field label="Nome completo" required>
          <Input
            value={form.clienteNome}
            onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))}
            placeholder="Ex: Carlos Silva"
            required
          />
        </Field>

        <Field label="WhatsApp">
          <Input
            value={form.clienteTelefone}
            onChange={(e) => setForm((f) => ({ ...f, clienteTelefone: e.target.value }))}
            placeholder="(11) 99999-9999"
            type="tel"
            inputMode="tel"
          />
        </Field>

        <Field label="Instagram">
          <Input
            value={form.clienteInstagram}
            onChange={(e) => setForm((f) => ({ ...f, clienteInstagram: e.target.value }))}
            placeholder="@usuario"
          />
        </Field>
      </div>

      {/* Serviço */}
      <Field label="Serviço" required>
        <div className="flex gap-2">
          {servicos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, servicoId: s.id.toString() }))}
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

      {/* Executor */}
      <Field label="Executor" required>
        <StyledSelect
          value={form.executorId}
          onChange={(e) => setForm((f) => ({ ...f, executorId: e.target.value }))}
          required
        >
          {executores.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </StyledSelect>
      </Field>

      {/* Data + Hora */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" required>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
            required
          />
        </Field>
        <Field label="Hora" required>
          <Input
            type="time"
            value={form.hora}
            onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
            step="900"
            required
          />
        </Field>
      </div>

      {/* Status */}
      <Field label="Status">
        <StyledSelect
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusAgendamento }))}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </StyledSelect>
        {agendamento.status !== 'REALIZADO' && (
          <p className="text-xs text-offwhite/35 mt-1">
            Para marcar como Realizado e registrar valores/comissões, use “Fechar agendamento”.
          </p>
        )}
      </Field>

      {/* Origem */}
      <Field label="Origem do lead" required>
        <StyledSelect
          value={form.origem}
          onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value as OrigemLead }))}
          required
        >
          <option value="">Selecionar origem…</option>
          {ORIGENS.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </StyledSelect>
        {form.origem === 'OUTRO' && (
          <Input
            placeholder="Descrever origem…"
            value={form.origemDetalhe}
            onChange={(e) => setForm((f) => ({ ...f, origemDetalhe: e.target.value }))}
            className="mt-2"
          />
        )}
      </Field>

      {/* Observações */}
      <Field label="Observações">
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          rows={2}
          placeholder="Ex: Cliente prefere horário pela manhã…"
          className="flex w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-2 text-base md:text-sm text-offwhite placeholder:text-offwhite/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 resize-none"
        />
      </Field>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href={`/dashboard/agendamentos/${agendamento.id}`}>Cancelar</Link>
        </Button>
        <Button type="submit" className="flex-1" size="lg" disabled={isPending || sucesso}>
          {isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
