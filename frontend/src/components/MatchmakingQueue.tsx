import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { useEffect, useState } from 'react'

export default function MatchmakingQueue() {
  const { phase } = useGameStore()
  const [dots, setDots] = useState(0)
  const [playersFound, setPlayersFound] = useState(false)

  useEffect(() => {
    if (phase !== 'matchmaking') return
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    const t2 = setTimeout(() => setPlayersFound(true), 1800)
    return () => { clearInterval(t); clearTimeout(t2) }
  }, [phase])

  if (phase !== 'matchmaking') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26,26,26,0.95)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        {/* Spinning ring */}
        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 32px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              border: '2px solid transparent',
              borderTopColor: 'var(--primary)',
              borderRightColor: 'var(--accent-2)',
              borderRadius: '50%',
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 12,
              border: '2px solid transparent',
              borderBottomColor: 'var(--primary)',
              borderRadius: '50%',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '2rem',
            color: playersFound ? 'var(--accent-2)' : 'var(--primary)',
          }}>
            {playersFound ? '✦' : '◈'}
          </div>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          color: 'var(--text)',
          letterSpacing: '0.15em',
          marginBottom: 12,
        }}>
          {playersFound ? 'OPPONENT FOUND' : 'SCANNING PROTOCOL'}
        </h2>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          marginBottom: 24,
        }}>
          {playersFound
            ? 'Initializing shared chamber…'
            : `Searching for echo-compatible mind${'.'.repeat(dots)}`}
        </p>

        {/* Mock queue stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          padding: '16px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          border: '1px solid rgba(211,47,47,0.2)',
        }}>
          {[
            { label: 'QUEUE', value: '247' },
            { label: 'AVG WAIT', value: '3s' },
            { label: 'LIVE GAMES', value: '89' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--accent-2)' }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
