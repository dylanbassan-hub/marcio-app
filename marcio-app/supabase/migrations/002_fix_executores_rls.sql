-- ================================================
-- Migration 002: Fix RLS — recepcionista pode ver executores
-- ================================================
-- Problema: a policy users_select_self só deixa cada usuário ver a si mesmo,
-- e users_select_admin só deixa admins verem todos.
-- Resultado: Aline (recepcionista) não conseguia ver nenhum executor no
-- formulário de novo agendamento — select aparecia vazio.
--
-- Fix: adicionar policy que permite qualquer usuário autenticado
-- ver outros usuários com role 'admin' ou 'barbeiro'.
-- Isso é necessário para exibir a lista de executores no agendamento.
-- ================================================

create policy "users_select_executores"
  on public.users for select to authenticated
  using (role in ('admin', 'barbeiro'));
