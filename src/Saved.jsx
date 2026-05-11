import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayCircle, Heart } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Saved() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('likes')
        .select('created_at, video:videos(id, title, subject, storage_url, teacher:profiles!videos_teacher_id_fkey(full_name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setVideos((data || []).map(l => l.video).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
        Saved Videos
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 15 }}>
        Videos you've liked
      </p>

      {loading ? (
        <div style={{ color: '#666' }}>Loading...</div>
      ) : videos.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 16, padding: '3rem',
          textAlign: 'center', border: '1px solid #f0f0f0'
        }}>
          <Heart size={40} color="#FF3B5C" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>No saved videos yet</h3>
          <p style={{ color: '#666', fontSize: 14 }}>
            Like videos in the feed and they'll appear here.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20
        }}>
          {videos.map(v => (
            <div key={v.id} onClick={() => navigate('/')} style={{
              background: 'white', borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{
                position: 'relative', aspectRatio: '4/5', background: '#000'
              }}>
                <video src={v.storage_url} muted style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  position: 'absolute', inset: 0
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <PlayCircle size={30} color="#1a1a1a" />
                  </div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem' }}>
                <div style={{
                  display: 'inline-block', fontSize: 10, fontWeight: 600,
                  background: '#FBBF24', color: '#1a1a1a',
                  padding: '2px 8px', borderRadius: 4, marginBottom: 6
                }}>
                  {v.subject?.toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>
                  {v.title}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {v.teacher?.full_name || 'Teacher'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}