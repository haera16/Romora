import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()

    if (!email.endsWith('@kiit.ac.in')) {
      setMessage('Please use your KIIT email address.')
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Signup successful! Check your email to confirm.')
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <form onSubmit={handleSignup}>
      <input
        type="email"
        placeholder="KIIT email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign up</button>
      {message && <p>{message}</p>}
    </form>
  )
}

export default Signup