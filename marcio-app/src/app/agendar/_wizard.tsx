'use client'

import { useState } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Servico {
  id: number
  nome: string
  codigo: string
  duracao_min: number
}

interface Executor {
  id: string
  nome: string
}

interface Props {
  servicos: Servico[]
  executores: Executor[]
}

type Etapa = 'servico' | 'barbeiro' | 'horario' | 'dados' | 'confirmado'

const GOLD = '#d8b64d'

// ── Estilos inline para não depender de Tailwind config ─────────────────────
const s = {
  card: {
    background: '#111',
    border: '1px solid rgba(216,182,77,0.2)',
    borderRadius: '16px',
    padding: '24px',
  } as React.CSSProperties,
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    marginBottom: '12px',
    display: 'block',
  },
  btnServico: (ativo: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: `1px solid ${ativo ? GOLD : 'rgba(216,182,77,0.2)'}`,
    background: ativo ? 'rgba(216,182,77,0.1)' : 'transparent',
    color: ativo ? GOLD : 'rgba(255,255,255,0.7)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginBottom: '8px',
  }),
  btnPrimario: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    background: GOLD,
    color: '#080808',
    fontWeight: 700,
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
  } as React.CSSProperties,
  btnSecundario: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 0',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '1px solid rgba(216,182,77,0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '12px',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '8px',
  } as React.CSSProperties,
  slot: (disponivel: boolean, ativo: boolean): React.CSSProperties => ({
    padding: '10px 4px',
    borderRadius: '8px',
    border: `1px solid ${ativo ? GOLD : disponivel ? 'rgba(216,182,77,0.25)' : 'rgba(255,255,255,0.05)'}`,
    background: ativo ? 'rgba(216,182,77,0.15)' : 'transparent',
    color: ativo ? GOLD : disponivel ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)',
    fontSize: '13px',
    cursor: disponivel ? 'pointer' : 'default',
    textAlign: 'center' as const,
    fontWeight: ativo ? 600 : 400,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────

export function AgendamentoPublicoWizard({ servicos, executores }: Props) {
  const [etapa, setEtapa]           = useState<Etapa>('servico')
  const [servicoId, setServicoId]   = useState<number | null>(null)
  const [executorId, setExecutorId] = useState<string | null>(null)
  const [data, setData]             = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [hora, setHora]             = useState<string | null>(null)
  const [slots, setSlots]           = useState<{ hora: string; disponivel: boolean }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [nome, setNome]             = useState('')
  const [telefone, setTelefone]     = useState('')
  const [enviando, setEnviando]     = useState(false)
  const [erro, setErro]             = useState<string | null>(null)
  const [agId, setAgId]             = useState<number | null>(null)

  const servico  = servicos.find((s) => s.id === servicoId)
  const executor = executores.find((e) => e.id === executorId)

  async function buscarSlots(execId: string, d: string) {
    if (!servicoId) return
    setLoadingSlots(true)
    setHora(null)
    const url = `/api/agendar/disponibilidade?executor_id=${execId}&data=${d}&duracao_min=${servico?.duracao_min ?? 60}`
    const res = await fetch(url)
    const json = await res.json()
    setSlots(json.slots ?? [])
    setLoadingSlots(false)
  }

  async function confirmar() {
    if (!nome.trim()) { setErro('Informe seu nome'); return }
    if (!telefone.trim()) { setErro('Informe seu WhatsApp'); return }
    setErro(null)
    setEnviando(true)
    const res = await fetch('/api/agendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servico_id: servicoId, executor_id: executorId, data, hora, nome: nome.trim(), telefone: telefone.trim() }),
    })
    const json = await res.json()
    setEnviando(false)
    if (!res.ok) { setErro(json.error ?? 'Erro ao agendar'); return }
    setAgId(json.agendamento_id)
    setEtapa('confirmado')
  }

  // ── Etapa: serviço ──────────────────────────────────────────────────────────
  if (etapa === 'servico') return (
    <div style={s.card}>
      <span style={s.label}>Qual serviço você precisa?</span>
      {servicos.map((sv) => (
        <button
          key={sv.id}
          style={s.btnServico(servicoId === sv.id)}
          onClick={() => setServicoId(sv.id)}
        >
          <span style={{ fontWeight: 600, fontSize: '15px', display: 'block' }}>
            {sv.nome}
          </span>
          <span style={{ fontSize: '12px', opacity: 0.6 }}>
            Duração aprox. {sv.duracao_min} min
          </span>
        </button>
      ))}
      <button
        style={{ ...s.btnPrimario, opacity: servicoId ? 1 : 0.4 }}
        disabled={!servicoId}
        onClick={() => setEtapa('barbeiro')}
      >
        Continuar →
      </button>
    </div>
  )

  // ── Etapa: barbeiro ─────────────────────────────────────────────────────────
  if (etapa === 'barbeiro') return (
    <div style={s.card}>
      <span style={s.label}>Escolha o profissional</span>
      {executores.map((ex) => (
        <button
          key={ex.id}
          style={s.btnServico(executorId === ex.id)}
          onClick={() => setExecutorId(ex.id)}
        >
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{ex.nome}</span>
        </button>
      ))}
      <button
        style={{ ...s.btnPrimario, opacity: executorId ? 1 : 0.4 }}
        disabled={!executorId}
        onClick={() => {
          setEtapa('horario')
          if (executorId) buscarSlots(executorId, data)
        }}
      >
        Ver horários disponíveis →
      </button>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button style={s.btnSecundario} onClick={() => setEtapa('servico')}>← Voltar</button>
      </div>
    </div>
  )

  // ── Etapa: horário ──────────────────────────────────────────────────────────
  if (etapa === 'horario') return (
    <div style={s.card}>
      <span style={s.label}>Escolha a data e o horário</span>

      {/* Date picker simples */}
      <input
        type="date"
        value={data}
        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
        style={s.input}
        onChange={(e) => {
          setData(e.target.value)
          if (executorId) buscarSlots(executorId, e.target.value)
        }}
      />

      {loadingSlots ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          Carregando horários…
        </p>
      ) : (
        <>
          {slots.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
              Nenhum horário encontrado para esta data.
            </p>
          ) : (
            <div style={s.slotGrid}>
              {slots.map((sl) => (
                <button
                  key={sl.hora}
                  disabled={!sl.disponivel}
                  style={s.slot(sl.disponivel, hora === sl.hora)}
                  onClick={() => sl.disponivel && setHora(sl.hora)}
                >
                  {sl.hora}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {hora && (
        <p style={{ color: GOLD, fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
          ✓ Horário selecionado: {format(parseISO(data), "dd/MM/yyyy", { locale: ptBR })} às {hora}
        </p>
      )}

      <button
        style={{ ...s.btnPrimario, opacity: hora ? 1 : 0.4, marginTop: '16px' }}
        disabled={!hora}
        onClick={() => setEtapa('dados')}
      >
        Continuar →
      </button>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button style={s.btnSecundario} onClick={() => setEtapa('barbeiro')}>← Voltar</button>
      </div>
    </div>
  )

  // ── Etapa: dados pessoais ───────────────────────────────────────────────────
  if (etapa === 'dados') return (
    <div style={s.card}>
      <span style={s.label}>Seus dados para o agendamento</span>

      {/* Resumo */}
      <div style={{ background: 'rgba(216,182,77,0.06)', border: '1px solid rgba(216,182,77,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
          <strong style={{ color: GOLD }}>{servico?.nome}</strong>{' '}
          com <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{executor?.nome}</strong>
          <br />
          {format(parseISO(data), "dd 'de' MMMM", { locale: ptBR })} às <strong>{hora}</strong>
        </p>
      </div>

      <input
        style={s.input}
        placeholder="Seu nome completo *"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <input
        style={s.input}
        placeholder="WhatsApp (ex: 11999999999) *"
        type="tel"
        inputMode="tel"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
      />

      {erro && (
        <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>{erro}</p>
      )}

      <button
        style={{ ...s.btnPrimario, opacity: enviando ? 0.6 : 1 }}
        disabled={enviando}
        onClick={confirmar}
      >
        {enviando ? 'Confirmando…' : 'Confirmar agendamento ✓'}
      </button>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button style={s.btnSecundario} onClick={() => setEtapa('horario')}>← Voltar</button>
      </div>
    </div>
  )

  // ── Etapa: confirmado ───────────────────────────────────────────────────────
  return (
    <div style={{ ...s.card, textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
      <h2 style={{ color: GOLD, fontFamily: 'var(--font-syne, sans-serif)', fontSize: '22px', marginBottom: '8px' }}>
        Agendado!
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.6 }}>
        {nome}, seu horário foi confirmado:
        <br />
        <strong style={{ color: '#fff' }}>
          {format(parseISO(data), "dd 'de' MMMM", { locale: ptBR })} às {hora}
        </strong>
        <br />
        {servico?.nome} com {executor?.nome}
      </p>
      <div style={{ margin: '24px 0', padding: '16px', background: 'rgba(216,182,77,0.06)', border: '1px solid rgba(216,182,77,0.2)', borderRadius: '12px' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>
          Dúvidas? Fale conosco pelo WhatsApp:
        </p>
        <a
          href="https://wa.me/5511911164696"
          style={{ color: GOLD, fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'block', marginTop: '6px' }}
        >
          (11) 91116-4696
        </a>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
        Endereço: Rua dos Trilhos, 1522 — Mooca, São Paulo
      </p>
    </div>
  )
}
