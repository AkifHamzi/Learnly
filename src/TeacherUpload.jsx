import { useState } from 'react'
import { supabase } from './supabaseClient'

const SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'English', 'Computer Science']

export default function TeacherUpload() {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Maths')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleUpload = async () => {
    if (!title || !file) {
      setError('Please fill in all fields and select a video')
      return
    }

    setLoading(true)
    setError(null)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

console.log('User:', user)

// Check if profile exists
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
console.log('Profile:', profile)
console.log('Profile error:', profileError)

    // Upload video to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('Videos')
      .upload(fileName, file)

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Videos')
      .getPublicUrl(fileName)

    // Save video record to database
    const { error: dbError } = await supabase.from('videos').insert({
      teacher_id: user.id,
      title,
      subject,
      storage_url: publicUrl
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTitle('')
    setFile(null)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '2rem auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Upload a Video</h2>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 14 }}>
        Share a 60–90 second lesson with your students
      </p>

      {success && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #86EFAC',
          borderRadius: 8, padding: '1rem', marginBottom: '1rem',
          color: '#166534', fontSize: 14
        }}>
          Video uploaded successfully!
        </div>
      )}

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          borderRadius: 8, padding: '1rem', marginBottom: '1rem',
          color: '#991B1B', fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Video Title</label>
        <input
          placeholder="e.g. Quantum Entanglement Explained in 60s"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Video File</label>
        <input
          type="file"
          accept="video/*"
          onChange={e => setFile(e.target.files[0])}
          style={{ ...inputStyle, padding: '0.5rem' }}
        />
        <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          MP4 recommended. Keep it 60–90 seconds.
        </p>
      </div>

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          width: '100%', padding: '0.75rem', background: loading ? '#a09be8' : '#6C63FF',
          color: 'white', border: 'none', borderRadius: 8,
          fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500
        }}
      >
        {loading ? 'Uploading...' : 'Upload Video'}
      </button>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#444', marginBottom: 6
}

const inputStyle = {
  display: 'block', width: '100%', padding: '0.75rem',
  borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box', background: 'white'
}