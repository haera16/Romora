import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Decides where a logged-in user belongs, based on whether they have a profile yet.
//   mode="needs-profile"     pages for existing users (e.g. /explore).
//                            No profile yet -> sent to /create-profile.
//   mode="needs-no-profile"  the create-profile page itself.
//                            Profile already exists -> sent to /explore.
export default function ProfileGate({ mode, children }) {
  const [state, setState] = useState('loading') // loading | anon | has | none | error

  useEffect(() => {
    let ignore = false
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!ignore) setState('anon'); return }
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (ignore) return
      setState(error ? 'error' : data ? 'has' : 'none')
    }
    check()
    return () => { ignore = true }
  }, [])

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500">Loading…</div>
  }
  if (state === 'anon') return <Navigate to="/login" replace />
  // If the check itself failed, show the page rather than risk a redirect loop.
  if (state === 'error') return children
  if (mode === 'needs-profile') return state === 'has' ? children : <Navigate to="/create-profile" replace />
  return state === 'has' ? <Navigate to="/explore" replace /> : children
}