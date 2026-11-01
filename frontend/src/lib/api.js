import { supabase } from '../supabaseClient'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Asks the backend to score the logged-in user against everyone right now.
// Returns true on success, false if the backend is off, slow or errors (Explore then falls back to estimates).
// A sleeping free-tier backend needs about a minute to wake up, so the wait is generous.
export async function refreshMyMatches() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60000)
  try {
    const res = await fetch(`${API}/matches/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// Safety net: asks the backend to write any "Why you match" text that is still missing.
// Fire and forget. Explore keeps checking for the text as it arrives.
export async function explainMyMatches() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60000)
  try {
    const res = await fetch(`${API}/matches/explain`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}