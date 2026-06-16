import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NovaConversaQualificadaForm } from './_form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type ProfileConversaQualificada = {
  role: string
}

export default async function NovaConversaQualificadaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileConversaQualificada | null

  // Só quem fala com o cliente no WhatsApp marca isso — admin e recepcionista
  if (!profile || profile.role === 'barbeiro') {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-offwhite/50 hover:text-offwhite"
        >
          <ChevronLeft size={15} />
          Voltar
        </Link>
      </div>

      <div>
        <h1 className="font-syne font-bold text-xl text-gold">Conversa qualificada</h1>
        <p className="text-offwhite/50 text-sm mt-0.5">
          Marque aqui toda conversa que você considera uma candidata de verdade —
          mesmo critério do 🔥 que você já usa. Isso ainda não é um agendamento.
        </p>
      </div>

      <NovaConversaQualificadaForm createdBy={user.id} />
    </div>
  )
}
