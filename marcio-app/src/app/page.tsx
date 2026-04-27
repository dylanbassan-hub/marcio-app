import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root "/" — redireciona pra dashboard se logado, login se não
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
