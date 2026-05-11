import { useState, useEffect } from 'react'
import { Flame, Trophy, Edit3, PlayCircle, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    boardsCreated: 0,
    videosLiked: 0,
    daysActiveThisWeek: 0,
    likesThisWeek: 0,
    boardsThisWeek: 0
  })
  const [boards, setBoards] = useState([])
  const [savedVideos, setSavedVideos] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Start of this week (Monday 00:00)
      const now = new Date()
      const day = now.getDay() // 0 = Sunday
      const diffToMonday = day === 0 ? 6 : day - 1
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - diffToMonday)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartIso = weekStart.toISOString()

      // Boards owned by user (count + recent list)
      const { data: ownedBoards, count: boardsCount } = await supabase
        .from('boards')
        .select('id, title, updated_at, owner_id', { count: 'exact' })
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(4)

      // Boards created this week
      const { count: boardsThisWeekCount } = await supabase
        .from('boards')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('updated_at', weekStartIso)

      // For each board, count members (separate query because Supabase counts in joins are awkward)
      const boardsWithMembers = await Promise.all(
        (ownedBoards || []).map(async (b) => {
          const { count } = await supabase
            .from('board_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('board_id', b.id)
          return { ...b, memberCount: count || 0 }
        })
      )
      setBoards(boardsWithMembers)

      // Likes — total count
      const { count: likesTotal } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Likes this week — for "days active" + "this week" summary
      const { data: weekLikes } = await supabase
        .from('likes')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekStartIso)

      const distinctDays = new Set(
        (weekLikes || []).map(l => new Date(l.created_at).toDateString())
      )

      // Recent liked videos for "Saved Videos" section
      const { data: recentLikes } = await supabase
        .from('likes')
        .select(`
          created_at,
          video:videos (
            id, title, subject, storage_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)

      setSavedVideos((recentLikes || []).map(l => l.video).filter(Boolean))

      setStats({
        boardsCreated: boardsCount || 0,
        videosLiked: likesTotal || 0,
        daysActiveThisWeek: distinctDays.size,
        likesThisWeek: weekLikes?.length || 0,
        boardsThisWeek: boardsThisWeekCount || 0
      })

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div style={{ padding: '2rem', color: '#666' }}>Loading dashboard...</div>
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const weekActivityPct = Math.min(100, Math.round((stats.daysActiveThisWeek / 7) * 100))

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      {/* Heading */}
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
        Welcome back, {firstName}!
      </h1>
      <p style={{ color: '#666', marginTop: 8, marginBottom: '2rem', fontSize: 15 }}>
        Ready to dive back into your learning journey?
      </p>

      {/* Top row: This Week card + 2 stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 20,
        marginBottom: '2rem'
      }}>
        {/* This Week activity card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
              This Week
            </h2>
            <span style={weekPillStyle}>
              {stats.daysActiveThisWeek}/7 days
            </span>
          </div>

          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#6C63FF' }}>
              {weekActivityPct}%
            </span>
            <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>
              Weekly activity
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6, background: '#F0EFFE', borderRadius: 999,
            overflow: 'hidden', marginTop: 12, marginBottom: 12
          }}>
            <div style={{
              height: '100%',
              width: `${weekActivityPct}%`,
              background: '#10B981',
              borderRadius: 999,
              transition: 'width 0.4s ease'
            }} />
          </div>

          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            {stats.daysActiveThisWeek === 0
              ? "Let's get started — like a video to begin your week!"
              : stats.daysActiveThisWeek >= 5
                ? "Incredible consistency. Keep it going!"
                : "You're on track. Keep up the great work."}
          </p>

          {/* Mini summary footer */}
          <div style={summaryFooterStyle}>
            <div style={summaryIconStyle}>
              <PlayCircle size={20} color="#6C63FF" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                This week's activity
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {stats.likesThisWeek} videos liked · {stats.boardsThisWeek} boards created
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              style={continueButtonStyle}
            >
              Continue
            </button>
          </div>
        </div>

        {/* Right column: 2 stat cards stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StatCard
            icon={<Flame size={22} color="#6C63FF" />}
            iconBg="#F0EFFE"
            value={stats.daysActiveThisWeek}
            label="Day Streak"
          />
          <StatCard
            icon={<Trophy size={22} color="#D97706" />}
            iconBg="#FEF3C7"
            value={stats.videosLiked}
            label="Videos Liked"
          />
        </div>
      </div>

      {/* Bottom row: Active Whiteboards + Saved Videos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24
      }}>
        {/* Active Whiteboards */}
        <div>
          <SectionHeader
            icon={<Edit3 size={18} color="#1a1a1a" />}
            title="Active Whiteboards"
            actionLabel="View All"
            onAction={() => navigate('/whiteboards')}
          />
          {boards.length === 0 ? (
            <EmptyState text="No boards yet — create your first one!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {boards.map(board => (
                <BoardRow key={board.id} board={board} />
              ))}
            </div>
          )}
        </div>

        {/* Saved Videos */}
        <div>
          <SectionHeader
            icon={<PlayCircle size={18} color="#1a1a1a" />}
            title="Saved Videos"
            actionLabel="View Library"
            onAction={() => navigate('/saved')}
          />
          {savedVideos.length === 0 ? (
            <EmptyState text="Like a video to see it here." />
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
            }}>
              {savedVideos.slice(0, 2).map(video => (
                <VideoThumb key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- subcomponents ---

function StatCard({ icon, iconBg, value, label }) {
  return (
    <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: iconBg, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
          {title}
        </h3>
      </div>
      <button onClick={onAction} style={{
        background: 'none', border: 'none', color: '#10B981',
        fontSize: 13, fontWeight: 500, cursor: 'pointer'
      }}>
        {actionLabel}
      </button>
    </div>
  )
}

function BoardRow({ board }) {
  const navigate = useNavigate()
  const updated = new Date(board.updated_at)
  const now = new Date()
  const diffHours = Math.round((now - updated) / (1000 * 60 * 60))
  const timeLabel = diffHours < 1
    ? 'Just now'
    : diffHours < 24
      ? `${diffHours}h ago`
      : diffHours < 48
        ? 'Yesterday'
        : `${Math.round(diffHours / 24)}d ago`

  return (
    <div
      onClick={() => navigate(`/whiteboards`)}
      style={{
        ...cardStyle, padding: '0.85rem 1rem',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 8,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Edit3 size={22} color="#6C63FF" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#1a1a1a',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {board.title || 'Untitled Board'}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          Last edited {timeLabel}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: '#666', marginTop: 6
        }}>
          <Users size={12} />
          {board.memberCount > 0
            ? `${board.memberCount} collaborator${board.memberCount > 1 ? 's' : ''}`
            : 'Just you'}
        </div>
      </div>
    </div>
  )
}

function VideoThumb({ video }) {
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div style={{
        position: 'relative', aspectRatio: '4 / 5',
        background: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <video
          src={video.storage_url}
          muted
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0
          }}
        />
        <div style={{
          position: 'relative', zIndex: 1,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <PlayCircle size={28} color="#1a1a1a" />
        </div>
      </div>
      <div style={{ padding: '0.6rem 0.75rem', background: 'white' }}>
        <div style={{
          display: 'inline-block', fontSize: 10, fontWeight: 600,
          background: '#D1FAE5', color: '#065F46',
          padding: '2px 8px', borderRadius: 4, marginBottom: 6
        }}>
          {video.subject}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: '#1a1a1a',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {video.title}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      ...cardStyle, padding: '2rem 1rem', textAlign: 'center',
      color: '#888', fontSize: 13
    }}>
      {text}
    </div>
  )
}

// --- shared styles ---

const cardStyle = {
  background: 'white',
  borderRadius: 16,
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  border: '1px solid #f0f0f0'
}

const weekPillStyle = {
  background: '#D1FAE5', color: '#065F46',
  padding: '4px 10px', borderRadius: 999,
  fontSize: 12, fontWeight: 500
}

const summaryFooterStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: '#FAFAF7', borderRadius: 10,
  padding: '0.75rem', marginTop: 16
}

const summaryIconStyle = {
  width: 36, height: 36, borderRadius: 8,
  background: '#F0EFFE',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const continueButtonStyle = {
  background: '#6C63FF', color: 'white',
  border: 'none', borderRadius: 8,
  padding: '0.5rem 1rem', fontSize: 13,
  fontWeight: 500, cursor: 'pointer'
}