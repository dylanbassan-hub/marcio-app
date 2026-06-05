'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type AgendamentoGrid = {
  id: number
  status: string
  inicio: string
  fim: string
  origem: string
  cliente: { id: number; nome: string } | null
  executor: { id: string; nome: string } | null
  servico: { nome: string; codigo: string } | null
}

export type ExecutorGrid = {
  id: string
  nome: string
}

interface AgendaGridProps {
  dia: Date
  agendamentos: AgendamentoGrid[]
  executores: ExecutorGrid[]
  isAdmin: boolean
  prevDiaHref: string
  nextDiaHref: string
  semanaHref: string
}

const HORA_INICIO = 8
const HORA_FIM    = 21
const SLOT_MIN    = 30
const CELL_H      = 60
const TIME_COL_W  = 52
const BAR_COL_W   = 164

function gerarSlots() {
  const slots: string[] = []
  for (let h = HORA_INICIO; h < HORA_FIM; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}
const SLOTS = gerarSlots()

function minFromIso(iso: string): number {
  const d = parseISO(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function minFromSlot(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

function slotIdxFromIso(iso: string): number {
  const m = minFromIso(iso)
  const base = HORA_INICIO * 60
  return Math.max(0, Math.floor((m - base) / SLOT_MIN))
}

function spanSlots(inicio: string, fim: string): number {
  const diff = minFromIso(fim) - minFromIso(inicio)
  return Math.max(1, Math.round(diff / SLOT_MIN))
}

function corServico(codigo: string, status: string) {
  if (status === 'REALIZADO')      return { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', text: '#86efac' }
  if (status === 'NAO_COMPARECEU') return { bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', text: '#fca5a5' }
  if (status === 'CANCELADO')      return { bg: 'rgba(100,116,139,0.10)',border: '#64748b', text: '#94a3b8' }
  if (codigo === 'APLICACAO')      return { bg: 'rgba(139,92,246,0.18)', border: '#8b5cf6', text: '#c4b5fd' }
  return                                  { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#93c5fd' }
}

function initials(nome: string): string {
  return nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
}

const AVATAR_COLORS = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#9333ea','#0284c7','#b45309']

function CelulaAgendamento({ ag, span }: { ag: AgendamentoGrid; span: number }) {
  const codigo = ag.servico?.codigo ?? 'MANUTENCAO'
  const { bg, border, text } = corServico(codigo, ag.status)
  const h1 = format(parseISO(ag.inicio), 'HH:mm')
  const h2 = format(parseISO(ag.fim),    'HH:mm')
  return (
    <Link
      href={`/dashboard/agendamentos/${ag.id}`}
      className="absolute inset-x-0.5 top-0.5 rounded-lg overflow-hidden hover:brightness-110 transition-all z-10"
      style={{ height: `${span * CELL_H - 3}px`, background: bg, borderLeft: `3px solid ${border}` }}
    >
      <div className="px-2 py-1.5 h-full flex flex-col overflow-hidden">
        <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: text }}>
          {ag.cliente?.nome ?? '—'}
        </p>
        {span >= 2 && (
          <p className="text-[10px] opacity-70 truncate mt-0.5" style={{ color: text }}>
            {ag.servico?.nome}
          </p>
        )}
        <p className="text-[10px] opacity-50 font-mono mt-auto" style={{ color: text }}>
          {h1}–{h2}
        </p>
      </div>
    </Link>
  )
}

function ColunaExecutor({
  executor, agendamentos, dia, isAdmin,
}: {
  executor: ExecutorGrid
  agendamentos: AgendamentoGrid[]
  dia: Date
  isAdmin: boolean
}) {
  const slotMap = new Map<number, { ag: AgendamentoGrid; span: number }>()
  const occupied = new Set<number>()

  for (const ag of agendamentos) {
    const idx = slotIdxFromIso(ag.inicio)
    const span = spanSlots(ag.inicio, ag.fim)
    slotMap.set(idx, { ag, span })
    for (let i = 0; i < span; i++) occupied.add(idx + i)
  }

  return (
    <div className="relative border-l border-white/5 shrink-0" style={{ width: `${BAR_COL_W}px` }}>
      {SLOTS.map((slot, i) => {
        const entry = slotMap.get(i)
        const covered = occupied.has(i) && !slotMap.has(i)
        const isMeia = slot.endsWith(':30')
        return (
          <div
            key={slot}
            className={`relative ${isMeia ? 'border-b border-white/3' : 'border-b border-white/8'}`}
            style={{ height: `${CELL_H}px` }}
          >
            {entry && !covered && (
              <CelulaAgendamento ag={entry.ag} span={entry.span} />
            )}
            {!entry && !covered && isAdmin && (
              <Link
                href={`/dashboard/agendamentos/novo?data=${format(dia, 'yyyy-MM-dd')}&hora=${slot}&executor=${executor.id}`}
                className="absolute inset-0 hover:bg-gold/5 group transition-colors"
              >
                <span className="hidden group-hover:block text-[9px] text-gold/40 pt-1 pl-1.5">
                  +{slot}
                </span>
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AgendaGrid({ dia, agendamentos, executores, isAdmin, prevDiaHref, nextDiaHref, semanaHref }: AgendaGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hoje = new Date()
  const isHoje = dia.toDateString() === hoje.toDateString()

  useEffect(() => {
    if (!isHoje || !scrollRef.current) return
    const agoMin = hoje.getHours() * 60 + hoje.getMinutes()
    const px = Math.max(0, ((agoMin - HORA_INICIO * 60) / SLOT_MIN) * CELL_H - 80)
    scrollRef.current.scrollTop = px
  }, [isHoje])

  const agoraPx: number | null = (() => {
    if (!isHoje) return null
    const agoMin = hoje.getHours() * 60 + hoje.getMinutes()
    if (agoMin < HORA_INICIO * 60 || agoMin > HORA_FIM * 60) return null
    return ((agoMin - HORA_INICIO * 60) / SLOT_MIN) * CELL_H
  })()

  function agsDoExecutor(id: string) {
    return agendamentos.filter((ag) => ag.executor?.id === id)
  }

  const totalW = TIME_COL_W + executores.length * BAR_COL_W

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Navegação */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <Link href={prevDiaHref} className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-gold/30 hover:bg-gold/5 text-offwhite/50 hover:text-offwhite transition-all text-sm">
          &lsaquo; Anterior
        </Link>
        <div className="text-center">
          <p className={`font-syne font-bold text-base ${isHoje ? 'text-gold' : 'text-offwhite'}`}>
            {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          {isHoje && (
            <span className="text-[11px] text-emerald-400/80 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Hoje
            </span>
          )}
        </div>
        <Link href={nextDiaHref} className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-gold/30 hover:bg-gold/5 text-offwhite/50 hover:text-offwhite transition-all text-sm">
          Pr&oacute;ximo &rsaquo;
        </Link>
      </div>

      {/* Grade */}
      <div className="flex-1 min-h-0 rounded-xl border border-white/8 overflow-hidden bg-[#0e0c18] flex flex-col">
        {/* Header fixo */}
        <div className="shrink-0 overflow-x-auto border-b border-white/10">
          <div className="flex" style={{ minWidth: `${totalW}px` }}>
            <div className="shrink-0 flex items-center justify-center border-r border-white/8" style={{ width: `${TIME_COL_W}px`, height: '72px' }}>
              <span className="text-[10px] text-offwhite/20">hora</span>
            </div>
            {executores.map((exec, idx) => (
              <div key={exec.id} className="flex flex-col items-center justify-center py-2 border-l border-white/5 gap-1 shrink-0" style={{ width: `${BAR_COL_W}px` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                  {initials(exec.nome)}
                </div>
                <div className="text-center leading-tight">
                  <p className="text-xs font-semibold text-offwhite">{exec.nome.split(' ')[0]}</p>
                  <p className="text-[10px] text-offwhite/30">{exec.nome.split(' ').slice(1).join(' ')}</p>
                </div>
                <span className="text-[10px] text-offwhite/25">{agsDoExecutor(exec.id).length} ag.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Corpo scroll */}
        <div ref={scrollRef} className="overflow-auto flex-1">
          <div className="relative flex" style={{ minWidth: `${totalW}px` }}>
            {/* Coluna de horas */}
            <div className="shrink-0 border-r border-white/8" style={{ width: `${TIME_COL_W}px` }}>
              {SLOTS.map((slot) => (
                <div
                  key={slot}
                  className={`flex items-start justify-end pr-2 pt-1 ${slot.endsWith(':30') ? 'border-b border-white/3' : 'border-b border-white/8'}`}
                  style={{ height: `${CELL_H}px` }}
                >
                  {!slot.endsWith(':30') && (
                    <span className="text-[10px] text-offwhite/25 font-mono">{slot}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Colunas dos executores */}
            {executores.map((exec) => (
              <ColunaExecutor
                key={exec.id}
                executor={exec}
                agendamentos={agsDoExecutor(exec.id)}
                dia={dia}
                isAdmin={isAdmin}
              />
            ))}

            {/* Linha de agora */}
            {agoraPx !== null && (
              <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: `${agoraPx}px` }}>
                <div className="w-2 h-2 rounded-full bg-red-500 ml-10 shrink-0" />
                <div className="flex-1 h-px bg-red-500/60" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-2 flex-wrap shrink-0">
        {[
          { label: 'Aplicacao',  c: '#8b5cf6' },
          { label: 'Manutencao', c: '#3b82f6' },
          { label: 'Realizado',  c: '#22c55e' },
          { label: 'Nao veio',   c: '#ef4444' },
        ].map(({ label, c }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c + '30', borderLeft: `2px solid ${c}` }} />
            <span className="text-[11px] text-offwhite/35">{label}</span>
          </div>
        ))}
        <Link href={semanaHref} className="ml-auto text-[11px] text-gold/50 hover:text-gold transition-colors">
          Ver semana
        </Link>
      </div>
    </div>
  )
}
