import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export default function GameOverScreen() {
  const { score, agents, worldState, setPhase, startMatchmaking } = useGameStore()
  const won = worldState.dominance.player1 >= worldState.dominance.player2
  const p1Converted = agents.filter(a => a.faction === 'player1').length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            fontSize: '4rem',
            display: 'block',
            marginBottom: 20,
            color: won ? 'var(--accent-2)' : 'var(--agent-neutral)',
          }}
        >
          {won ? '✦' : '◈'}
        </motion.div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          color: won ? 'var(--accent-2)' : 'var(--agent-neutral)',
          letterSpacing: '0.15em',
          marginBottom: 8,
        }}>
          {won ? 'PROTOCOL MASTERED' : 'ECHO SILENCED'}
        </h2>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          marginBottom: 28,
        }}>
          {p1Converted} agents converted · Score {score.player1} — {score.player2}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => startMatchmaking()}
            style={{
              padding: '12px 24px',
              background: 'var(--primary)',
              border: 'none', borderRadius: 8,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.15em',
              cursor: 'pointer',
            }}
          >
            REMATCH
          </button>
          <button
            type="button"
            onClick={() => setPhase('lobby')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: '1px solid rgba(211,47,47,0.4)', borderRadius: 8,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            LOBBY
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
