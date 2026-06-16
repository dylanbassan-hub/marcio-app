'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ORIGEM_LABELS, type OrigemLead } from '@/lib/types/database'

interface Props {
  createdBy: string
}

type IdRow = { id: number }

const ORIGENS = Object.entries(ORIGEM_LABELS) as [OrigemLead, string][]

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-offwhite/70">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
    </div>
  )
}

function StyledSelect({
  value,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
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

const FORM_INICIAL = {
  telefone: '',
  nome: '',
  origem: '' as OrigemLead | '',
  origemDetalhe: '',
  observacoes: '',
}

export function NovaConversaQualificadaForm({ createdBy }: Props) {
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [form, setForm] = useState(FORM_INICIAL)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSucesso(null)

    if (!form.telefone.trim()) {
      setError('Informe o telefone (WhatsApp) da pessoa')
      return
    }

    if (!form.origem) {
      setError('Selecione a origem')
      return
    }

    startTransition(async () => {
      const { data: novaData, error: errInsert } = await (supabase as any)
        .from('conversas_qualificadas')
        .insert({
          telefone: form.telefone,
          nome: form.nome || null,
          origem: form.origem as OrigemLead,
          origem_detalhe: form.origemDetalhe || null,
          observacoes: form.observacoes || null,
          created_by: createdBy,
        })
        .select('id')
        .single()

      const nova = novaData as IdRow | null

      if (errInsert || !nova) {
        setError(`Erro ao registrar: ${errInsert?.message}`)
        return
      }

      // Fase 1 — Conversões Offline: avisa o Meta dessa conversa qualificada.
      // Aguarda a resposta (rápido) só pra deixar o registro com o status
      // certo de envio — não impede o registro de já ter sido salvo.
      try {
        const res = await fetch('/api/meta-offline-conversions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_name: 'ConversaQualificada',
            telefone: form.telefone,
            origem: form.origem,
          }),
        })

        await (supabase as any)
          .from('conversas_qualificadas')
          .update({
            meta_enviado: res.ok,
            meta_enviado_at: new Date().toISOString(),
          })
          .eq('id', nova.id)
      } catch {
        // Best-effort — o registro já está salvo, só não marcamos meta_enviado
      }

      setSucesso(`Registrado ✓ ${form.nome ? form.nome + ' — ' : ''}${form.telefone}`)
      setForm(FORM_INICIAL)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="WhatsApp" required>
        <Input
          value={form.telefone}
          onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
          placeholder="(11) 99999-9999"
          type="tel"
          inputMode="tel"
          autoFocus
        />
      </Field>

      <Field label="Nome">
        <Input
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Opcional — ajuda você a reconhecer depois"
        />
      </Field>

      <Field label="Origem" required>
        <StyledSelect
          value={form.origem}
          onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value as OrigemLead }))}
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

      <Field label="Observações">
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          rows={2}
          placeholder="Opcional"
          className="flex w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-2 text-base md:text-sm text-offwhite placeholder:text-offwhite/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 resize-none"
        />
      </Field>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {sucesso && (
        <p className="text-emerald-300 text-sm bg-emerald-900/20 border border-emerald-800/40 rounded-md px-3 py-2">
          {sucesso}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? 'Salvando…' : '🔥 Marcar qualificada'}
      </Button>

      <p className="text-xs text-center text-offwhite/30">
        Depois de salvar, o formulário limpa pra você marcar a próxima.
      </p>
    </form>
  )
}
