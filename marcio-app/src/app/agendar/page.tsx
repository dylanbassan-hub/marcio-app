import { createClient } from '@supabase/supabase-js'
import { AgendamentoPublicoWizard } from './_wizard'

// Busca dados sem RLS para página pública
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const metadata = {
  title: 'Agendar — Márcio Gonzalez Prótese Capilar',
  description: 'Agende seu horário de aplicação ou manutenção de prótese capilar com o Márcio Gonzalez.',
}

export default async function AgendarPage() {
  const [{ data: servicos }, { data: executores }] = await Promise.all([
    supabaseAdmin.from('servicos').select('id, nome, codigo, duracao_min').order('id'),
    supabaseAdmin
      .from('users')
      .select('id, nome')
      .eq('role', 'BARBEIRO')
      .eq('ativo', true)
      .order('nome'),
  ])

  return (
    <main className="min-h-screen bg-[#080808] flex flex-col items-center justify-start px-4 py-10">
      {/* Logo / Header */}
      <div className="text-center mb-8">
        <p className="text-xs text-[#d8b64d]/60 uppercase tracking-[0.2em] mb-2">Prótese Capilar</p>
        <h1 className="font-syne text-2xl font-bold text-[#d8b64d] leading-tight">
          Márcio Gonzalez
        </h1>
        <p className="text-sm text-white/50 mt-1">Rua dos Trilhos, 1522 — Mooca, São Paulo</p>
      </div>

      <div className="w-full max-w-md">
        <AgendamentoPublicoWizard
          servicos={servicos ?? []}
          executores={executores ?? []}
        />
      </div>

      <p className="mt-10 text-xs text-white/20 text-center">
        Powered by EntMídia · Sistema de agendamento
      </p>
    </main>
  )
}
