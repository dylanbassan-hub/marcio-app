-- ================================================
-- Migration 004: agenda compartilhada para barbeiros
-- ================================================
-- Problema relatado em 17/jun/2026:
-- Bob (barbeiro) nao conseguia ver agendamentos criados pela Aline
-- para outros executores, principalmente agenda do Marcio.
--
-- Causa raiz:
-- A policy agendamentos_select_barbeiro limitava SELECT a
-- executor_id = auth.uid(). Mesmo removendo filtros no frontend,
-- o RLS continuava escondendo linhas de outros executores.
--
-- Regra desejada:
-- Todos os perfis autenticados devem enxergar a agenda compartilhada.
--
-- O que nao muda:
-- - Admin/recepcionista continuam com permissoes atuais.
-- - Barbeiro continua podendo atualizar status apenas dos proprios
--   agendamentos via agendamentos_update_status_barbeiro.
-- - A tela de clientes continua bloqueada para barbeiro no app.
-- ================================================

-- AGENDAMENTOS: barbeiro passa a ver todos os agendamentos.
drop policy if exists "agendamentos_select_barbeiro" on public.agendamentos;

create policy "agendamentos_select_barbeiro"
  on public.agendamentos for select to authenticated
  using (public.get_my_role() = 'barbeiro');

-- CLIENTES: barbeiro precisa ler dados de clientes vinculados a agendamentos
-- visiveis para que os joins da agenda/detalhe mostrem nome e telefone.
drop policy if exists "clientes_select_barbeiro" on public.clientes;

create policy "clientes_select_barbeiro"
  on public.clientes for select to authenticated
  using (
    public.get_my_role() = 'barbeiro'
    and exists (
      select 1
      from public.agendamentos a
      where a.cliente_id = clientes.id
    )
  );
