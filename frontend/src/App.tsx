import { useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConsentRoot, useConsentShell } from './consent'
import { useGameStore } from './store/gameStore'
import GameBoardFallback from './components/GameBoardFallback'
import PhaseRouteFallback from './components/PhaseRouteFallback'
import { getAvailableWallets, connectWalletAndSignIn, type WalletOption } from './services/wallet'
import { setGameAuthToken, sendGameMessage, whenSocketOpen } from './services/gameSocket'

const GameBoard = lazy(() => import('./components/GameBoard'))
const MatchmakingQueue = lazy(() => import('./components/MatchmakingQueue'))
const GameOverScreen = lazy(() => import('./components/GameOverScreen'))
const EchoHUD = lazy(() => import('./components/EchoHUD'))
const AgentModal = lazy(() => import('./components/AgentModal'))
const Leaderboard = lazy(() => import('./components/Leaderboard'))

function WalletModal({ onClose }: { onClose: () => void }) {
  const { walletConnectPending } = useGameStore()
  const [wallets] = useState<WalletOption[]>(() => getAvailableWallets())
  const [connecting, setConnecting] = useState<string | null>(null)

  const WALLET_META: Record<string, { color: string; label: string; icon: string }> = {
    rabby:    { color: '#7B5EA7', label: 'Rabby',           icon: '🐰' },
    metamask: { color: '#E8831D', label: 'MetaMask',        icon: '🦊' },
    coinbase: { color: '#1652F0', label: 'Coinbase Wallet', icon: '🔵' },
    brave:    { color: '#FB542B', label: 'Brave Wallet',    icon: '🦁' },
    injected: { color: '#6B7280', label: 'Injected Wallet', icon: '👛' },
  }

  const detectedIds = new Set(wallets.map(w => w.id))
  const recommended = ['metamask', 'coinbase', 'brave'].filter(id => !detectedIds.has(id))

  const handleConnect = (wallet: WalletOption) => {
    void (async () => {
      setConnecting(wallet.id)
      useGameStore.setState({ walletConnectPending: true, networkError: null })
      try {
        const { token } = await connectWalletAndSignIn(wallet.provider)
        setGameAuthToken(token)
        await whenSocketOpen()
        if (!sendGameMessage({ type: 'CONNECT_WALLET', token })) {
          setGameAuthToken(null)
          useGameStore.setState({ networkError: 'Socket not ready. Is the backend running?' })
          return
        }
        const deadline = Date.now() + 8000
        while (Date.now() < deadline) {
          const s = useGameStore.getState()
          if (s.walletConnected) { onClose(); return }
          if (s.networkError) return
          await new Promise(r => setTimeout(r, 100))
        }
      } catch (e) {
        setGameAuthToken(null)
        const msg = e instanceof Error ? e.message : 'Wallet connection failed.'
        useGameStore.setState({ networkError: msg })
      } finally {
        setConnecting(null)
        useGameStore.setState({ walletConnectPending: false })
      }
    })()
  }

  const WalletRow = ({ wallet, sublabel }: { wallet: WalletOption; sublabel?: string }) => {
    const meta = WALLET_META[wallet.id] ?? WALLET_META.injected
    const isConnecting = connecting === wallet.id
    return (
      <button
        disabled={walletConnectPending}
        onClick={() => handleConnect(wallet)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '9px 12px',
          background: 'transparent', border: 'none',
          borderRadius: 10, cursor: walletConnectPending ? 'wait' : 'pointer',
          transition: 'background 0.1s', textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#fff' }}>{meta.label}</p>
          {sublabel && (
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{sublabel}</p>
          )}
        </div>
        {isConnecting ? (
          <div style={{
            width: 14, height: 14, flexShrink: 0,
            border: '2px solid #333', borderTopColor: meta.color,
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M6 3l5 5-5 5" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    )
  }

  const NotInstalledRow = ({ id }: { id: string }) => {
    const meta = WALLET_META[id]
    if (!meta) return null
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px', borderRadius: 10, opacity: 0.4,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {meta.icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#fff' }}>{meta.label}</p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Not installed</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(740px, 94vw)',
          background: '#111',
          borderRadius: 20,
          border: '1px solid #1f1f1f',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Left panel ── */}
        <div style={{
          width: 260, flexShrink: 0,
          borderRight: '1px solid #1f1f1f',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '20px 16px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#fff' }}>
              Connect a Wallet
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                color: '#6b7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
            {wallets.length > 0 && (
              <>
                <p style={{
                  fontSize: 11, color: '#4b5563', letterSpacing: '0.05em',
                  padding: '4px 8px 6px', margin: 0, textTransform: 'uppercase',
                }}>
                  Installed
                </p>
                {wallets.map((w, i) => (
                  <WalletRow key={w.id} wallet={w} sublabel={i === 0 ? 'Recent' : undefined} />
                ))}
              </>
            )}

            {recommended.length > 0 && (
              <>
                <p style={{
                  fontSize: 11, color: '#4b5563', letterSpacing: '0.05em',
                  padding: '12px 8px 6px', margin: 0, textTransform: 'uppercase',
                }}>
                  Recommended
                </p>
                {recommended.map(id => (
                  <NotInstalledRow key={id} id={id} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', gap: 28,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>
            What is a Wallet?
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                🏦
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 4px' }}>
                  A Home for your Digital Assets
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  Wallets store and manage your on-chain identity, tokens, and assets across any app.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                🔑
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 4px' }}>
                  A New Way to Log In
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  No passwords. Sign a message with your wallet to prove ownership and open your session.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            
            <a
              href="https://rabby.io"
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1, padding: '11px 0', textAlign: 'center' as const,
                background: '#fff', color: '#111',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', display: 'block',
              }}
            >
              Get a Wallet
            </a>
            
            <a
              href="https://learn.rabby.io"
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1, padding: '11px 0', textAlign: 'center' as const,
                background: '#1a1a1a', color: '#fff',
                border: '1px solid #2a2a2a',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', display: 'block',
              }}
            >
              Learn More
            </a>
          </div>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

function LobbyScreen() {
  const { walletConnected, walletAddress, walletConnectPending, startMatchmaking, disconnectWallet } = useGameStore()
  const { openPreferenceCenter } = useConsentShell()
  const [showWallet, setShowWallet] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(139,0,0,0.2) 0%, rgba(26,26,26,0.98) 70%)',
        }}
      >
        {/* Animated background rings */}
        {[1,2,3].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.05, 0.1] }}
            transition={{ duration: 4, delay: i * 1.2, repeat: Infinity }}
            style={{
              position: 'absolute',
              width: `${200 + i * 120}px`,
              height: `${200 + i * 120}px`,
              border: '1px solid var(--primary)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Title */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.5em',
            color: 'var(--accent-2)',
            marginBottom: 12,
          }}>
            ◈ ◈ ◈
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
            color: 'var(--text)',
            letterSpacing: '0.08em',
            lineHeight: 1.1,
            textShadow: '0 0 40px rgba(211,47,47,0.6)',
          }}>
            ECHO CHAMBER
          </h1>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(0.6rem, 1.8vw, 0.85rem)',
            color: 'var(--primary)',
            letterSpacing: '0.35em',
            marginTop: 8,
          }}>
            THE LAST PROTOCOL
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginTop: 16,
            maxWidth: 320,
            lineHeight: 1.7,
          }}>
            A 1v1 psychological strategy protocol.<br/>
            Persuade. Convert. Dominate the chamber.
          </div>
        </motion.div>

        {/* Wallet / Actions */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 'min(300px, 85vw)' }}
        >
          {walletConnected ? (
            <>
              <div style={{
                padding: '8px 16px',
                background: 'rgba(46,125,50,0.15)',
                border: '1px solid rgba(46,125,50,0.4)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: '#4CAF50',
                width: '100%',
                textAlign: 'center',
              }}>
                ✓ {walletAddress.slice(0, 16)}…
              </div>
              <button
                onClick={startMatchmaking}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(211,47,47,0.5)',
                  transition: 'all 0.2s',
                }}
              >
                ENTER PROTOCOL
              </button>
              <button
                onClick={disconnectWallet}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-hint)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                  cursor: 'pointer', letterSpacing: '0.1em',
                }}
              >
                disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={walletConnectPending}
              onClick={() => setShowWallet(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: '2px solid var(--primary)',
                borderRadius: 10,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                letterSpacing: '0.2em',
                cursor: walletConnectPending ? 'wait' : 'pointer',
                opacity: walletConnectPending ? 0.7 : 1,
                boxShadow: '0 0 24px rgba(211,47,47,0.25)',
                transition: 'all 0.2s',
              }}
            >
              CONNECT WALLET
            </button>
          )}
        </motion.div>

        {/* Bottom credits */}
        <div style={{
          position: 'absolute', bottom: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: 'var(--text-hint)',
          letterSpacing: '0.2em',
          textAlign: 'center',
          width: '100%',
          left: 0,
        }}>
          PROTOCOL v0.1.0 — RABBY / MONAD SIGN-IN
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
              letterSpacing: '0.15em',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            COOKIES
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
      </AnimatePresence>
    </>
  )
}

function ConnectionBanner() {
  const { networkStatus, networkError, clearNetworkError } = useGameStore()
  if (networkStatus === 'ready' && !networkError) return null
  const label =
    networkStatus === 'connecting'
      ? 'Connecting to protocol server…'
      : networkError || 'Disconnected from server'
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '10px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
        letterSpacing: '0.08em',
        background:
          networkStatus === 'connecting'
            ? 'rgba(255,193,7,0.15)'
            : 'rgba(166,58,46,0.2)',
        borderTop: '1px solid rgba(211,47,47,0.35)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span>{label}</span>
      {networkError ? (
        <button
          type="button"
          onClick={clearNetworkError}
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,248,231,0.2)',
            color: 'var(--text-muted)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
          }}
        >
          DISMISS
        </button>
      ) : null}
    </div>
  )
}

function AppContent() {
  const { phase } = useGameStore()

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <ConnectionBanner />
      <Suspense fallback={<GameBoardFallback />}>
        <GameBoard />
      </Suspense>

      <Suspense fallback={<PhaseRouteFallback />}>
        <AnimatePresence>
          {(phase === 'lobby') && <LobbyScreen key="lobby" />}
          {phase === 'matchmaking' && <MatchmakingQueue key="matchmaking" />}
          {phase === 'gameover' && <GameOverScreen key="gameover" />}
        </AnimatePresence>
      </Suspense>

      {phase === 'playing' && (
        <Suspense fallback={null}>
          <EchoHUD />
          <AgentModal />
          <Leaderboard />
        </Suspense>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ConsentRoot>
      <AppContent />
    </ConsentRoot>
  )
}
