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

  const handleConnect = (wallet: WalletOption) => {
    void (async () => {
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
        useGameStore.setState({ walletConnectPending: false })
      }
    })()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(360px, 90vw)',
          background: 'rgba(26,26,26,0.98)',
          border: '1px solid rgba(211,47,47,0.4)',
          borderRadius: 14,
          padding: '28px 24px',
        }}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '1rem',
          color: 'var(--accent-2)', letterSpacing: '0.2em', marginBottom: 6,
        }}>
          CONNECT WALLET
        </h3>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--text-muted)', marginBottom: 20,
        }}>
          Sign a message to open your session on the Monad network.
        </p>

        {wallets.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            color: 'var(--accent-2)', marginBottom: 16, textAlign: 'center',
          }}>
            No wallet detected. Install{' '}
            <a href="https://rabby.io" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)' }}>
              Rabby
            </a>{' '}
            and refresh.
          </p>
        ) : (
          wallets.map(wallet => (
            <button
              key={wallet.id}
              type="button"
              disabled={walletConnectPending}
              onClick={() => handleConnect(wallet)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                width: '100%', padding: '14px 16px', marginBottom: 10,
                background: 'rgba(211,47,47,0.08)',
                border: '1px solid rgba(211,47,47,0.25)',
                borderRadius: 10, cursor: walletConnectPending ? 'wait' : 'pointer',
                opacity: walletConnectPending ? 0.75 : 1,
                transition: 'all 0.15s',
                fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{wallet.icon}</span>
              <span>{walletConnectPending ? 'CONNECTING…' : wallet.name.toUpperCase()}</span>
            </button>
          ))
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px',
            background: 'none', border: '1px solid rgba(255,248,231,0.18)',
            borderRadius: 8, cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          }}
        >
          CANCEL
        </button>
      </motion.div>
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
