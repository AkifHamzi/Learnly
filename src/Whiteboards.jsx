import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit3, Users, X } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Whiteboards() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [boards, setBoards] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const loadBoards = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Boards I own
      const { data: owned } = await supabase
        .from('boards')
        .select('id, title, updated_at, owner_id, reference_video_id')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })

      // Boards I'm a member of
      const { data: memberships } = await supabase
        .from('board_members')
        .select('board:boards(id, title, updated_at, owner_id, reference_video_id)')
        .eq('user_id', user.id)

      const memberBoards = (memberships || [])
        .map(m => m.board)
        .filter(Boolean)
        .filter(b => b.owner_id !== user.id)

      const all = [...(owned || []), ...memberBoards]

      const withCounts = await Promise.all(
        all.map(async (b) => {
          const { count } = await supabase
            .from('board_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('board_id', b.id)
          return { ...b, memberCount: count || 0, isOwner: b.owner_id === user.id }
        })
      )

      setBoards(withCounts)
      setLoading(false)
    }
    loadBoards()
  }, [])

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '0.5rem'
      }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Whiteboards
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={createButtonStyle}
        >
          <Plus size={16} /> New Board
        </button>
      </div>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 15 }}>
        Your collaborative learning spaces
      </p>

      {loading ? (
        <div style={{ color: '#666' }}>Loading...</div>
      ) : boards.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 16, padding: '3rem',
          textAlign: 'center', border: '1px solid #f0f0f0'
        }}>
          <Edit3 size={40} color="#6C63FF" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>No boards yet</h3>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
            Create your first whiteboard to start collaborating
          </p>
          <button onClick={() => setShowCreateModal(true)} style={createButtonStyle}>
            <Plus size={16} /> Create Board
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20
        }}>
          {boards.map(board => (
            <BoardCard
              key={board.id}
              board={board}
              onClick={() => navigate(`/whiteboards/${board.id}`)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newBoardId) => {
            setShowCreateModal(false)
            navigate(`/whiteboards/${newBoardId}`)
          }}
        />
      )}
    </div>
  )
}

function BoardCard({ board, onClick }) {
  const updated = new Date(board.updated_at)
  const now = new Date()
  const diffHours = Math.round((now - updated) / (1000 * 60 * 60))
  const timeLabel = diffHours < 1
    ? 'Just now'
    : diffHours < 24
      ? `${diffHours}h ago`
      : `${Math.round(diffHours / 24)}d ago`

  return (
    <div onClick={onClick} style={{
      background: 'white', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #f0f0f0', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
      }}>
      <div style={{
        height: 140,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        <Edit3 size={36} color="#6C63FF" />
        {board.isOwner && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(108, 99, 255, 0.9)', color: 'white',
            fontSize: 10, fontWeight: 600, padding: '3px 8px',
            borderRadius: 4, letterSpacing: 0.5
          }}>OWNER</div>
        )}
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: '#1a1a1a',
          marginBottom: 4
        }}>
          {board.title || 'Untitled Board'}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          Last edited {timeLabel}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: '#666', marginTop: 8
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

function CreateBoardModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [referenceVideoId, setReferenceVideoId] = useState('')
  const [likedVideos, setLikedVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadLiked = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('likes')
        .select('video:videos(id, title, subject)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setLikedVideos((data || []).map(l => l.video).filter(Boolean))
    }
    loadLiked()
  }, [])

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please give your board a title')
      return
    }
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: insertError } = await supabase
      .from('boards')
      .insert({
        owner_id: user.id,
        title: title.trim(),
        reference_video_id: referenceVideoId || null
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    onCreated(data.id)
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1a1a1a' }}>
            Create New Board
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#666', padding: 4
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Board Title</label>
          <input
            placeholder="e.g. Biology Concept Map"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Reference Lesson (optional)</label>
          <select
            value={referenceVideoId}
            onChange={e => setReferenceVideoId(e.target.value)}
            style={inputStyle}
          >
            <option value="">No reference lesson</option>
            {likedVideos.map(v => (
              <option key={v.id} value={v.id}>
                [{v.subject}] {v.title}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
            {likedVideos.length === 0
              ? 'Like videos in the feed to use them as references.'
              : 'Pick a video you\'ve liked to attach as the board\'s reference.'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 8, padding: '0.75rem', marginBottom: '1rem',
            color: '#991B1B', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            ...createButtonStyle,
            width: '100%', justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Board'}
        </button>
      </div>
    </div>
  )
}

// --- styles ---

const createButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '0.6rem 1.1rem', background: '#6C63FF', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
  cursor: 'pointer'
}

const modalOverlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: '1rem'
}

const modalStyle = {
  background: 'white', borderRadius: 16, padding: '1.75rem',
  width: '100%', maxWidth: 480, boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#444', marginBottom: 6
}

const inputStyle = {
  display: 'block', width: '100%', padding: '0.75rem',
  borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box', background: 'white',
  outline: 'none'
}