import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export default function Leaderboard() {
  const [open, setOpen] = useState(false)
  const { leaderboard, walletAddress, refreshLeaderboard } = useGameStore()

  useEffect(() => {
    if (open) refreshLeaderboard()
  }, [open, refreshLeaderboard])

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          top: 68,
          right: 16,
          zIndex: 150,
          padding: '8px 14px',
          background: 'rgba(26,26,26,0.9)',
          border: '1px solid rgba(211,47,47,0.35)',
          color: 'var(--accent-2)',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          backdropFilter: 'blur(8px)',
        }}
      >
        ◈ BOARD
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            style={{
              position: 'fixed',
              top: 104,
              right: 16,
              width: 280,
              zIndex: 150,
              background: 'rgba(26,26,26,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(211,47,47,0.35)',
              borderRadius: 10,
              padding: '16px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              color: 'var(--accent-2)',
              letterSpacing: '0.2em',
              marginBottom: 14,
              borderBottom: '1px solid rgba(211,47,47,0.2)',
              paddingBottom: 10,
            }}>
              TOP ECHO WEAVERS
            </div>

            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <span style={{
                  fontSize: '0.75rem',
                  color: i === 0 ? 'var(--accent-2)' : i === 1 ? 'var(--text-secondary)' : i === 2 ? '#CD7F32' : 'var(--text-muted)',
                  fontWeight: 700,
                }}>
                  {i === 0 ? '✦' : i === 1 ? '◆' : i === 2 ? '◈' : `${entry.rank}`}
                </span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text)' }}>{entry.address}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    {entry.echoes} echoes · {entry.agents} agents
                  </div>
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  textShadow: '0 0 8px var(--primary)',
                }}>
                  {entry.wins}W
                </div>
              </motion.div>
            ))}

            {walletAddress && (
              <div style={{
                marginTop: 12,
                padding: '8px 10px',
                background: 'rgba(211,47,47,0.1)',
                borderRadius: 6,
                border: '1px solid rgba(211,47,47,0.25)',
              }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>YOU</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text)' }}>{walletAddress.slice(0, 12)}…</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-2)' }}>UNRANKED</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
