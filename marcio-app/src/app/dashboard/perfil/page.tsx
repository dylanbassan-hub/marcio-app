import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'

type PerfilUsuario = {
  id: string
  nome: string
  email: string | null
  role: string
  telefone: string | null
  ativo: boolean
  is_trafego: boolean | null
  comissao_aplicacao_valor: number | null
  comissao_manutencao_valor: number | null
}

export default async function PerfilPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as PerfilUsuario | null

  if (!profile) redirect('/login')

  const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrador',
    recepcionista: 'Recepcionista',
    barbeiro: 'Barbeiro',
  }

  const iniciais = profile.nome
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const comissaoAplicacao = Number(profile.comissao_aplicacao_valor) || 0
  const comissaoManutencao = Number(profile.comissao_manutencao_valor) || 0

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="font-syne font-bold text-xl text-gold">Meu perfil</h1>
      </div>

      {/* Dados do perfil */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-700 border border-gold/30 flex items-center justify-center font-syne font-bold text-gold text-lg">
              {iniciais}
            </div>

            <div>
              <p className="font-semibold text-offwhite">{profile.nome}</p>
              <p className="text-sm text-offwhite/50">
                {ROLE_LABEL[profile.role] ?? profile.role}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gold/10">
            <Row label="E-mail" value={user.email ?? profile.email ?? '—'} />
            {profile.telefone && <Row label="Telefone" value={profile.telefone} />}
            <Row label="Acesso" value={profile.ativo ? 'Ativo' : 'Inativo'} />
          </div>
        </CardContent>
      </Card>

      {/* Minhas comissões configuradas */}
      {(comissaoAplicacao > 0 || comissaoManutencao > 0) && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-offwhite/40 uppercase tracking-wide">Minhas comissões</p>
            <Row label="Por aplicação" value={formatBRL(comissaoAplicacao)} />
            <Row label="Por manutenção" value={formatBRL(comissaoManutencao)} />

            {profile.is_trafego && (
              <p className="text-xs text-gold/60 bg-gold/10 px-2 py-1 rounded">
                Comissão incide apenas em origens de tráfego pago (Meta Ads / Google Ads).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sair */}
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="w-full py-2.5 rounded-md border border-red-800/40 text-red-400/80 text-sm hover:bg-red-900/20 hover:text-red-400 transition-colors"
        >
          Sair da conta
        </button>
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-offwhite/50">{label}</span>
      <span className="text-sm text-offwhite">{value}</span>
    </div>
  )
}