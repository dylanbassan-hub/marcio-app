'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-brand-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          {/* Troque pelo componente <Image> com o logo real depois */}
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

        {/* Card de login */}
        <div className="card-dark space-y-6">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-2xl">✉️</div>
              <p className="text-offwhite font-medium">Link enviado!</p>
              <p className="text-offwhite/60 text-sm">
                Verifique seu e-mail <strong className="text-offwhite">{email}</strong>{' '}
                e clique no link para entrar.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-gold text-sm hover:underline"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm text-offwhite/70"
                >
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

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Entrar com magic link'}
              </button>

              <p className="text-offwhite/40 text-xs text-center">
                Você receberá um link de acesso no e-mail cadastrado.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
