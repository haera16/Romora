import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Logged in successfully!')
      setTimeout(() => navigate('/create-profile'), 3000)
      //Later: redirect to profile dashboard setup
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <h1 className="text-red-500 text-3xl">Tailwind test</h1>
      <input type="email" placeholder="KIIT email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Log in</button>
      {message && <p>{message}</p>}
    </form>
  )
}

export default Login