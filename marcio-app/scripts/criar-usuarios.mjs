// ================================================
// Script: criar novos usuários no Supabase Auth + public.users
// Rodar: node scripts/criar-usuarios.mjs
// ================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nntuaobqtfugcyhiogfk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udHVhb2JxdGZ1Z2N5aGlvZ2ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzMTM4NSwiZXhwIjoyMDkyODA3Mzg1fQ.o_F_RZP6tjRM2kern_w6CgR6YDU52alMGiIoZpVV2p4'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const SENHA = 'MG2026*'

const novosUsuarios = [
  // Barbeiros
  {
    email: 'chris-bassi@hotmail.com',
    nome: 'Bob',
    role: 'barbeiro',
    comissao_aplicacao_valor: 200.00,
    comissao_manutencao_valor: 200.00,
    is_marcio: false,
    is_trafego: false,
  },
  {
    email: 'Bruno.novelli19@hotmail.com',
    nome: 'Bruno',
    role: 'barbeiro',
    comissao_aplicacao_valor: 200.00,
    comissao_manutencao_valor: 200.00,
    is_marcio: false,
    is_trafego: false,
  },
  {
    email: 'juniorfranb@icloud.com',
    nome: 'David',
    role: 'barbeiro',
    comissao_aplicacao_valor: 200.00,
    comissao_manutencao_valor: 200.00,
    is_marcio: false,
    is_trafego: false,
  },
  // Recepcionista
  {
    email: 'fraaviu@gmail.com',
    nome: 'Flávio',
    role: 'recepcionista',
    comissao_aplicacao_valor: 90.00,
    comissao_manutencao_valor: 90.00,
    is_marcio: false,
    is_trafego: false,
  },
]

async function criarUsuario(usuario) {
  const { email, nome, role, comissao_aplicacao_valor, comissao_manutencao_valor, is_marcio, is_trafego } = usuario

  console.log(`\n→ Criando: ${nome} (${email}) [${role}]`)

  // 1. Criar no Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true, // já confirma o e-mail automaticamente
  })

  if (authError) {
    console.error(`  ✗ Erro no Auth: ${authError.message}`)
    return
  }

  const uuid = authData.user.id
  console.log(`  ✓ Auth criado — UUID: ${uuid}`)

  // 2. Inserir no public.users
  const { error: dbError } = await supabase
    .from('users')
    .insert({
      id: uuid,
      nome,
      role,
      comissao_aplicacao_valor,
      comissao_manutencao_valor,
      is_marcio,
      is_trafego,
      ativo: true,
    })

  if (dbError) {
    console.error(`  ✗ Erro no DB: ${dbError.message}`)
    return
  }

  console.log(`  ✓ Inserido em public.users`)
}

async function main() {
  console.log('=== Criando usuários Márcio App ===')

  for (const usuario of novosUsuarios) {
    await criarUsuario(usuario)
  }

  console.log('\n=== Concluído ===')
  console.log('Todos os usuários podem fazer login em app.marciogonzalez.com.br com a senha MG2026*')
}

main().catch(console.error)
