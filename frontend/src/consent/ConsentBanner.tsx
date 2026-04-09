import type { CSSProperties } from 'react'
import { useConsent } from './useConsent'
import { useConsentShell } from './ConsentContext'

const panelStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9500,
  padding: '16px 20px 20px',
  background: 'rgba(14,14,16,0.97)',
  borderTop: '1px solid rgba(211,47,47,0.35)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
}

const btnBase: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  letterSpacing: '0.12em',
  padding: '10px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  border: '1px solid transparent',
  textTransform: 'uppercase' as const,
}

export function ConsentBanner() {
  const { hasAnswered, acceptAll, rejectNonEssential } = useConsent()
  const { openPreferenceCenter } = useConsentShell()

  if (hasAnswered) return null

  return (
    <div
      className="consent-banner-host"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
      style={panelStyle}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <h2
            id="consent-banner-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.18em',
              color: 'var(--accent-2)',
              marginBottom: 8,
            }}
          >
            COOKIES & PRIVACY
          </h2>
          <p
            id="consent-banner-desc"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              maxWidth: 720,
            }}
          >
            We use necessary cookies to run the protocol. With your consent we also use functional,
            analytics, and targeting storage as described in our privacy notice. You can change this
            anytime.
          </p>
          <p style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <a href="/privacy.html" style={{ color: 'var(--accent-2)' }}>
              Privacy policy
            </a>
            {' · '}
            <button
              type="button"
              onClick={openPreferenceCenter}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-2)',
                cursor: 'pointer',
                font: 'inherit',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Customize
            </button>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={rejectNonEssential}
            style={{
              ...btnBase,
              background: 'transparent',
              borderColor: 'rgba(255,248,231,0.2)',
              color: 'var(--text-secondary)',
            }}
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={openPreferenceCenter}
            style={{
              ...btnBase,
              background: 'rgba(211,47,47,0.15)',
              borderColor: 'rgba(211,47,47,0.4)',
              color: 'var(--text)',
            }}
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={acceptAll}
            style={{
              ...btnBase,
              background: 'var(--primary)',
              color: 'var(--text)',
              borderColor: 'var(--primary)',
              boxShadow: '0 0 16px rgba(211,47,47,0.35)',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
