-- ================================================
-- SEED — 7 usuários iniciais
-- ================================================
-- ATENÇÃO: Rode este seed DEPOIS de criar os usuários no Supabase Auth.
--
-- Como criar usuários no Supabase Auth:
-- 1. Acesse supabase.com → seu projeto → Authentication → Users
-- 2. Clique em "Add user" → "Create new user" para cada pessoa
-- 3. Use o e-mail real de cada um (eles vão receber magic link)
-- 4. Após criar, copie o UUID gerado de cada um e substitua os placeholders abaixo
--
-- OU rode em SQL:
--   select id from auth.users where email = 'email@exemplo.com';
-- para pegar os UUIDs depois de criar via dashboard.
-- ================================================

-- Substituir os UUIDs pelos reais do Supabase Auth!
-- E-mails confirmados (2026-04-26):
--   Dylan:        dylan.bassan@gmail.com
--   Márcio:       Marcio0909@gmail.com
--   Liandra:      Liandra9922@gmail.com
--   Aline (recep):aline1997.2026@gmail.com
--   Barbeiros 1-3: pendente (pedir ao Márcio)

-- COMISSÕES EM R$ FIXO (configuráveis pelo admin a qualquer momento)
-- Lógica: Barbeiro recebe valor fixo + Recepcionista recebe valor fixo
--         + Dylan recebe valor fixo (só se origem = tráfego pago)
--         + Márcio recebe o RESTANTE (valor_servico - todos os fixos)
--
-- Valores atuais confirmados pelo Dylan (2026-04-24):
--   Dylan (tráfego): R$ 200 por agendamento
--   Recepcionista:   R$ 90 por agendamento
--   Barbeiro:        R$ 200 por agendamento (confirmar com Márcio)
--
-- Para alterar: UPDATE users SET comissao_aplicacao_valor = X WHERE nome = '...';
-- Ou via tela de admin no app (a implementar no Sprint 3).

insert into public.users (
  id,
  nome,
  telefone,
  role,
  comissao_aplicacao_valor,
  comissao_manutencao_valor,
  is_marcio,
  is_trafego
) values
  -- 1. Dylan (admin + tráfego)
  (
    'fdca7697-b1d1-4222-b648-adf6023e55d2'::uuid,
    'Dylan Bassan',
    '(11) 99999-9999',        -- atualizar com seu celular
    'admin',
    200.00,                    -- R$ 200 por aplicação (só se origem paga)
    200.00,                    -- R$ 200 por manutenção (confirmar se é o mesmo)
    false,
    true                       -- is_trafego = true → comissão só se origem paga
  ),
  -- 2. Márcio (admin + dono + executor)
  (
    '9e926b27-9a60-4dc6-91fa-9392b697c59e'::uuid,
    'Márcio Gonzalez',
    '(11) XXXXX-XXXX',        -- atualizar com cel do Márcio
    'admin',
    0.00,                      -- Márcio recebe o RESTANTE automaticamente
    0.00,
    true,                      -- is_marcio = true → não gera lançamento duplo
    false
  ),
  -- 3. Esposa do Márcio (admin — sem comissão de execução)
  (
    'b448e21f-a298-4e80-9f2a-f0ed235401a5'::uuid,
    'Liandra Gonzalez',
    '(11) XXXXX-XXXX',        -- atualizar com cel da Liandra
    'admin',
    0.00,
    0.00,
    false,
    false
  ),
  -- 4. Recepcionista
  (
    'a8f627b0-bd96-4762-8669-e730c66f7dbd'::uuid,
    'Aline',
    '(11) 99774-1721',        -- WhatsApp Business do salão
    'recepcionista',
    90.00,                     -- R$ 90 por aplicação
    90.00,                     -- R$ 90 por manutenção
    false,
    false
  );
  -- Barbeiros 1-3: adicionar aqui quando tiver os e-mails
  -- Exemplo:
  -- INSERT INTO public.users (id, nome, telefone, role, comissao_aplicacao_valor, comissao_manutencao_valor, is_marcio, is_trafego)
  -- VALUES ('UUID-DO-SUPABASE'::uuid, 'Nome Barbeiro', '(11) XXXXX-XXXX', 'barbeiro', 200.00, 200.00, false, false);

-- ================================================
-- Verificação pós-seed
-- ================================================
-- select nome, role, comissao_aplicacao_valor, comissao_manutencao_valor,
--        is_marcio, is_trafego
-- from public.users order by role, nome;
