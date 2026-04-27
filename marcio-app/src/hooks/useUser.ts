'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRow } from '@/lib/types/database'

export function useUser() {
  const [user, setUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser || !mounted) { setLoading(false); return }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (mounted) {
        setUser(data ?? null)
        setLoading(false)
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const isAdmin        = user?.role === 'admin'
  const isRecep        = user?.role === 'recepcionista'
  const isBarbeiro     = user?.role === 'barbeiro'
  const isMarcio       = user?.is_marcio ?? false
  const isTrafego      = user?.is_trafego ?? false

  return { user, loading, isAdmin, isRecep, isBarbeiro, isMarcio, isTrafego }
}
