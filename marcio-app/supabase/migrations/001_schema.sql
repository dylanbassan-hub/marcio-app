-- ================================================
-- MIGRATION 001 — Schema Márcio Gonzalez Salão App
-- Executar no Supabase SQL Editor (ou supabase db push)
-- ================================================

-- ========================================
-- ENUMS
-- ========================================
create type public.role_usuario as enum ('admin', 'recepcionista', 'barbeiro');

create type public.origem_lead as enum (
  'META_ADS',
  'GOOGLE_ADS',
  'INSTAGRAM_ORGANICO',
  'YOUTUBE',
  'INDICACAO',
  'RECORRENTE',
  'OUTRO'
);

create type public.status_agendamento as enum (
  'AGENDADO',
  'CONFIRMADO',
  'REALIZADO',
  'NAO_COMPARECEU',
  'CANCELADO'
);

create type public.codigo_servico as enum ('APLICACAO', 'MANUTENCAO');

create type public.papel_comissao as enum (
  'MARCIO_SALAO',
  'EXECUTOR',
  'RECEPCIONISTA',
  'TRAFEGO'
);

-- ========================================
-- USERS (mirrors auth.users + app metadata)
-- ========================================
create table public.users (
  id                          uuid primary key references auth.users(id) on delete cascade,
  nome                        text not null,
  telefone                    text,
  role                        public.role_usuario not null,
  ativo                       boolean default true,
  -- Comissão em R$ FIXO por serviço realizado (configurável pelo admin)
  -- Márcio recebe o RESTANTE após pagar todos os outros
  comissao_aplicacao_valor    numeric(10,2) default 0 check (comissao_aplicacao_valor >= 0),
  comissao_manutencao_valor   numeric(10,2) default 0 check (comissao_manutencao_valor >= 0),
  is_marcio                   boolean default false,  -- flag: dono (recebe o restante)
  is_trafego                  boolean default false,  -- flag: Dylan (comissão só em tráfego pago)
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- ========================================
-- CLIENTES
-- ========================================
create table public.clientes (
  id                      bigserial primary key,
  nome                    text not null,
  telefone                text,
  instagram               text,
  observacoes             text,
  origem_primeira_compra  public.origem_lead,
  ativo                   boolean default true,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  created_by              uuid references public.users(id)
);

create index clientes_nome_fts_idx on public.clientes
  using gin (to_tsvector('portuguese', nome));
create index clientes_telefone_idx on public.clientes (telefone);

-- ========================================
-- SERVIÇOS
-- ========================================
create table public.servicos (
  id          bigserial primary key,
  nome        text not null,
  codigo      public.codigo_servico unique not null,
  duracao_min int default 60 check (duracao_min > 0),
  ativo       boolean default true
);

-- Seed inline (2 serviços fixos)
insert into public.servicos (nome, codigo, duracao_min) values
  ('Aplicação de Prótese', 'APLICACAO', 120),
  ('Manutenção de Prótese', 'MANUTENCAO', 60);

-- ========================================
-- AGENDAMENTOS
-- ========================================
create table public.agendamentos (
  id                bigserial primary key,
  cliente_id        bigint references public.clientes(id) not null,
  servico_id        bigint references public.servicos(id) not null,
  executor_id       uuid references public.users(id) not null,
  recepcionista_id  uuid references public.users(id),
  inicio            timestamptz not null,
  fim               timestamptz not null,
  origem            public.origem_lead not null,
  origem_detalhe    text,                        -- utm_campaign ou texto livre se OUTRO
  status            public.status_agendamento default 'AGENDADO',
  observacoes       text,
  -- Preenchidos no fechamento:
  valor_protese     numeric(10,2),               -- custo do material (vai 100% pro salão)
  valor_servico     numeric(10,2),               -- BASE do rateio de comissão
  pagamento_forma   text,                        -- PIX | CARTAO | DINHEIRO | CARTAO_PARCELADO
  fechado_at        timestamptz,
  fechado_by        uuid references public.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  constraint agendamentos_datas_check check (fim > inicio)
);

create index agendamentos_inicio_idx       on public.agendamentos (inicio);
create index agendamentos_executor_idx     on public.agendamentos (executor_id, inicio);
create index agendamentos_cliente_idx      on public.agendamentos (cliente_id);
create index agendamentos_origem_idx       on public.agendamentos (origem);
create index agendamentos_status_idx       on public.agendamentos (status);

-- ========================================
-- COMISSÕES
-- ========================================
create table public.comissoes (
  id              bigserial primary key,
  agendamento_id  bigint references public.agendamentos(id) on delete cascade not null,
  user_id         uuid references public.users(id) not null,
  papel           public.papel_comissao not null,
  percentual      numeric(5,2) not null check (percentual >= 0),
  valor_base      numeric(10,2) not null,
  valor           numeric(10,2) not null,
  pago            boolean default false,
  pago_at         timestamptz,
  created_at      timestamptz default now()
);

create index comissoes_user_idx        on public.comissoes (user_id, created_at);
create index comissoes_agendamento_idx on public.comissoes (agendamento_id);
create index comissoes_pago_idx        on public.comissoes (pago);

-- ========================================
-- TRIGGER: updated_at automático
-- ========================================
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.fn_set_updated_at();

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.fn_set_updated_at();

create trigger trg_agendamentos_updated_at
  before update on public.agendamentos
  for each row execute function public.fn_set_updated_at();

-- ========================================
-- FUNÇÃO + TRIGGER: Engine de comissões
-- Dispara quando agendamento.status → REALIZADO
-- ========================================
create or replace function public.fn_calcular_comissoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_servico       record;
  v_executor      record;
  v_recep         record;
  v_trafego       record;
  v_marcio        record;
  v_is_aplic      boolean;
  v_orig_paga     boolean;
  v_valor_exec    numeric;
  v_valor_recep   numeric;
  v_valor_traf    numeric;
  v_valor_marcio  numeric;
  v_base          numeric;
begin
  -- Só processa quando muda pra REALIZADO e valor_servico está preenchido
  if new.status <> 'REALIZADO' or new.valor_servico is null then
    return new;
  end if;

  -- Idempotência: não relança se já existe lançamento pra esse agendamento
  if exists (select 1 from public.comissoes where agendamento_id = new.id) then
    return new;
  end if;

  -- Dados do serviço
  select * into v_servico from public.servicos where id = new.servico_id;
  v_is_aplic := v_servico.codigo = 'APLICACAO';

  -- Pessoas envolvidas
  select * into v_executor from public.users where id = new.executor_id;

  if new.recepcionista_id is not null then
    select * into v_recep from public.users where id = new.recepcionista_id;
  end if;

  select * into v_trafego from public.users
  where is_trafego = true and ativo = true limit 1;

  select * into v_marcio from public.users
  where is_marcio = true and ativo = true limit 1;

  v_base      := new.valor_servico;
  v_orig_paga := new.origem in ('META_ADS', 'GOOGLE_ADS');

  -- ---- Valores fixos em R$ ----------------------------------------
  -- Executor (barbeiro) — zero se for o próprio Márcio executando
  if v_is_aplic then
    v_valor_exec  := case when v_executor.is_marcio then 0
                     else coalesce(v_executor.comissao_aplicacao_valor, 0) end;
    v_valor_recep := case when v_recep is not null
                     then coalesce(v_recep.comissao_aplicacao_valor, 0) else 0 end;
    v_valor_traf  := case when v_orig_paga and v_trafego is not null
                     then coalesce(v_trafego.comissao_aplicacao_valor, 0) else 0 end;
  else
    v_valor_exec  := case when v_executor.is_marcio then 0
                     else coalesce(v_executor.comissao_manutencao_valor, 0) end;
    v_valor_recep := case when v_recep is not null
                     then coalesce(v_recep.comissao_manutencao_valor, 0) else 0 end;
    v_valor_traf  := case when v_orig_paga and v_trafego is not null
                     then coalesce(v_trafego.comissao_manutencao_valor, 0) else 0 end;
  end if;

  -- Márcio recebe o restante (nunca negativo)
  v_valor_marcio := greatest(v_base - v_valor_exec - v_valor_recep - v_valor_traf, 0);
  -- -----------------------------------------------------------------

  -- Lança comissão do Márcio (salão)
  if v_marcio is not null and v_valor_marcio > 0 then
    insert into public.comissoes
      (agendamento_id, user_id, papel, percentual, valor_base, valor)
    values (
      new.id, v_marcio.id, 'MARCIO_SALAO',
      round(v_valor_marcio / v_base * 100, 2),   -- % calculado pra auditoria
      v_base, v_valor_marcio
    );
  end if;

  -- Executor (barbeiro)
  if not v_executor.is_marcio and v_valor_exec > 0 then
    insert into public.comissoes
      (agendamento_id, user_id, papel, percentual, valor_base, valor)
    values (
      new.id, v_executor.id, 'EXECUTOR',
      round(v_valor_exec / v_base * 100, 2),
      v_base, v_valor_exec
    );
  end if;

  -- Recepcionista
  if v_recep is not null and v_valor_recep > 0 then
    insert into public.comissoes
      (agendamento_id, user_id, papel, percentual, valor_base, valor)
    values (
      new.id, v_recep.id, 'RECEPCIONISTA',
      round(v_valor_recep / v_base * 100, 2),
      v_base, v_valor_recep
    );
  end if;

  -- Tráfego (Dylan — só em origem paga)
  if v_trafego is not null and v_valor_traf > 0 then
    insert into public.comissoes
      (agendamento_id, user_id, papel, percentual, valor_base, valor)
    values (
      new.id, v_trafego.id, 'TRAFEGO',
      round(v_valor_traf / v_base * 100, 2),
      v_base, v_valor_traf
    );
  end if;

  return new;
end;
$$;

create trigger trg_comissoes_after_realizado
  after update on public.agendamentos
  for each row
  when (old.status is distinct from new.status and new.status = 'REALIZADO')
  execute function public.fn_calcular_comissoes();

-- ========================================
-- HELPERS para RLS
-- ========================================
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select true from public.users where id = auth.uid() and role = 'admin'),
    false
  );
$$;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- USERS
alter table public.users enable row level security;

create policy "users_select_self"
  on public.users for select to authenticated
  using (id = auth.uid());

create policy "users_select_admin"
  on public.users for select to authenticated
  using (public.is_admin());

create policy "users_all_admin"
  on public.users for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CLIENTES
alter table public.clientes enable row level security;

create policy "clientes_select_admin_recep"
  on public.clientes for select to authenticated
  using (public.get_my_role() in ('admin', 'recepcionista'));

create policy "clientes_select_barbeiro"
  on public.clientes for select to authenticated
  using (
    public.get_my_role() = 'barbeiro' and
    id in (
      select cliente_id from public.agendamentos
      where executor_id = auth.uid()
    )
  );

create policy "clientes_write_admin_recep"
  on public.clientes for all to authenticated
  using (public.get_my_role() in ('admin', 'recepcionista'))
  with check (public.get_my_role() in ('admin', 'recepcionista'));

-- SERVIÇOS
alter table public.servicos enable row level security;

create policy "servicos_select_all"
  on public.servicos for select to authenticated
  using (true);

create policy "servicos_write_admin"
  on public.servicos for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- AGENDAMENTOS
alter table public.agendamentos enable row level security;

create policy "agendamentos_select_admin_recep"
  on public.agendamentos for select to authenticated
  using (public.get_my_role() in ('admin', 'recepcionista'));

create policy "agendamentos_select_barbeiro"
  on public.agendamentos for select to authenticated
  using (public.get_my_role() = 'barbeiro' and executor_id = auth.uid());

create policy "agendamentos_write_admin_recep"
  on public.agendamentos for all to authenticated
  using (public.get_my_role() in ('admin', 'recepcionista'))
  with check (public.get_my_role() in ('admin', 'recepcionista'));

create policy "agendamentos_update_status_barbeiro"
  on public.agendamentos for update to authenticated
  using (public.get_my_role() = 'barbeiro' and executor_id = auth.uid())
  with check (public.get_my_role() = 'barbeiro' and executor_id = auth.uid());

-- COMISSÕES
alter table public.comissoes enable row level security;

create policy "comissoes_select_admin"
  on public.comissoes for select to authenticated
  using (public.is_admin());

create policy "comissoes_select_self"
  on public.comissoes for select to authenticated
  using (user_id = auth.uid());
