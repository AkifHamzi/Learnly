import { NavLink, Outlet } from 'react-router-dom'
import { Home, Layout, Bookmark, LayoutDashboard, Settings, HelpCircle, PlusCircle, Upload } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function AppLayout() {
  const navigate = useNavigate()
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const [profile, setProfile] = useState(null)

useEffect(() => {
  const getProfile = async () => {
   

    const { data: { user } } = await supabase.auth.getUser()
  console.log('User ID:', user?.id)
  
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  console.log('Profile data:', data)
  console.log('Profile error:', error)
  setProfile(data)
  }
  getProfile()
}, [])

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Sidebar */}
      <div style={{
        width: 220, background: '#fff', borderRight: '1px solid #eee',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
        justifyContent: 'space-between'
      }}>
        
        {/* Top */}
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#6C63FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 700
            }}>L</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Learnly</div>
              <div style={{ fontSize: 11, color: '#999' }}>Learning Explorer</div>
            </div>
          </div>

          {/* New Board Button */}
          <button onClick={() => navigate('/whiteboards')} style={{
            width: '100%', padding: '0.6rem', background: '#6C63FF',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6, fontSize: 14,
            marginBottom: '1.5rem', fontWeight: 500
          }}>
            <PlusCircle size={16} /> New Board
          </button>

          {/* Nav Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { to: '/', icon: <Home size={18} />, label: 'Home' },
              { to: '/whiteboards', icon: <Layout size={18} />, label: 'Whiteboards' },
              { to: '/saved', icon: <Bookmark size={18} />, label: 'Saved' },
              { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
              ...(profile?.role === 'teacher' ? [
  { to: '/upload', icon: <Upload size={18} />, label: 'Upload Video' }
] : []),
            ].map(({ to, icon, label }) => (
              <NavLink key={to} to={to} end style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.6rem 0.75rem', borderRadius: 8,
                textDecoration: 'none', fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#6C63FF' : '#444',
                background: isActive ? '#F0EFFE' : 'transparent'
              })}>
                {icon} {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/settings" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.6rem 0.75rem', borderRadius: 8,
            textDecoration: 'none', fontSize: 14, color: '#444'
          }}>
            <Settings size={18} /> Settings
          </NavLink>
          <NavLink to="/help" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.6rem 0.75rem', borderRadius: 8,
            textDecoration: 'none', fontSize: 14, color: '#444'
          }}>
            <HelpCircle size={18} /> Help
          </NavLink>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.6rem 0.75rem', borderRadius: 8,
            fontSize: 14, color: '#444', background: 'none',
            border: 'none', cursor: 'pointer', width: '100%'
          }}>
            Log out
          </button>
        </div>

      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#F8F8FC' }}>
        <Outlet />
      </div>

    </div>
  )
}