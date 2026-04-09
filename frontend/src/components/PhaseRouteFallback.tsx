/** Shown briefly while phase-specific chunks (matchmaking, overlays) load. */
export default function PhaseRouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 399,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        color: 'var(--text-muted)',
      }}
    >
      …
    </div>
  )
}
