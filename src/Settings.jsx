import { useState, useEffect } from 'react'
import { User, LogOut } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user.email)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  const handleLogout = () => supabase.auth.signOut()

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 700 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
        Settings
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 15 }}>
        Your account information
      </p>

      <div style={{
        background: 'white', borderRadius: 16, padding: '1.75rem',
        border: '1px solid #f0f0f0', marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#6C63FF', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700
          }}>
            {profile?.full_name?.[0]?.toUpperCase() || <User size={28} />}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>
              {profile?.full_name || 'Loading...'}
            </div>
            <div style={{
              display: 'inline-block', fontSize: 11, fontWeight: 600,
              background: '#F0EFFE', color: '#6C63FF',
              padding: '2px 8px', borderRadius: 4, marginTop: 4,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              {profile?.role}
            </div>
          </div>
        </div>

        <Row label="Email" value={email} />
        <Row label="Account type" value={profile?.role === 'teacher' ? 'Teacher' : 'Student'} />
        <Row label="Member since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} last />
      </div>

      <button onClick={handleLogout} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '0.75rem 1.25rem', background: '#FEF2F2',
        color: '#991B1B', border: '1px solid #FCA5A5',
        borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer'
      }}>
        <LogOut size={16} /> Log out
      </button>
    </div>
  )
}

function Row({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '0.85rem 0',
      borderBottom: last ? 'none' : '1px solid #f0f0f0'
    }}>
      <span style={{ color: '#666', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  )
}