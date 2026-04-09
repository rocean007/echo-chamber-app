/**
 * WebSocket bridge — authoritative game state from the Echo Chamber backend.
 * No circular import: this module must not import the store at module load time.
 */
import type { GameState, GamePhase, WorldState, LeaderboardEntry, Agent } from '../store/gameStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type StoreApi = {
  getState: () => GameState
  setState: (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void
}

let storeApi: StoreApi | null = null
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let intentionalClose = false

const EMPTY_WORLD: WorldState = {
  biomes: ['mushroom_forest', 'crystal_desert', 'magma_plains', 'ash_tundra'],
  structureCount: 0,
  dominance: { player1: 0, player2: 0, neutral: 100 },
}

function lobbyReset(): Partial<GameState> {
  return {
    phase: 'lobby',
    agents: [],
    matchId: null,
    worldSeed: null,
    selectedAgentId: null,
    echoSequence: [],
    score: { player1: 0, player2: 0 },
    turnCount: 0,
    lastEchoResult: null,
    worldState: { ...EMPTY_WORLD },
  }
}

/** Apply server match snapshot (strip fields the client does not keep in root). */
function applyMatchState(raw: Record<string, unknown>) {
  if (!storeApi) return
  storeApi.setState({
    matchId: raw.matchId as string,
    worldSeed: raw.worldSeed as number,
    phase: raw.phase as GamePhase,
    agents: raw.agents as Agent[],
    score: raw.score as GameState['score'],
    worldState: raw.worldState as WorldState,
    turnCount: raw.turnCount as number,
    selectedAgentId: (raw.selectedAgentId as string | null) ?? null,
    echoSequence: (raw.echoSequence as GameState['echoSequence']) ?? [],
    lastEchoResult: (raw.lastEchoResult as GameState['lastEchoResult']) ?? null,
  })
}

export function registerGameStore(api: StoreApi) {
  storeApi = api
}

export function sendGameMessage(payload: object): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false
  try {
    ws.send(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export async function fetchLeaderboard(limit = 50): Promise<void> {
  if (!storeApi) return
  try {
    const r = await fetch(`${API_URL}/api/leaderboard?limit=${limit}`)
    if (!r.ok) return
    const data = (await r.json()) as { leaderboard: LeaderboardEntry[] }
    storeApi.setState({ leaderboard: data.leaderboard })
  } catch {
    /* offline or CORS — keep existing leaderboard */
  }
}

export function connectGameSocket() {
  intentionalClose = false
  if (typeof WebSocket === 'undefined') return

  storeApi?.setState({ networkStatus: 'connecting', networkError: null })

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  try {
    ws = new WebSocket(WS_URL)
  } catch {
    storeApi?.setState({
      networkStatus: 'error',
      networkError: 'Invalid WebSocket URL',
    })
    scheduleReconnect()
    return
  }

  ws.onopen = () => {
    storeApi?.setState({ networkStatus: 'ready', networkError: null })
    ws?.send(JSON.stringify({ type: 'PING' }))
    const { walletConnected, walletAddress } = storeApi?.getState() ?? {}
    if (walletConnected && walletAddress) {
      ws?.send(JSON.stringify({ type: 'CONNECT_WALLET', walletAddress }))
    }
    void fetchLeaderboard()
  }

  ws.onmessage = (ev) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(ev.data as string) as Record<string, unknown>
    } catch {
      return
    }
    const type = msg.type as string

    switch (type) {
      case 'PHASE_CHANGED': {
        const phase = msg.phase as GamePhase
        if (phase === 'lobby') storeApi?.setState(lobbyReset())
        else storeApi?.setState({ phase })
        break
      }
      case 'WALLET_CONNECTED':
        storeApi?.setState({
          walletConnected: true,
          walletAddress: msg.walletAddress as string,
        })
        void fetchLeaderboard()
        break
      case 'WALLET_DISCONNECTED':
        storeApi?.setState({ walletConnected: false, walletAddress: '' })
        break
      case 'MATCH_STARTED':
        applyMatchState(msg.state as Record<string, unknown>)
        break
      case 'STATE_UPDATE':
        applyMatchState(msg.state as Record<string, unknown>)
        break
      case 'ECHO_RESULT':
        applyMatchState(msg.state as Record<string, unknown>)
        break
      case 'LEADERBOARD':
        storeApi?.setState({ leaderboard: msg.leaderboard as LeaderboardEntry[] })
        break
      case 'ERROR':
        storeApi?.setState({ networkError: String(msg.message ?? 'Server error') })
        break
      case 'PONG':
        break
      default:
        break
    }
  }

  ws.onclose = () => {
    if (intentionalClose) return
    storeApi?.setState({
      networkStatus: 'offline',
      networkError: 'Disconnected from server — retrying…',
    })
    scheduleReconnect()
  }

  ws.onerror = () => {
    storeApi?.setState({
      networkStatus: 'error',
      networkError: 'WebSocket error — is the backend running?',
    })
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectGameSocket()
  }, 2500)
}

export function disconnectGameSocket() {
  intentionalClose = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  ws?.close()
  ws = null
}
