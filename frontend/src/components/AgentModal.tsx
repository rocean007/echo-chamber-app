import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, STONE_SYMBOLS, EchoStone } from '../store/gameStore'
import { useEffect } from 'react'

const STONE_COLORS: Record<EchoStone, string> = {
  Growth: '#2E7D32',
  Decay:  '#9E9E9E',
  Light:  '#FFC107',
  Shadow: '#D32F2F',
}

const STONE_DESCRIPTIONS: Record<EchoStone, string> = {
  Growth: 'Life force, expansion, renewal',
  Decay:  'Entropy, dissolution, recycling',
  Light:  'Clarity, revelation, radiance',
  Shadow: 'Concealment, potential, depth',
}

export default function AgentModal() {
  const {
    agents, selectedAgentId, selectAgent,
    echoSequence, addEchoStone, clearEchoSequence, castEcho,
    lastEchoResult, resetLastResult
  } = useGameStore()

  const agent = agents.find(a => a.id === selectedAgentId)

  useEffect(() => {
    if (lastEchoResult) {
      const t = setTimeout(resetLastResult, 1500)
      return () => clearTimeout(t)
    }
  }, [lastEchoResult, resetLastResult])

  const stones: EchoStone[] = ['Growth', 'Decay', 'Light', 'Shadow']

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          key="agent-modal"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(420px, 92vw)',
            zIndex: 200,
          }}
        >
          <div className="glass-panel scanlines" style={{
            borderRadius: 12,
            padding: '20px 24px',
            border: '1px solid rgba(211,47,47,0.5)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  color: 'var(--accent-2)',
                  letterSpacing: '0.15em',
                  marginBottom: 4,
                }}>
                  AGENT CONTACT
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  color: 'var(--panel-ink)',
                  letterSpacing: '0.1em',
                }}>
                  {agent.name}
                </h2>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}>
                  {agent.personality} • {agent.biome.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => selectAgent(null)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(211,47,47,0.3)',
                  color: 'var(--panel-ink)',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Desire display */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.2em',
                marginBottom: 8,
              }}>
                DESIRE SEQUENCE
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {agent.desire.map((stone, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      background: `${STONE_COLORS[stone]}22`,
                      border: `2px solid ${STONE_COLORS[stone]}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{STONE_SYMBOLS[stone]}</span>
                    <span style={{
                      fontSize: '0.52rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.05em',
                    }}>
                      {stone.toUpperCase()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Memory log */}
            {agent.memory.length > 0 && (
              <div style={{
                marginBottom: 16,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 6,
                borderLeft: '2px solid var(--accent-2)',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  MEMORY LOG
                </div>
                {agent.memory.slice(-2).map((m, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-2)' }}>› </span>
                    {m}
                  </div>
                ))}
              </div>
            )}

            {/* Echo builder */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.2em',
                marginBottom: 8,
              }}>
                ECHO SEQUENCE ({echoSequence.length}/3)
              </div>
              <div style={{ display: 'flex', gap: 6, minHeight: 52, alignItems: 'center' }}>
                {echoSequence.length === 0 ? (
                  <div style={{ color: 'var(--text-hint)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    Select stones below…
                  </div>
                ) : (
                  echoSequence.map((stone, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 8,
                        background: `${STONE_COLORS[stone]}33`,
                        border: `2px solid ${STONE_COLORS[stone]}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: `0 0 12px ${STONE_COLORS[stone]}66`,
                      }}
                    >
                      {STONE_SYMBOLS[stone]}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Stone picker */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {stones.map(stone => (
                <button
                  key={stone}
                  onClick={() => addEchoStone(stone)}
                  disabled={echoSequence.length >= 3}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 8,
                    background: `${STONE_COLORS[stone]}26`,
                    border: `1px solid ${STONE_COLORS[stone]}99`,
                    color: 'var(--text-secondary)',
                    cursor: echoSequence.length >= 3 ? 'not-allowed' : 'pointer',
                    opacity: echoSequence.length >= 3 ? 0.72 : 1,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', color: STONE_COLORS[stone] }}>{STONE_SYMBOLS[stone]}</span>
                  <span>{stone.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Result overlay */}
            <AnimatePresence>
              {lastEchoResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: lastEchoResult === 'success'
                      ? 'rgba(46,125,50,0.85)'
                      : 'rgba(166,58,46,0.85)',
                    borderRadius: 12,
                    zIndex: 10,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>
                      {lastEchoResult === 'success' ? '✦' : '◈'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      color: 'var(--text)',
                      letterSpacing: '0.15em',
                    }}>
                      {lastEchoResult === 'success' ? 'ECHO RESONATES' : 'ECHO REJECTED'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearEchoSequence}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(211,47,47,0.3)',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                }}
              >
                CLEAR
              </button>
              <button
                onClick={castEcho}
                disabled={echoSequence.length === 0}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: echoSequence.length === 0
                    ? 'rgba(211,47,47,0.2)'
                    : 'var(--primary)',
                  border: '1px solid var(--primary)',
                  color: 'var(--text)',
                  borderRadius: 8,
                  cursor: echoSequence.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.15em',
                  transition: 'all 0.15s',
                  opacity: echoSequence.length === 0 ? 0.65 : 1,
                }}
              >
                CAST ECHO
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
