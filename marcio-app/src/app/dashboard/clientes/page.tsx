import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { BadgeOrigem } from '@/components/ui/badge'
import { whatsappLink } from '@/lib/utils'
import { Users, MessageCircle, Search } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

type ProfileClientes = {
  role: string
}

type ClienteLista = {
  id: number
  nome: string
  telefone: string | null
  instagram: string | null
  origem_primeira_compra: string | null
  created_at: string
}

export default async function ClientesPage({ searchParams }: PageProps) {
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

  const profile = profileData as ProfileClientes | null

  if (!profile || profile.role === 'barbeiro') redirect('/dashboard')

  const { q } = await searchParams

  let query = supabase
    .from('clientes')
    .select('id, nome, telefone, instagram, origem_primeira_compra, created_at')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (q && q.trim()) {
    query = query.ilike('nome', `%${q}%`)
  }

  const { data: clientesData } = await query
  const clientes = (clientesData ?? []) as ClienteLista[]

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-gold/60" />
          <h1 className="font-syne font-bold text-xl text-gold">Clientes</h1>
        </div>
        <span className="text-xs text-offwhite/40">{clientes.length} cadastrados</span>
      </div>

      {/* Busca */}
      <form method="GET" className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-offwhite/30" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome…"
          className="flex h-9 w-full rounded-md border border-gold/20 bg-brand-800 pl-9 pr-3 py-1 text-sm text-offwhite placeholder:text-offwhite/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60"
        />
      </form>

      {/* Lista */}
      {!clientes.length ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-offwhite/40 text-sm">
              {q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clientes.map((c) => (
            <Link key={c.id} href={`/dashboard/clientes/${c.id}`}>
              <Card className="hover:border-gold/40 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-offwhite font-medium text-sm truncate">{c.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.telefone && (
                          <span className="text-offwhite/40 text-xs truncate">{c.telefone}</span>
                        )}
                        {c.origem_primeira_compra && (
                          <BadgeOrigem origem={c.origem_primeira_compra as any} />
                        )}
                      </div>
                    </div>

                    {c.telefone && (
                      <a
                        href={whatsappLink(c.telefone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-400/60 hover:text-emerald-400 transition-colors shrink-0"
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}