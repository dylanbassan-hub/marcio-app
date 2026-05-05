'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-dvh bg-brand-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-800 border border-gold/30 flex items-center justify-center">
            <span className="font-syne font-bold text-gold text-2xl">MG</span>
          </div>
          <div className="text-center">
            <h1 className="font-syne font-semibold text-xl text-offwhite">
              Márcio Gonzalez
            </h1>
            <p className="text-offwhite/50 text-sm mt-0.5">
              Sistema de agendamento
            </p>
          </div>
        </div>

        <div className="card-dark space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-offwhite/70">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input-dark w-full"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm text-offwhite/70">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-dark w-full"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
