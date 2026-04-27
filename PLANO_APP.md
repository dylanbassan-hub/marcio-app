# Plano do App — Agendamento Márcio Gonzalez

**Stack:** Next.js 14 (App Router, TypeScript) · Supabase (Postgres + Auth + RLS) · Tailwind + shadcn/ui · Vercel
**URL alvo:** `app.marciogonzalez.com.br`
**Objetivo do MVP (7 dias):** login + agenda + cliente + origem + comissão + relatório mensal.

---

## 1. Schema do banco (Postgres / Supabase)

```sql
-- =========================================
-- USERS (espelho de auth.users + metadados)
-- =========================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  role text not null check (role in ('admin','recepcionista','barbeiro')),
  ativo boolean default true,
  -- comissões em % (ex: 20.00 = 20%)
  comissao_aplicacao_pct numeric(5,2) default 0,
  comissao_manutencao_pct numeric(5,2) default 0,
  created_at timestamptz default now()
);

-- =========================================
-- CLIENTES
-- =========================================
create table public.clientes (
  id bigserial primary key,
  nome text not null,
  telefone text,
  instagram text,
  observacoes text,
  origem_primeira_compra text, -- enum abaixo, mantido no cliente pra histórico
  created_at timestamptz default now(),
  created_by uuid references public.users(id)
);
create index on public.clientes using gin (to_tsvector('portuguese', nome));

-- =========================================
-- SERVIÇOS
-- =========================================
create table public.servicos (
  id bigserial primary key,
  nome text not null,
  codigo text unique not null, -- 'APLICACAO' | 'MANUTENCAO'
  duracao_min int default 60,
  ativo boolean default true
);

-- seed:
-- insert into servicos (nome, codigo, duracao_min) values
--   ('Aplicação de Prótese', 'APLICACAO', 120),
--   ('Manutenção de Prótese', 'MANUTENCAO', 60);

-- =========================================
-- AGENDAMENTOS
-- =========================================
create type origem_lead as enum (
  'META_ADS', 'GOOGLE_ADS',
  'INSTAGRAM_ORGANICO', 'YOUTUBE',
  'INDICACAO', 'RECORRENTE', 'OUTRO'
);

create type status_agendamento as enum (
  'AGENDADO', 'CONFIRMADO', 'REALIZADO', 'NAO_COMPARECEU', 'CANCELADO'
);

create table public.agendamentos (
  id bigserial primary key,
  cliente_id bigint references public.clientes(id) not null,
  servico_id bigint references public.servicos(id) not null,
  executor_id uuid references public.users(id) not null, -- quem vai executar (barbeiro ou Márcio)
  recepcionista_id uuid references public.users(id),     -- quem fez o agendamento
  inicio timestamptz not null,
  fim timestamptz not null,
  origem origem_lead not null,
  origem_detalhe text, -- se origem=OUTRO, ou utm_campaign se automático
  status status_agendamento default 'AGENDADO',
  observacoes text,
  -- valores preenchidos no fechamento:
  valor_protese numeric(10,2),     -- material (só aplicação)
  valor_servico numeric(10,2),     -- valor da aplicação ou manutenção
  pagamento_forma text,
  fechado_at timestamptz,
  fechado_by uuid references public.users(id),
  created_at timestamptz default now()
);
create index on public.agendamentos (inicio);
create index on public.agendamentos (executor_id, inicio);
create index on public.agendamentos (origem);

-- =========================================
-- COMISSÕES (lançamentos individuais)
-- =========================================
create table public.comissoes (
  id bigserial primary key,
  agendamento_id bigint references public.agendamentos(id) on delete cascade,
  user_id uuid references public.users(id),
  papel text not null, -- 'MARCIO_SALAO' | 'EXECUTOR' | 'RECEPCIONISTA' | 'TRAFEGO'
  percentual numeric(5,2) not null,
  valor_base numeric(10,2) not null, -- base de cálculo (valor_servico)
  valor numeric(10,2) not null,
  created_at timestamptz default now()
);
create index on public.comissoes (user_id, created_at);
```

### RLS (Row Level Security)

- `admin` (Dylan, Márcio, esposa): vê tudo, edita tudo
- `recepcionista`: vê todos os agendamentos e clientes, edita agendamentos, não vê comissões de terceiros (só as próprias)
- `barbeiro`: vê só os próprios agendamentos e os próprios lançamentos de comissão

## 2. Engine de comissão

Ao marcar agendamento como `REALIZADO` e preencher `valor_servico`, o app gera automaticamente os lançamentos na tabela `comissoes`:

```typescript
// pseudocódigo do trigger / função de fechamento
function fecharAgendamento(ag: Agendamento) {
  const base = ag.valor_servico // NÃO inclui valor_protese (material)
  const isAplicacao = ag.servico.codigo === 'APLICACAO'
  const executor = getUser(ag.executor_id)
  const recep = getUser(ag.recepcionista_id)
  const traf = getUser('DYLAN_ID')
  const marcio = getUser('MARCIO_ID')

  const pctExec = isAplicacao ? executor.comissao_aplicacao_pct : executor.comissao_manutencao_pct
  const pctRecep = isAplicacao ? recep.comissao_aplicacao_pct : recep.comissao_manutencao_pct
  const pctTraf = ag.origem === 'META_ADS' || ag.origem === 'GOOGLE_ADS'
    ? (isAplicacao ? traf.comissao_aplicacao_pct : traf.comissao_manutencao_pct)
    : 0

  // Se executor foi o próprio Márcio, não duplica
  const execFinal = executor.id === marcio.id ? 0 : pctExec

  const pctMarcio = 100 - execFinal - pctRecep - pctTraf

  return [
    { papel: 'MARCIO_SALAO', user: marcio, pct: pctMarcio },
    { papel: 'EXECUTOR', user: executor, pct: execFinal },
    { papel: 'RECEPCIONISTA', user: recep, pct: pctRecep },
    { papel: 'TRAFEGO', user: traf, pct: pctTraf },
  ]
    .filter(l => l.pct > 0)
    .map(l => ({
      ...l,
      valor_base: base,
      valor: round2(base * l.pct / 100),
    }))
}
```

Implementado como **Postgres function + trigger** `after update on agendamentos when status becomes REALIZADO`, pra garantir consistência mesmo se múltiplos clients atualizarem.

## 3. Telas (mobile-first)

### 3.1 Login
- Tela única, logo dourado sobre preto, campo de e-mail, botão "Enviar link".
- Magic link Supabase (sem senha).

### 3.2 Home por role

**Admin (Dylan, Márcio, esposa):**
- Cards: Agendamentos hoje · Faturamento do mês · Clientes novos do mês · Comissões a pagar
- Botão grande "Nova agenda" (CTA dourado)

**Recepcionista:**
- Agenda da semana (foco)
- Botão grande "+ Novo agendamento"
- Atalhos: Abrir WhatsApp · Buscar cliente

**Barbeiro:**
- Minha agenda hoje + próximos 7 dias
- Lista de comissões do mês (meu ganho)

### 3.3 Agenda

- View **Semana** (default desktop): colunas = dias, linhas = horários, blocos coloridos por executor
- View **Dia** (default mobile): lista por barbeiro em abas
- Clique no bloco → detalhes do agendamento
- Clique em slot vazio → criar agendamento

### 3.4 Novo agendamento (formulário)

```
[Serviço]       (•) Aplicação     ( ) Manutenção
[Cliente]       autocomplete ou [+ Novo cliente]
[Executor]      Márcio · Barbeiro 1 · Barbeiro 2 · Barbeiro 3
[Data/hora]     date + time picker
[Duração]       auto (120min aplicação, 60min manutenção)
[Origem]        dropdown obrigatório (enum)
[Observações]   texto livre
```

### 3.5 Fechamento do agendamento

Quando cliente atende, botão "Fechar agendamento":

```
[Status]               Realizado · Não compareceu
[Valor da prótese]     R$ _____ (só se aplicação)
[Valor do serviço]     R$ _____  (base da comissão)
[Forma de pagamento]   PIX · Cartão · Dinheiro · Cartão parcelado
```

Ao salvar: gera lançamentos em `comissoes` (trigger).

### 3.6 Cliente (ficha)

- Dados + histórico de agendamentos + total gasto + origem da primeira compra
- Botão "WhatsApp" (link `wa.me/55...`)

### 3.7 Relatórios

- **Mensal consolidado** (default mês atual, filtro por período):
  - Faturamento total (serviços) + receita de próteses (material)
  - Quebra por serviço (aplicação × manutenção)
  - Quebra por origem (destaque pra META_ADS + GOOGLE_ADS = "tráfego pago")
  - Ranking de executor
- **Comissões a pagar** (por pessoa, por mês, com lista de agendamentos):
  - Dylan (só origens pagas)
  - Recepcionista
  - Cada barbeiro
- **Exportar** em CSV/XLSX com 1 clique

## 4. Timeline de execução (7 dias)

Ver detalhado em `00_Planejamento/ROADMAP.md`. Resumo:

| Dia | Entrega |
|---|---|
| 1 (seg 27/04) | Scaffold + schema + seed |
| 2 (ter 28/04) | Auth + layout + guards |
| 3 (qua 29/04) | Agenda semana/dia + CRUD |
| 4 (qui 30/04) | Clientes + origem |
| 5 (sex 01/05) | Fechamento + engine comissão |
| 6 (sáb 02/05) | Relatórios + export |
| 7 (dom 03/05) | Deploy + DNS + pixel + e2e |

## 5. Infra e deploy

- **Vercel:** projeto conectado ao GitHub, deploy automático no `main`
- **Supabase:** projeto dedicado, backup diário (free tier já inclui 7 dias)
- **DNS:** `app.marciogonzalez.com.br` → CNAME pra Vercel
- **SSL:** Vercel auto (Let's Encrypt)
- **Pixel Meta:** colado em `<head>` via Next.js `<Script>` strategy="afterInteractive"
- **CAPI:** endpoint `/api/meta-capi` recebe eventos `Lead` (novo agendamento com origem = META_ADS) e `Purchase` (fechamento) e envia pro Meta via server-side

## 6. Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_PIXEL_ID=
META_CAPI_TOKEN=
META_TEST_EVENT_CODE= # só em dev
```

## 7. Decisões de UX pra priorizar

1. **Origem obrigatória** na criação do agendamento — sem isso não salva.
2. **Valor do serviço separado do valor da prótese** — comissão só sobre o serviço.
3. **Botão de fechamento** em destaque na view do dia (recepcionista não esquece).
4. **PWA instalável** — manifest + ícone dourado, "Adicionar à tela inicial" no primeiro login.
5. **Dark mode fixo** — respeita identidade, economia de bateria, contraste com botões dourados.

## 8. O que NÃO entra no MVP (ficam pro Sprint 3)

- Lembrete automático WhatsApp
- Integração Google Calendar
- Pagamento integrado (Stripe/Mercado Pago)
- Multi-unidade (quando abrir 2º salão)
- App mobile nativo (PWA atende por enquanto)
