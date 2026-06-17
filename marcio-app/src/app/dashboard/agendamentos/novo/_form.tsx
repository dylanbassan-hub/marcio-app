'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ORIGEM_LABELS, type OrigemLead } from '@/lib/types/database'
import { addMinutes, format } from 'date-fns'

interface Props {
  executores: { id: string; nome: string; role: string }[]
  servicos: { id: number; nome: string; codigo: string; duracao_min: number }[]
  recepcionistaId: string
  defaultData?: string
  defaultHora?: string
  defaultExecutorId?: string
}

type IdRow = {
  id: number
}

type ClienteSugestao = {
  id: number
  nome: string
  telefone: string | null
  instagram: string | null
}

const ORIGENS = Object.entries(ORIGEM_LABELS) as [OrigemLead, string][]

// ─── Componentes auxiliares ──────────────────────────────────────────────────

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

// ─── Componente de busca de cliente existente ─────────────────────────────────

function BuscaClienteExistente({
  onSelect,
}: {
  onSelect: (c: ClienteSugestao) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [sugestoes, setSugestoes] = useState<ClienteSugestao[]>([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSugestoes([])
      return
    }

    const timer = setTimeout(async () => {
      setCarregando(true)
      const { data } = await (supabase as any)
        .from('clientes')
        .select('id, nome, telefone, instagram')
        .or(`nome.ilike.%${query.trim()}%,telefone.ilike.%${query.trim()}%`)
        .order('nome', { ascending: true })
        .limit(8)

      setSugestoes((data as ClienteSugestao[]) ?? [])
      setAberto(true)
      setCarregando(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        placeholder="Buscar por nome ou WhatsApp…"
        autoComplete="off"
      />
      {carregando && (
        <span className="absolute right-3 top-2 text-xs text-offwhite/40">buscando…</span>
      )}
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-gold/20 bg-brand-900 shadow-xl max-h-52 overflow-y-auto">
          {sugestoes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(c)
                  setQuery('')
                  setAberto(false)
                  setSugestoes([])
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-gold/10 transition-colors"
              >
                <span className="block text-sm text-offwhite font-medium">{c.nome}</span>
                <span className="block text-xs text-offwhite/50">
                  {c.telefone ?? 'sem telefone'}
                  {c.instagram ? ` · ${c.instagram}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && sugestoes.length === 0 && query.length >= 2 && !carregando && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gold/20 bg-brand-900 shadow-xl px-3 py-2.5 text-sm text-offwhite/50">
          Nenhum cliente encontrado.
        </div>
      )}
    </div>
  )
}

// ─── Detecção de duplicata no modo "Novo" ────────────────────────────────────

function useDuplicataCliente(nome: string, telefone: string) {
  const supabase = createClient()
  const [duplicata, setDuplicata] = useState<ClienteSugestao | null>(null)

  useEffect(() => {
    const tel = telefone.replace(/\D/g, '')
    const nomeLimpo = nome.trim()

    // Precisa de pelo menos telefone com 8+ dígitos OU nome com 3+ chars
    if (tel.length < 8 && nomeLimpo.length < 3) {
      setDuplicata(null)
      return
    }

    const timer = setTimeout(async () => {
      const filters: string[] = []
      if (tel.length >= 8) filters.push(`telefone.ilike.%${tel}%`)
      if (nomeLimpo.length >= 3) filters.push(`nome.ilike.%${nomeLimpo}%`)

      const { data } = await (supabase as any)
        .from('clientes')
        .select('id, nome, telefone, instagram')
        .or(filters.join(','))
        .limit(1)
        .maybeSingle()

      setDuplicata((data as ClienteSugestao) ?? null)
    }, 400)

    return () => clearTimeout(timer)
  }, [nome, telefone])

  return duplicata
}
// ────────────────────────────────────────────────────────────────────────────

export function NovoAgendamentoForm({ executores, servicos, recepcionistaId, defaultData, defaultHora, defaultExecutorId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Modo de cliente: 'existente' ou 'novo'
  const [modoCliente, setModoCliente] = useState<'existente' | 'novo'>('existente')
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSugestao | null>(null)

  const [form, setForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    clienteInstagram: '',
    servicoId: servicos[0]?.id.toString() ?? '',
    executorId: defaultExecutorId ?? executores[0]?.id ?? '',
    data: defaultData ?? format(new Date(), 'yyyy-MM-dd'),
    hora: defaultHora ?? '09:00',
    origem: '' as OrigemLead | '',
    origemDetalhe: '',
    observacoes: '',
  })

  const [error, setError] = useState<string | null>(null)

  // Detectar duplicata enquanto Aline preenche o modo "Novo"
  const duplicata = useDuplicataCliente(
    modoCliente === 'novo' ? form.clienteNome : '',
    modoCliente === 'novo' ? form.clienteTelefone : ''
  )

  const servicoSelecionado = servicos.find((s) => s.id === parseInt(form.servicoId))

  function handleSelecionarCliente(c: ClienteSugestao) {
    setClienteSelecionado(c)
  }

  function handleLimparCliente() {
    setClienteSelecionado(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.origem) {
      setError('Selecione a origem do lead')
      return
    }

    if (modoCliente === 'existente' && !clienteSelecionado) {
      setError('Selecione um cliente existente ou troque para "Novo cliente"')
      return
    }

    if (modoCliente === 'novo' && !form.clienteNome.trim()) {
      setError('Preencha o nome do cliente')
      return
    }

    startTransition(async () => {
      let clienteId: number

      if (modoCliente === 'existente' && clienteSelecionado) {
        // ── Cliente existente: usar ID diretamente ──────────────────────────
        clienteId = clienteSelecionado.id
      } else {
        // ── Novo cliente: verificar duplicata por telefone antes de inserir ─
        if (form.clienteTelefone) {
          const { data: existingData } = await (supabase as any)
            .from('clientes')
            .select('id')
            .eq('telefone', form.clienteTelefone)
            .single()

          const existing = existingData as IdRow | null

          if (existing) {
            clienteId = existing.id
          } else {
            const { data: novoData, error: errCliente } = await (supabase as any)
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

            const novo = novoData as IdRow | null

            if (errCliente || !novo) {
              setError('Erro ao criar cliente')
              return
            }

            clienteId = novo.id
          }
        } else {
          const { data: novoData, error: errCliente } = await (supabase as any)
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

          const novo = novoData as IdRow | null

          if (errCliente || !novo) {
            setError('Erro ao criar cliente')
            return
          }

          clienteId = novo.id
        }
      }

      const inicio = new Date(`${form.data}T${form.hora}:00`)
      const fim = addMinutes(inicio, servicoSelecionado?.duracao_min ?? 60)

      const { data: agData, error: errAg } = await (supabase as any)
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

      const ag = agData as IdRow | null

      if (errAg || !ag) {
        setError(`Erro ao agendar: ${errAg?.message}`)
        return
      }

      // Fase 1 — Conversões Offline: avisa o Meta que esse telefone agendou.
      // Best-effort: não bloqueia o fluxo se a chamada falhar.
      const telefoneParaMeta =
        modoCliente === 'existente' ? clienteSelecionado?.telefone : form.clienteTelefone

      if (telefoneParaMeta) {
        fetch('/api/meta-offline-conversions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_name: 'Agendou',
            telefone: telefoneParaMeta,
            origem: form.origem,
          }),
        }).catch(() => {})
      }

      router.push(`/dashboard/agendamentos/${ag.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

        {(form.origem === 'META_ADS' || form.origem === 'GOOGLE_ADS') && (
          <p className="text-xs text-gold/70 mt-1">
            ✓ Comissão de tráfego será gerada automaticamente ao fechar.
          </p>
        )}
      </Field>

      {/* ── Seção de cliente com toggle ── */}
      <div className="border border-gold/15 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-offwhite/50 font-medium uppercase tracking-wide">Cliente</p>
          {/* Toggle modo */}
          <div className="flex rounded-md border border-gold/20 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => { setModoCliente('existente'); setClienteSelecionado(null) }}
              className={`px-3 py-1.5 transition-colors ${
                modoCliente === 'existente'
                  ? 'bg-gold/20 text-gold font-medium'
                  : 'text-offwhite/50 hover:text-offwhite'
              }`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => { setModoCliente('novo'); setClienteSelecionado(null) }}
              className={`px-3 py-1.5 transition-colors border-l border-gold/20 ${
                modoCliente === 'novo'
                  ? 'bg-gold/20 text-gold font-medium'
                  : 'text-offwhite/50 hover:text-offwhite'
              }`}
            >
              Novo
            </button>
          </div>
        </div>

        {modoCliente === 'existente' ? (
          <>
            {clienteSelecionado ? (
              // Card do cliente selecionado
              <div className="flex items-center justify-between rounded-lg bg-gold/5 border border-gold/25 px-3 py-2.5">
                <div>
                  <p className="text-sm text-offwhite font-medium">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-offwhite/50">
                    {clienteSelecionado.telefone ?? 'sem telefone'}
                    {clienteSelecionado.instagram ? ` · ${clienteSelecionado.instagram}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLimparCliente}
                  className="text-xs text-offwhite/40 hover:text-red-400 transition-colors ml-4 shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <Field label="Buscar cliente">
                <BuscaClienteExistente onSelect={handleSelecionarCliente} />
                <p className="text-xs text-offwhite/35 mt-1">
                  Digite pelo menos 2 caracteres do nome ou WhatsApp
                </p>
              </Field>
            )}
          </>
        ) : (
          // Modo novo cliente
          <>
            {/* ── Banner de duplicata ── */}
            {duplicata && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-200 font-medium">
                    Cliente já cadastrado
                  </p>
                  <p className="text-xs text-amber-200/70 truncate">
                    {duplicata.nome}{duplicata.telefone ? ` · ${duplicata.telefone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClienteSelecionado(duplicata)
                    setModoCliente('existente')
                    setForm(f => ({ ...f, clienteNome: '', clienteTelefone: '', clienteInstagram: '' }))
                  }}
                  className="shrink-0 text-xs font-semibold text-amber-300 border border-amber-400/40 rounded px-2 py-1 hover:bg-amber-400/20 transition-colors"
                >
                  Usar este
                </button>
              </div>
            )}

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
          </>
        )}
      </div>

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

      <Field label="Observações">
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          rows={2}
          placeholder="Ex: Cliente prefere horário pela manhã, tem alergia a X…"
          className="flex w-full rounded-md border border-gold/20 bg-brand-800 px-3 py-2 text-base md:text-sm text-offwhite placeholder:text-offwhite/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 resize-none"
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
