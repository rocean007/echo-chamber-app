import { create } from 'zustand'
import {
  registerGameStore,
  sendGameMessage,
  fetchLeaderboard,
  setGameAuthToken,
  whenSocketOpen,
} from '../services/gameSocket'
import { connectRabbyAndSignIn } from '../services/wallet'

export type EchoStone = 'Growth' | 'Decay' | 'Light' | 'Shadow'
export type AgentFaction = 'neutral' | 'player1' | 'player2'
export type GamePhase = 'lobby' | 'matchmaking' | 'playing' | 'gameover'
export type BiomeType = 'mushroom_forest' | 'crystal_desert' | 'magma_plains' | 'ash_tundra'

export type NetworkStatus = 'offline' | 'connecting' | 'ready' | 'error'

export interface Agent {
  id: string
  name: string
  position: [number, number, number]
  faction: AgentFaction
  desire: EchoStone[]
  personality: string
  memory: string[]
  biome: BiomeType
  converted: boolean
  pulsePhase: number
}

export interface WorldState {
  biomes: BiomeType[]
  structureCount: number
  dominance: { player1: number; player2: number; neutral: number }
}

export interface LeaderboardEntry {
  rank: number
  address: string
  wins: number
  echoes: number
  agents: number
}

export interface GameState {
  phase: GamePhase
  walletConnected: boolean
  walletAddress: string
  agents: Agent[]
  selectedAgentId: string | null
  echoSequence: EchoStone[]
  score: { player1: number; player2: number }
  worldState: WorldState
  leaderboard: LeaderboardEntry[]
  matchId: string | null
  turnCount: number
  lastEchoResult: 'success' | 'fail' | null
  /** Terrain seed from server — pass to generateWorld(worldSeed ?? undefined) */
  worldSeed: number | null
  networkStatus: NetworkStatus
  networkError: string | null
  walletConnectPending: boolean

  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  startMatchmaking: () => void
  selectAgent: (id: string | null) => void
  addEchoStone: (stone: EchoStone) => void
  clearEchoSequence: () => void
  castEcho: () => void
  setPhase: (phase: GamePhase) => void
  resetLastResult: () => void
  refreshLeaderboard: () => void
  clearNetworkError: () => void
}

const STONE_SYMBOLS: Record<EchoStone, string> = {
  Growth: '⬡',
  Decay: '◈',
  Light: '✦',
  Shadow: '◆',
}

export { STONE_SYMBOLS }

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'lobby',
  walletConnected: false,
  walletAddress: '',
  agents: [],
  selectedAgentId: null,
  echoSequence: [],
  score: { player1: 0, player2: 0 },
  worldState: {
    biomes: ['mushroom_forest', 'crystal_desert', 'magma_plains', 'ash_tundra'],
    structureCount: 0,
    dominance: { player1: 0, player2: 0, neutral: 100 },
  },
  leaderboard: [],
  matchId: null,
  turnCount: 0,
  lastEchoResult: null,
  worldSeed: null,
  networkStatus: 'offline',
  networkError: null,
  walletConnectPending: false,

  connectWallet: async () => {
    set({ walletConnectPending: true, networkError: null })
    try {
      const { token } = await connectRabbyAndSignIn()
      setGameAuthToken(token)
      await whenSocketOpen()
      if (!sendGameMessage({ type: 'CONNECT_WALLET', token })) {
        setGameAuthToken(null)
        set({
          networkError:
            'Connected to Rabby but the game socket is closed. Ensure the backend is running and VITE_WS_URL matches the server.',
        })
        return
      }
    } catch (e) {
      setGameAuthToken(null)
      const msg = e instanceof Error ? e.message : 'Wallet connection failed.'
      set({ networkError: msg })
    } finally {
      set({ walletConnectPending: false })
    }
  },

  disconnectWallet: () => {
    setGameAuthToken(null)
    sendGameMessage({ type: 'DISCONNECT_WALLET' })
  },

  startMatchmaking: () => {
    if (!sendGameMessage({ type: 'START_MATCHMAKING' })) {
      set({
        networkError: 'Not connected. Start the backend on port 3001.',
      })
    }
  },

  selectAgent: (id) => {
    sendGameMessage({ type: 'SELECT_AGENT', agentId: id })
  },

  addEchoStone: (stone) => {
    sendGameMessage({ type: 'ADD_ECHO_STONE', stone })
  },

  clearEchoSequence: () => {
    sendGameMessage({ type: 'CLEAR_ECHO_SEQUENCE' })
  },

  castEcho: () => {
    sendGameMessage({ type: 'CAST_ECHO' })
  },

  setPhase: (phase) => {
    if (phase === 'lobby') {
      sendGameMessage({ type: 'SET_PHASE', phase: 'lobby' })
    }
  },

  resetLastResult: () => {
    sendGameMessage({ type: 'RESET_LAST_RESULT' })
  },

  refreshLeaderboard: () => {
    void fetchLeaderboard()
  },

  clearNetworkError: () => set({ networkError: null }),
}))

registerGameStore(useGameStore)
