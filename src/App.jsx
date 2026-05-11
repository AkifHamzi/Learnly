import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Layout from './Layout'
import TeacherUpload from './TeacherUpload'
import Feed from './Feed'
import Dashboard from './Dashboard'
import Whiteboards from './Whiteboards'
import Whiteboard from './Whiteboard'
import Saved from './Saved'
import Settings from './Settings'
import Help from './Help'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Auth />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Feed />} />
          <Route path="upload" element={<TeacherUpload />} />
        <Route path="whiteboards" element={<Whiteboards />} />
<Route path="whiteboards/:id" element={<Whiteboard />} />
          <Route path="saved" element={<Saved />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  )
}