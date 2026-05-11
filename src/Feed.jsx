import { useState, useEffect, useRef } from 'react'
import { Heart, Bookmark, MessageCircle, Search, Bell, History, Volume2, VolumeX } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Feed() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [likedIds, setLikedIds] = useState(new Set())
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)

      // Fetch videos with teacher name + like count via a join
      const { data: vids, error } = await supabase
        .from('videos')
        .select(`
          id, title, subject, storage_url, created_at,
          teacher:profiles!videos_teacher_id_fkey ( full_name ),
          likes ( count )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Feed load error:', error)
        setLoading(false)
        return
      }

      // Fetch which of these the current user has liked
      const { data: myLikes, error: likesError } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', user.id)

        console.log('My likes from DB:', myLikes)
        console.log('Likes error:', likesError)

      setLikedIds(new Set((myLikes || []).map(l => l.video_id)))
      setVideos(vids || [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleLike = async (videoId) => {
    const isLiked = likedIds.has(videoId)
    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(videoId) : next.add(videoId)
      return next
    })
    setVideos(prev => prev.map(v => {
      if (v.id !== videoId) return v
      const currentCount = v.likes?.[0]?.count ?? 0
      return { ...v, likes: [{ count: currentCount + (isLiked ? -1 : 1) }] }
    }))

    if (isLiked) {
      await supabase.from('likes').delete().match({ user_id: userId, video_id: videoId })
    } else {
      await supabase.from('likes').insert({ user_id: userId, video_id: videoId })
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading feed...</div>
  }

  if (videos.length === 0) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#666' }}>
        <h3 style={{ marginBottom: 8 }}>No videos yet</h3>
        <p style={{ fontSize: 14 }}>Check back soon — teachers are uploading content.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
          <Search size={16} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: '#999'
          }} />
          <input
            placeholder="Search lessons, topics..."
            style={{
              width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              borderRadius: 999, border: '1px solid #eee',
              background: '#F5F4FB', fontSize: 14, outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Bell size={20} style={{ color: '#666', cursor: 'pointer' }} />
          <History size={20} style={{ color: '#666', cursor: 'pointer' }} />
          <button style={goLiveStyle}>Go Live</button>
          <div style={avatarStyle}>A</div>
        </div>
      </div>

      {/* Feed */}
      <div style={feedContainerStyle}>
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            isLiked={likedIds.has(video.id)}
            onToggleLike={() => toggleLike(video.id)}
            muted={muted}
            setMuted={setMuted}
          />
        ))}
      </div>
    </div>
  )
}

function VideoCard({ video, isLiked, onToggleLike, muted, setMuted }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {})
        } else {
          videoRef.current.pause()
        }
      },
      { threshold: 0.6 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) videoRef.current.play()
    else videoRef.current.pause()
  }

  const likeCount = video.likes?.[0]?.count ?? 0

  return (
    <div ref={containerRef} style={cardWrapperStyle}>
      <div style={videoWrapperStyle}>
        <video
          ref={videoRef}
          src={video.storage_url}
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
          style={videoStyle}
        />

        {/* Bottom-left: subject + duration */}
        <div style={subjectPillStyle}>{video.subject?.toUpperCase()}</div>

        {/* Bottom-left lower: title + teacher */}
        <div style={metaOverlayStyle}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            {video.title}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {video.teacher?.full_name || 'Teacher'}
          </div>
        </div>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted(m => !m)}
          style={muteButtonStyle}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Right-side actions */}
        <div style={actionsColumnStyle}>
          <ActionButton
            icon={<Heart size={24} fill={isLiked ? '#FF3B5C' : 'none'} color={isLiked ? '#FF3B5C' : 'white'} />}
            label={likeCount}
            onClick={onToggleLike}
          />
          <ActionButton
            icon={<Bookmark size={24} color="white" />}
            label="Save"
            onClick={() => alert('Save to whiteboard — coming soon')}
          />
          <ActionButton
            icon={<MessageCircle size={24} color="white" />}
            label="0"
            onClick={() => alert('Comments — coming soon')}
          />
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={actionButtonStyle}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div style={{ color: 'white', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
        {label}
      </div>
    </button>
  )
}

// --- styles ---

const topBarStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '1rem 1.5rem', background: 'white',
  borderBottom: '1px solid #eee', gap: 16, position: 'sticky',
  top: 0, zIndex: 10
}

const goLiveStyle = {
  padding: '0.5rem 1rem', background: '#10B981', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
  cursor: 'pointer'
}

const avatarStyle = {
  width: 36, height: 36, borderRadius: '50%', background: '#333',
  color: 'white', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: 14, fontWeight: 600
}

const feedContainerStyle = {
  height: 'calc(100vh - 73px)',
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  scrollbarWidth: 'none'
}

const cardWrapperStyle = {
  height: 'calc(100vh - 73px)',
  scrollSnapAlign: 'start',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1rem'
}

const videoWrapperStyle = {
  position: 'relative',
  height: '100%',
  aspectRatio: '9 / 16',
  maxHeight: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#000',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
}

const videoStyle = {
  width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'
}

const subjectPillStyle = {
  position: 'absolute', bottom: 16, left: 16,
  background: '#FBBF24', color: '#1a1a1a',
  padding: '4px 10px', borderRadius: 4,
  fontSize: 11, fontWeight: 700, letterSpacing: 0.5
}

const metaOverlayStyle = {
  position: 'absolute', bottom: 50, left: 16, right: 80,
  color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.6)'
}

const muteButtonStyle = {
  position: 'absolute', top: 16, right: 16,
  width: 36, height: 36, borderRadius: '50%',
  background: 'rgba(0,0,0,0.4)', border: 'none',
  color: 'white', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const actionsColumnStyle = {
  position: 'absolute', right: 16, bottom: 80,
  display: 'flex', flexDirection: 'column', gap: 16
}

const actionButtonStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: 0
}