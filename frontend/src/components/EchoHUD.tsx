import { motion } from 'framer-motion'
import { useGameStore, STONE_SYMBOLS, EchoStone } from '../store/gameStore'

const STONE_COLORS: Record<EchoStone, { bg: string; border: string; glow: string }> = {
  Growth: { bg: '#2E7D3222', border: '#2E7D32', glow: '#2E7D3266' },
  Decay:  { bg: '#9E9E9E22', border: '#9E9E9E', glow: '#9E9E9E66' },
  Light:  { bg: '#FFC10722', border: '#FFC107', glow: '#FFC10766' },
  Shadow: { bg: '#D32F2F22', border: '#D32F2F', glow: '#D32F2F66' },
}

export default function EchoHUD() {
  const { score, agents, walletAddress, worldState, turnCount, phase } = useGameStore()
  if (phase !== 'playing') return null

  const p1Agents = agents.filter(a => a.faction === 'player1').length
  const p2Agents = agents.filter(a => a.faction === 'player2').length
  const totalAgents = agents.length
  const stones: EchoStone[] = ['Growth', 'Decay', 'Light', 'Shadow']

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(26,26,26,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(211,47,47,0.25)',
        zIndex: 100,
      }}>
        {/* Left: Logo */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          color: 'var(--primary)',
          textShadow: '0 0 12px var(--primary)',
        }}>
          ECHO CHAMBER
        </div>

        {/* Center: Score bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--agent-player1)' }}>
              {score.player1}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              YOU
            </div>
          </div>

          <div style={{ width: 120, height: 8, borderRadius: 4, background: 'rgba(255,248,231,0.14)', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              animate={{ width: `${worldState.dominance.player1}%` }}
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                background: 'var(--agent-player1)',
                boxShadow: '0 0 8px var(--agent-player1)',
              }}
            />
            <motion.div
              animate={{ width: `${worldState.dominance.player2}%`, left: `${100 - worldState.dominance.player2}%` }}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                background: 'var(--agent-player2)',
                boxShadow: '0 0 8px var(--agent-player2)',
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--agent-player2)' }}>
              {score.player2}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              OPP
            </div>
          </div>
        </div>

        {/* Right: Match info */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-2)' }}>
            TURN {turnCount}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            {walletAddress.length >= 8 ? `${walletAddress.slice(0, 8)}…` : '—'}
          </div>
        </div>
      </div>

      {/* Bottom HUD: Echo stones */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Agents converted counter */}
        <div style={{
          display: 'flex',
          gap: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          <span style={{ color: 'var(--agent-player1)' }}>▸ {p1Agents} converted</span>
          <span style={{ color: 'var(--text-hint)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>{totalAgents - p1Agents - p2Agents} neutral</span>
          <span style={{ color: 'var(--text-hint)' }}>|</span>
          <span style={{ color: 'var(--agent-player2)' }}>{p2Agents} opponent ◂</span>
        </div>

        {/* Echo stones panel */}
        <div className="glass-panel" style={{
          padding: '12px 20px',
          borderRadius: 12,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.64rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            marginRight: 4,
          }}>
            STONES
          </div>
          {stones.map((stone, i) => {
            const c = STONE_COLORS[stone]
            return (
              <motion.div
                key={stone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.1, y: -4 }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 10,
                  background: c.bg,
                  border: `1.5px solid ${c.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  cursor: 'default',
                  boxShadow: `0 0 10px ${c.glow}`,
                }}
              >
                <span style={{ fontSize: '1.3rem', color: c.border }}>{STONE_SYMBOLS[stone]}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.52rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}>
                  {stone.toUpperCase()}
                </span>
              </motion.div>
            )
          })}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--text-secondary)',
            marginLeft: 8,
            maxWidth: 70,
            lineHeight: 1.5,
          }}>
            CLICK AN<br/>AGENT TO<br/>BEGIN
          </div>
        </div>
      </div>
    </>
  )
}
