import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAuth = async () => {
    setLoading(true)
    setError(null)
if (password.length < 8) {
  setError('Password must be at least 8 characters')
  setLoading(false)
  return
}
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      // Create profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        full_name: fullName
      })

      // If student, create their board
      if (role === 'student') {
        await supabase.from('boards').insert({ owner_id: data.user.id })
      }

    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Learnly</h1>
      <h2 style={{ marginBottom: '1rem' }}>{isSignUp ? 'Sign Up' : 'Log In'}</h2>

      {isSignUp && (
        <>
          <input
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={inputStyle}
          />
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </>
      )}

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={handleAuth} style={buttonStyle} disabled={loading}>
        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
      </button>

      <p style={{ marginTop: '1rem', cursor: 'pointer', color: '#666' }}
        onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
      </p>
    </div>
  )
}

const inputStyle = {
  display: 'block', width: '100%', padding: '0.75rem',
  marginBottom: '1rem', borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box'
}

const buttonStyle = {
  width: '100%', padding: '0.75rem', background: '#6C63FF',
  color: 'white', border: 'none', borderRadius: 8,
  fontSize: 16, cursor: 'pointer'
}