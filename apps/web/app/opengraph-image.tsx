import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Go Virall - The Creator OS';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0618 0%, #1a1040 50%, #0a0618 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#f3efe6',
              letterSpacing: '-0.03em',
            }}
          >
            Go Virall
          </div>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#e63946',
            }}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#c8ff00',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          THE CREATOR OS
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: 'rgba(226, 228, 234, 0.7)',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Analytics, AI Studio, Viral Score & Audience Intelligence across 7 platforms.
        </div>

        {/* Platform badges */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 40,
          }}
        >
          {['Instagram', 'TikTok', 'YouTube', 'X', 'LinkedIn', 'Facebook', 'Twitch'].map(
            (p) => (
              <div
                key={p}
                style={{
                  padding: '8px 16px',
                  border: '1px solid rgba(200,255,0,0.3)',
                  borderRadius: 20,
                  fontSize: 14,
                  color: '#c8ff00',
                  fontWeight: 600,
                }}
              >
                {p}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
