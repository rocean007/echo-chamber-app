/** Full-viewport shell while the Three.js bundle streams — matches lobby background tone. */
export default function GameBoardFallback() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: 'radial-gradient(ellipse at center, rgba(139,0,0,0.12) 0%, rgba(26,26,26,0.98) 65%)',
        pointerEvents: 'none',
      }}
    />
  )
}
