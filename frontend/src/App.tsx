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

  const WALLET_META: Record<string, { color: string; icon: string }> = {
    rabby:    { color: '#8B5CF6', icon: '👛' },
    metamask: { color: '#FF6B35', icon: '🦊' },
    coinbase: { color: '#1652F0', icon: '🔵' },
    brave:    { color: '#FB542B', icon: '🦁' },
    injected: { color: '#888780', icon: '💳' },
  }

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

  const ALL_WALLETS = ['rabby', 'metamask', 'coinbase', 'brave']
  const detectedIds = new Set(wallets.map(w => w.id))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(380px, 92vw)',
          background: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 14px' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase' }}>
            Echo Chamber
          </p>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 4px', color: '#111' }}>
            Connect wallet
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            Sign a message to authenticate. No gas required.
          </p>
        </div>

        {/* Wallet list */}
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ALL_WALLETS.map(id => {
            const detected = detectedIds.has(id)
            const wallet = wallets.find(w => w.id === id)
            const meta = WALLET_META[id]
            const isConnecting = connecting === id
            const names: Record<string, string> = {
              rabby: 'Rabby', metamask: 'MetaMask', coinbase: 'Coinbase Wallet', brave: 'Brave Wallet'
            }
            return (
              <button
                key={id}
                disabled={!detected || walletConnectPending}
                onClick={() => wallet && handleConnect(wallet)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '11px 10px',
                  background: 'transparent',
                  border: '1px solid #f3f4f6',
                  borderRadius: 10,
                  cursor: detected && !walletConnectPending ? 'pointer' : 'default',
                  opacity: detected ? 1 : 0.45,
                  transition: 'background 0.1s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (detected) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: meta.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 18,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#111' }}>{names[id]}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    {isConnecting ? 'Connecting…' : detected ? 'Detected' : 'Not installed'}
                  </p>
                </div>
                {detected && !isConnecting && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {isConnecting && (
                  <div style={{
                    width: 14, height: 14, border: '2px solid #e5e7eb',
                    borderTopColor: meta.color, borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px 18px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            New to wallets?{' '}
            <a href="https://rabby.io" target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Get Rabby
            </a>
          </p>
          <button
            onClick={onClose}
            style={{
              fontSize: 13, color: '#6b7280', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Cancel
          </button>
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
