import { ImageResponse } from 'next/og'

export const alt = 'Liveboard — Realtime Team Workspace'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          padding: '64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Ambient Gradient Highlights */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
          }}
        />

        {/* Top Header / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          </div>
          <span style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Liveboard
          </span>
          <div
            style={{
              marginLeft: '12px',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#818cf8',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Realtime Sync
          </div>
        </div>

        {/* Middle Main Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#fafafa',
              margin: 0,
            }}
          >
            Realtime Team Collaboration Workspace
          </h1>
          <p
            style={{
              fontSize: '22px',
              lineHeight: 1.5,
              color: '#71717a',
              margin: 0,
            }}
          >
            Kanban board with instant state synchronization, presence avatars, live activity timeline, and optimistic updates.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Socket.io & Pusher', color: '#818cf8' },
            { label: 'Live Presence', color: '#34d399' },
            { label: 'Optimistic UI', color: '#fbbf24' },
            { label: 'Prisma & PostgreSQL', color: '#f472b6' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(39, 39, 42, 0.6)',
                border: '1px solid rgba(63, 63, 70, 0.6)',
                color: '#e4e4e7',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
