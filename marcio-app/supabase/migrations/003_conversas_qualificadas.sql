-- ================================================
-- Migration 003: Conversas Qualificadas (Fase 1 — Conversões Offline)
-- ================================================
-- Contexto: o Meta hoje só vê "abriu conversa" nos anúncios de clique-pro-
-- WhatsApp. Não existe nenhum registro de conversa ANTES de virar agendamento,
-- então não há sinal de volume suficiente pra alimentar o algoritmo entre
-- "abriu conversa" (evento raso, alto volume) e "Fechou" (evento raro, baixo
-- volume — só ~1 a cada 50-60 conversas).
--
-- Esta tabela registra o evento-ponte "Conversa Qualificada": toda vez que a
-- Aline identifica, na conversa, que a pessoa é candidata de verdade (mesma
-- lógica do 🔥 que ela já usa), ela marca aqui. Esse registro alimenta o
-- evento offline "ConversaQualificada" no Meta (action_source: other, casado
-- por telefone) — ver `src/lib/meta-offline.ts` e
-- `src/app/api/meta-offline-conversions/route.ts`.
--
-- Plano completo: 07_Conversoes_Offline_Jun16/00_PLANO_FASE1.md
-- ================================================

create table public.conversas_qualificadas (
  id              bigserial primary key,
  telefone        text not null,
  nome            text,
  origem          public.origem_lead not null,
  origem_detalhe  text,
  observacoes     text,
  meta_enviado    boolean default false,
  meta_enviado_at timestamptz,
  created_at      timestamptz default now(),
  created_by      uuid references public.users(id)
);

create index conversas_qualificadas_telefone_idx   on public.conversas_qualificadas (telefone);
create index conversas_qualificadas_origem_idx     on public.conversas_qualificadas (origem);
create index conversas_qualificadas_created_at_idx on public.conversas_qualificadas (created_at);

comment on table public.conversas_qualificadas is
  'Registro do evento-ponte "Conversa Qualificada" (Fase 1 de Conversões Offline). Toda marcação aqui já é, por definição, uma conversa qualificada — não existe flag negativa.';

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
alter table public.conversas_qualificadas enable row level security;

-- Mesma regra de acesso usada em clientes/agendamentos: admin e recepcionista
-- leem, criam e atualizam (atualizar é usado só pelo próprio app, pra marcar
-- meta_enviado/meta_enviado_at depois do envio pro Meta).
create policy "conversas_qualificadas_all_admin_recep"
  on public.conversas_qualificadas for all to authenticated
  using (public.get_my_role() in ('admin', 'recepcionista'))
  with check (public.get_my_role() in ('admin', 'recepcionista'));
