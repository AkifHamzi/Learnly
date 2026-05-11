import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'How do I save a video?',
    a: 'Tap the heart button on any video in your feed. Saved videos appear in your Saved page and can be attached as reference lessons to whiteboards.'
  },
  {
    q: 'How do whiteboards work?',
    a: 'Whiteboards are collaborative spaces for studying. Add sticky notes to capture key ideas, attach a reference lesson video, and chat with collaborators in real time.'
  },
  {
    q: 'Who can see my whiteboards?',
    a: 'By default, only you. You can invite collaborators to view or edit your boards (invitations feature coming soon).'
  },
  {
    q: 'How do I upload a video as a teacher?',
    a: 'If you signed up as a teacher, you\'ll see an "Upload Video" option in the sidebar. Videos should be 60–90 seconds and tagged with a subject.'
  },
  {
    q: 'Can I change my account type?',
    a: 'Not currently. If you need a different role, please contact support.'
  }
]

export default function Help() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 800 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
        Help & FAQ
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: 15 }}>
        Everything you need to know about Learnly
      </p>

      <div style={{
        background: 'white', borderRadius: 16,
        border: '1px solid #f0f0f0', overflow: 'hidden'
      }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{
            borderBottom: i === FAQS.length - 1 ? 'none' : '1px solid #f0f0f0'
          }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '1.25rem 1.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', fontSize: 15, fontWeight: 500,
                color: '#1a1a1a'
              }}
            >
              {faq.q}
              <ChevronDown size={18} style={{
                transition: 'transform 0.2s',
                transform: openIndex === i ? 'rotate(180deg)' : 'none'
              }} />
            </button>
            {openIndex === i && (
              <div style={{
                padding: '0 1.5rem 1.25rem', color: '#666',
                fontSize: 14, lineHeight: 1.5
              }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}