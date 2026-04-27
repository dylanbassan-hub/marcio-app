# Setup do App — Márcio Gonzalez Agendamento

Stack: Next.js 15 · Supabase · Tailwind · shadcn/ui · Vercel

---

## 1. Pré-requisitos

- Node.js ≥ 20
- Conta no [Supabase](https://supabase.com) (free tier)
- Conta no [Vercel](https://vercel.com) (free tier)
- Domínio `marciogonzalez.com.br` com acesso ao DNS

---

## 2. Setup do banco (Supabase)

### 2.1 Criar projeto
1. Acesse supabase.com → New project
2. Nome: `marcio-gonzalez-salao`
3. Região: `South America (São Paulo)` — sa-east-1
4. Senha forte → guarde em local seguro

### 2.2 Rodar a migration
1. Abra o **SQL Editor** no painel do Supabase
2. Cole o conteúdo de `supabase/migrations/001_schema.sql`
3. Execute → deve rodar sem erros

### 2.3 Criar os 7 usuários no Auth
1. Authentication → Users → Add user → Create new user
2. Crie um usuário pra cada pessoa (e-mail real — eles vão receber magic link)
3. Usuários necessários:
   - Dylan Bassan (admin)
   - Márcio Gonzalez (admin)
   - Esposa do Márcio (admin)
   - Recepcionista (recepcionista)
   - Barbeiro 1 (barbeiro)
   - Barbeiro 2 (barbeiro)
   - Barbeiro 3 (barbeiro)

### 2.4 Rodar o seed
1. Após criar os usuários, vá em Authentication → Users
2. Clique em cada usuário e copie o UUID
3. Abra `supabase/seed.sql` e substitua os UUIDs placeholder pelos reais
4. Execute o seed no SQL Editor

### 2.5 Pegar as chaves
Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca expor no client)

---

## 3. Setup local

```bash
# Na pasta 01_App/marcio-app/
npm install

# Copiar e preencher variáveis
cp .env.local.example .env.local
# Editar .env.local com as chaves do Supabase

# Rodar em dev
npm run dev
# → http://localhost:3000
```

---

## 4. Deploy Vercel

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Deploy
vercel --prod

# Configurar variáveis de ambiente no painel Vercel:
# Settings → Environment Variables → adicionar todas do .env.local
```

### 4.1 DNS — `app.marciogonzalez.com.br`
1. No painel Vercel → seu projeto → Settings → Domains
2. Adicionar `app.marciogonzalez.com.br`
3. No DNS do domínio, criar CNAME:
   - Nome: `app`
   - Valor: `cname.vercel-dns.com`
4. Aguardar propagação (2-10 minutos)

### 4.2 URL de redirect do Supabase
No Supabase → Authentication → URL Configuration:
- Site URL: `https://app.marciogonzalez.com.br`
- Redirect URLs: `https://app.marciogonzalez.com.br/auth/callback`

---

## 5. PWA — Adicionar à tela inicial

A recepcionista precisa instalar o PWA:
1. Abrir `https://app.marciogonzalez.com.br` no celular (Chrome Android ou Safari iOS)
2. Chrome: menu ⋮ → "Adicionar à tela inicial"
3. iOS Safari: Compartilhar → "Adicionar à Tela de Início"

Ícones PWA (gerar em [realfavicongenerator.net](https://realfavicongenerator.net)):
- `public/icon-192.png` — 192×192px, fundo preto `#080808`, logo dourado
- `public/icon-512.png` — 512×512px, mesma identidade

---

## 6. Pixel Meta + CAPI

Ver `02_Tráfego/ESTRATEGIA_META.md` seção 2.
O endpoint CAPI está em `/api/meta-capi` — implementar no Dia 7.

---

## 7. Estrutura de pastas

```
marcio-app/
├── public/                  PWA assets
├── supabase/
│   ├── migrations/001_schema.sql  Schema + RLS + triggers
│   └── seed.sql                   7 usuários + dados iniciais
├── src/
│   ├── app/
│   │   ├── layout.tsx            Root layout (fontes + dark theme)
│   │   ├── page.tsx              Redirect: / → /dashboard ou /login
│   │   ├── login/page.tsx        Tela de magic link
│   │   ├── auth/callback/route.ts Handler do magic link
│   │   └── dashboard/page.tsx    Home (placeholder → expandir Dia 2)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         Browser client (use client)
│   │   │   └── server.ts         Server client + admin client
│   │   ├── types/database.ts     Tipos TS do schema
│   │   └── utils.ts              cn(), formatBRL(), whatsappLink()
│   ├── components/ui/            shadcn/ui components (adicionar com npx shadcn add)
│   ├── hooks/                    Custom hooks (ex: useUser, useAgendamentos)
│   └── middleware.ts             Auth guard — redireciona não-autenticados
├── .env.local.example
├── components.json              Config shadcn/ui
├── tailwind.config.ts           Brand colors (gold, brand-black, offwhite)
└── README_SETUP.md              Este arquivo
```

---

## 8. Próximos passos (Dia 2)

- Adicionar componentes shadcn: `npx shadcn@latest add button input select dialog toast`
- Criar `src/hooks/useUser.ts` — hook pra pegar profile do usuário logado
- Criar `src/app/dashboard/layout.tsx` — sidebar/navbar por role
- Views por role: admin dashboard, recepcionista agenda, barbeiro minha-agenda
