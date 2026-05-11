import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, StickyNote, Send, Users, Trash2 } from 'lucide-react'
import { supabase } from './supabaseClient'

const STICKY_COLORS = ['#FEF08A', '#FBCFE8', '#BAE6FD', '#BBF7D0', '#FED7AA', '#DDD6FE']

export default function Whiteboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState(null)
  const [referenceVideo, setReferenceVideo] = useState(null)
  const [stickies, setStickies] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [memberCount, setMemberCount] = useState(1)
  const chatEndRef = useRef(null)

  // Load everything
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.full_name || 'You')

      // Board
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .single()

      if (boardError || !boardData) {
        setLoading(false)
        return
      }

      setBoard(boardData)

      // Stickies live in canvas_json.stickies
      const existing = boardData.canvas_json?.stickies || []
      setStickies(existing)

      // Reference video
      if (boardData.reference_video_id) {
        const { data: video } = await supabase
          .from('videos')
          .select('id, title, subject, storage_url')
          .eq('id', boardData.reference_video_id)
          .single()
        setReferenceVideo(video)
      }

      // Member count (owner + board_members)
      const { count } = await supabase
        .from('board_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('board_id', id)
      setMemberCount((count || 0) + 1) // +1 for owner

      // Messages — comments tied to this board
      const { data: msgs } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id,
          author:profiles ( full_name )
        `)
        .eq('board_id', id)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
      setLoading(false)
    }
    load()
  }, [id])

  // Realtime subscription for chat messages
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`board-${id}-chat`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `board_id=eq.${id}`
      }, async (payload) => {
        // Fetch the author's name to enrich the row
        const { data: author } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payload.new.user_id)
          .single()

        setMessages(prev => {
          // avoid duplicates if our own optimistic insert already landed
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, { ...payload.new, author }]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist stickies to canvas_json (debounced via effect)
  const persistStickies = async (newStickies) => {
    setStickies(newStickies)
    await supabase
      .from('boards')
      .update({
        canvas_json: { ...(board?.canvas_json || {}), stickies: newStickies },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
  }

  const addSticky = () => {
    const newSticky = {
      id: crypto.randomUUID(),
      text: 'New note...',
      color: STICKY_COLORS[stickies.length % STICKY_COLORS.length],
      author: userName,
      created_at: new Date().toISOString()
    }
    persistStickies([...stickies, newSticky])
  }

  const updateSticky = (stickyId, text) => {
    persistStickies(stickies.map(s =>
      s.id === stickyId ? { ...s, text } : s
    ))
  }

  const deleteSticky = (stickyId) => {
    persistStickies(stickies.filter(s => s.id !== stickyId))
  }

  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || !board) return

    setNewMessage('')

    // comments table requires video_id NOT NULL — use reference_video_id
    // If no reference video, we can't post chat (schema constraint)
    if (!board.reference_video_id) {
      alert('This board needs a reference lesson to enable team chat.')
      return
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        board_id: id,
        user_id: userId,
        video_id: board.reference_video_id,
        content: text
      })
      .select()
      .single()

    if (error) {
      console.error('Send error:', error)
      return
    }

    // Optimistic add (realtime will dedupe)
    setMessages(prev => {
      if (prev.some(m => m.id === data.id)) return prev
      return [...prev, { ...data, author: { full_name: userName } }]
    })
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#666' }}>Loading board...</div>
  }

  if (!board) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#991B1B' }}>Board not found.</p>
        <button onClick={() => navigate('/whiteboards')} style={backButtonStyle}>
          Back to Whiteboards
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden'
    }}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <button onClick={() => navigate('/whiteboards')} style={backButtonStyle}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>
            {board.title || 'Untitled Board'}
          </h2>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#F0EFFE', color: '#6C63FF',
          padding: '6px 12px', borderRadius: 999,
          fontSize: 13, fontWeight: 500
        }}>
          <Users size={14} />
          {memberCount} {memberCount === 1 ? 'person' : 'people'}
        </div>
      </div>

      {/* Main area: canvas + right panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Canvas area */}
        <div style={{
          flex: 1, padding: '1.5rem',
          background: '#FAFAFC',
          backgroundImage: 'radial-gradient(circle, #d8d8e0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1rem'
          }}>
            <div style={{ fontSize: 14, color: '#666' }}>
              {stickies.length} {stickies.length === 1 ? 'note' : 'notes'}
            </div>
            <button onClick={addSticky} style={addStickyButtonStyle}>
              <StickyNote size={16} /> Add Note
            </button>
          </div>

          {stickies.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              color: '#888'
            }}>
              <StickyNote size={40} color="#aaa" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', color: '#444' }}>
                Empty canvas
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                Click "Add Note" to drop your first sticky.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16
            }}>
              {stickies.map(sticky => (
                <Sticky
                  key={sticky.id}
                  sticky={sticky}
                  onUpdate={(text) => updateSticky(sticky.id, text)}
                  onDelete={() => deleteSticky(sticky.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={rightPanelStyle}>

          {/* Reference lesson */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #eee' }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#1a1a1a',
              marginBottom: 12
            }}>
              Reference Lesson
            </div>
            {referenceVideo ? (
              <div>
                <video
                  src={referenceVideo.storage_url}
                  controls
                  style={{
                    width: '100%', borderRadius: 12,
                    background: '#000', aspectRatio: '16/9',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 600,
                    background: '#FBBF24', color: '#1a1a1a',
                    padding: '2px 8px', borderRadius: 4, marginBottom: 4
                  }}>
                    {referenceVideo.subject?.toUpperCase()}
                  </span>
                  <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>
                    {referenceVideo.title}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                fontSize: 13, color: '#888',
                background: '#F5F4FB', borderRadius: 8,
                padding: '1rem', textAlign: 'center'
              }}>
                No reference lesson attached.
              </div>
            )}
          </div>

          {/* Team chat */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                Team Chat
              </div>
              <span style={{
                background: '#D1FAE5', color: '#065F46',
                padding: '3px 8px', borderRadius: 999,
                fontSize: 11, fontWeight: 500
              }}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: '0 1.25rem',
              display: 'flex', flexDirection: 'column', gap: 12
            }}>
              {messages.length === 0 ? (
                <div style={{
                  fontSize: 12, color: '#888',
                  textAlign: 'center', padding: '1rem'
                }}>
                  No messages yet.
                </div>
              ) : (
                messages.map(msg => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isMe={msg.user_id === userId}
                  />
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid #eee',
              display: 'flex', gap: 8
            }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                style={chatInputStyle}
              />
              <button onClick={sendMessage} style={sendButtonStyle}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Sticky({ sticky, onUpdate, onDelete }) {
  const [text, setText] = useState(sticky.text)
  const [editing, setEditing] = useState(false)

  const save = () => {
    setEditing(false)
    if (text !== sticky.text) onUpdate(text)
  }

  return (
    <div style={{
      background: sticky.color, padding: '1rem',
      borderRadius: 8, minHeight: 140,
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      position: 'relative',
      transform: `rotate(${(sticky.id.charCodeAt(0) % 5 - 2) * 0.5}deg)`,
      cursor: 'text'
    }}>
      <button onClick={onDelete} style={{
        position: 'absolute', top: 6, right: 6,
        background: 'rgba(0,0,0,0.05)', border: 'none',
        borderRadius: 4, padding: 4, cursor: 'pointer',
        color: '#444'
      }}>
        <Trash2 size={12} />
      </button>

      {editing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={save}
          autoFocus
          style={{
            width: '100%', height: '100%', minHeight: 100,
            background: 'transparent', border: 'none',
            resize: 'none', outline: 'none',
            fontSize: 14, fontFamily: 'inherit',
            color: '#1a1a1a'
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{
            fontSize: 14, color: '#1a1a1a',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            paddingRight: 16
          }}
        >
          {sticky.text}
        </div>
      )}

      {sticky.author && (
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 10, color: 'rgba(0,0,0,0.5)',
          fontStyle: 'italic'
        }}>
          — {sticky.author}
        </div>
      )}
    </div>
  )
}

function ChatMessage({ message, isMe }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      gap: 2
    }}>
      <div style={{
        fontSize: 11, color: '#888',
        display: 'flex', gap: 6
      }}>
        <span style={{ fontWeight: 500 }}>
          {isMe ? 'You' : (message.author?.full_name || 'Member')}
        </span>
        <span>{time}</span>
      </div>
      <div style={{
        background: isMe ? '#6C63FF' : '#F0EFFE',
        color: isMe ? 'white' : '#1a1a1a',
        padding: '8px 12px', borderRadius: 12,
        fontSize: 13, maxWidth: 240,
        wordBreak: 'break-word'
      }}>
        {message.content}
      </div>
    </div>
  )
}

// --- styles ---

const topBarStyle = {
  display: 'flex', alignItems: 'center',
  padding: '0.85rem 1.25rem',
  background: 'white', borderBottom: '1px solid #eee'
}

const backButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '0.5rem 0.85rem', background: '#F5F4FB',
  color: '#444', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 500, cursor: 'pointer'
}

const addStickyButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '0.5rem 1rem', background: '#6C63FF', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
  cursor: 'pointer'
}

const rightPanelStyle = {
  width: 360, background: 'white',
  borderLeft: '1px solid #eee',
  display: 'flex', flexDirection: 'column'
}

const chatInputStyle = {
  flex: 1, padding: '0.6rem 0.85rem',
  borderRadius: 999, border: '1px solid #ddd',
  fontSize: 13, outline: 'none'
}

const sendButtonStyle = {
  width: 36, height: 36, borderRadius: '50%',
  background: '#6C63FF', color: 'white',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}