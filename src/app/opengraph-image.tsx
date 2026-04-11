import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Go Virall — Social Intelligence Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Gold accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #c4a35a, #e8d48b, #c4a35a)',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#f5f0e8',
              letterSpacing: '-2px',
            }}
          >
            Go Virall
          </div>
          <div
            style={{
              width: 80,
              height: 2,
              background: '#c4a35a',
            }}
          />
          <div
            style={{
              fontSize: 28,
              color: '#c4a35a',
              letterSpacing: '4px',
              textTransform: 'uppercase' as const,
              fontWeight: 500,
            }}
          >
            Social Intelligence Platform
          </div>
          <div
            style={{
              fontSize: 20,
              color: '#999',
              maxWidth: 700,
              textAlign: 'center' as const,
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            AI-powered analytics, growth strategies, and brand deals for creators
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 16,
            color: '#666',
            letterSpacing: '2px',
          }}
        >
          www.govirall.com
        </div>
      </div>
    ),
    { ...size }
  )
}
