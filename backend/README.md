# Echo Chamber — Backend Server

Authoritative Node.js backend for **Echo Chamber: The Living Protocol**.

---

## Quick Start

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

- REST API: `http://localhost:3001/api`
- WebSocket: `ws://localhost:3001`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP/WS port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |
| `AGENT_COUNT` | `12` | Agents per match |
| `BOT_DELAY_MS` | `1500` | Bot move delay after player echo |
| `MATCHMAKING_DELAY_MS` | `3000` | Simulated matchmaking wait |
| `LEADERBOARD_SIZE` | `100` | Max leaderboard entries |
| `NODE_ENV` | `development` | Enables seed endpoint |

---

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server status |
| `GET` | `/api/leaderboard?limit=50` | Top players |
| `GET` | `/api/leaderboard/:address` | Single player stats |
| `POST` | `/api/leaderboard/seed` | Seed test data (dev only) |

---

## WebSocket Protocol

Connect: `ws://localhost:3001`

All messages are JSON. Every message has a `type` field.

---

### Client → Server

#### `CONNECT_WALLET`
```json
{ "type": "CONNECT_WALLET", "walletAddress": "0xabc123..." }
```

#### `DISCONNECT_WALLET`
```json
{ "type": "DISCONNECT_WALLET" }
```

#### `START_MATCHMAKING`
```json
{ "type": "START_MATCHMAKING" }
```
Requires wallet connected. After `MATCHMAKING_DELAY_MS` ms, server creates match and sends `MATCH_STARTED`.

#### `SELECT_AGENT`
```json
{ "type": "SELECT_AGENT", "agentId": "uuid-or-null" }
```
Clears echoSequence and lastEchoResult.

#### `ADD_ECHO_STONE`
```json
{ "type": "ADD_ECHO_STONE", "stone": "Growth" }
```
Valid stones: `Growth | Decay | Light | Shadow`. Max sequence length 3.

#### `CLEAR_ECHO_SEQUENCE`
```json
{ "type": "CLEAR_ECHO_SEQUENCE" }
```

#### `CAST_ECHO`
```json
{ "type": "CAST_ECHO" }
```
Uses `selectedAgentId` + `echoSequence` already on the server. Server responds with `ECHO_RESULT`.

#### `SET_PHASE`
```json
{ "type": "SET_PHASE", "phase": "lobby" }
```
Only `lobby` is accepted from client (for post-gameover return).

#### `RESET_LAST_RESULT`
```json
{ "type": "RESET_LAST_RESULT" }
```
Mirrors `resetLastResult()` in the store — call after 1.5s to clear the result banner.

#### `GET_LEADERBOARD`
```json
{ "type": "GET_LEADERBOARD", "limit": 50 }
```

#### `PING`
```json
{ "type": "PING" }
```

---

### Server → Client

#### `PHASE_CHANGED`
```json
{ "type": "PHASE_CHANGED", "phase": "lobby | matchmaking | playing | gameover" }
```

#### `WALLET_CONNECTED`
```json
{ "type": "WALLET_CONNECTED", "walletAddress": "0x..." }
```

#### `WALLET_DISCONNECTED`
```json
{ "type": "WALLET_DISCONNECTED" }
```

#### `MATCH_STARTED`
```json
{
  "type": "MATCH_STARTED",
  "matchId": "uuid",
  "worldSeed": 1234567890,
  "state": { ...full MatchState... }
}
```
**`worldSeed`** — pass into `generateWorld(worldSeed)` in `World.tsx` so terrain is deterministic and matches between server and client.

#### `STATE_UPDATE`
```json
{ "type": "STATE_UPDATE", "state": { ...full MatchState... } }
```
Sent after any state change: agent selection, echo stone added, bot move, etc.

#### `ECHO_RESULT`
```json
{
  "type": "ECHO_RESULT",
  "success": true,
  "error": null,
  "state": { ...full MatchState... }
}
```

#### `LEADERBOARD`
```json
{ "type": "LEADERBOARD", "leaderboard": [ { "rank": 1, "address": "0x...", "wins": 10, "echoes": 42, "agents": 37 }, ... ] }
```

#### `ERROR`
```json
{ "type": "ERROR", "message": "..." }
```

#### `PONG`
```json
{ "type": "PONG" }
```

---

## MatchState Shape

```js
{
  matchId:         string,
  worldSeed:       number,       // deterministic terrain seed
  walletAddress:   string,
  phase:           GamePhase,
  agents:          Agent[],
  score:           { player1: number, player2: number },
  worldState: {
    biomes:         BiomeType[],
    structureCount: number,
    dominance:      { player1: number, player2: number, neutral: number }
  },
  turnCount:       number,
  selectedAgentId: string | null,
  echoSequence:    EchoStone[],  // max length 3
  lastEchoResult:  'success' | 'fail' | null,
  startedAt:       number,       // Date.now()
}
```

---

## Agent Shape

```js
{
  id:          string,
  name:        string,
  position:    [number, number, number],  // [x, 0, z] on XZ ring
  faction:     'neutral' | 'player1' | 'player2',
  desire:      EchoStone[],     // length 1–3, answer key for castEcho
  personality: string,
  memory:      string[],        // append-only
  biome:       BiomeType,
  converted:   boolean,
  pulsePhase:  number,
}
```

---

## Frontend Integration

### Add to `frontend/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### `gameStore.ts` — Replace local logic with WebSocket calls:

```ts
// On app mount
const ws = new WebSocket(import.meta.env.VITE_WS_URL);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'PHASE_CHANGED':   set({ phase: msg.phase }); break;
    case 'MATCH_STARTED':
      set({ ...msg.state, worldSeed: msg.worldSeed });
      // Pass msg.worldSeed into World.tsx → generateWorld(worldSeed)
      break;
    case 'STATE_UPDATE':    set(msg.state); break;
    case 'ECHO_RESULT':     set(msg.state); break;
    case 'LEADERBOARD':     set({ leaderboard: msg.leaderboard }); break;
  }
};

// Actions become ws.send() calls:
const connectWallet   = (address) => ws.send(JSON.stringify({ type: 'CONNECT_WALLET', walletAddress: address }));
const startMatchmaking= () => ws.send(JSON.stringify({ type: 'START_MATCHMAKING' }));
const selectAgent     = (id)  => ws.send(JSON.stringify({ type: 'SELECT_AGENT', agentId: id }));
const addEchoStone    = (s)   => ws.send(JSON.stringify({ type: 'ADD_ECHO_STONE', stone: s }));
const clearEchoSequence = ()  => ws.send(JSON.stringify({ type: 'CLEAR_ECHO_SEQUENCE' }));
const castEcho        = ()    => ws.send(JSON.stringify({ type: 'CAST_ECHO' }));
const resetLastResult = ()    => ws.send(JSON.stringify({ type: 'RESET_LAST_RESULT' }));
```

### `World.tsx` — Accept seed:
```ts
// Change:
const world = useMemo(() => generateWorld(), []);
// To:
const seed = useGameStore(s => s.worldSeed);
const world = useMemo(() => generateWorld(seed), [seed]);
```

### `Leaderboard.tsx` — Use REST or WS:
```ts
// REST:
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/leaderboard`)
    .then(r => r.json())
    .then(d => set({ leaderboard: d.leaderboard }));
}, []);

// Or WS:
ws.send(JSON.stringify({ type: 'GET_LEADERBOARD', limit: 50 }));
```

---

## Known Inconsistencies (spec-aligned behaviour)

### Win condition split
The current frontend has **two** win checks that disagree:
- `castEcho()` ends the game when `dominance.player1 > 50` (strict `>`).
- `App.tsx` game over screen uses `score.player1 > score.player2`.

**This backend mirrors `dominance.player1 > 50` as the authoritative end condition** (server side). The game over screen in `App.tsx` should be updated to show `dominance.player1 > dominance.player2` or just trust the `phase === 'gameover'` flag from the server.

### Bot gameover
The reference client does **not** run a gameover check after the bot (player2) move. This backend mirrors that behaviour intentionally — the bot can never win in the current implementation. If you want the bot to be able to win, add a `dominance.player2 > 50` check inside `scheduleBotMove()` in `gameEngine.js`.

### `converted` flag
The `Agent.converted` field is kept for type compatibility but the UI infers conversion from `faction`. This backend sets `converted: true` on successful echo, matching the type definition.

---

## Architecture

```
server.js
  ├── Express (helmet, cors, rate-limit)
  │     ├── /api/health
  │     └── /api/leaderboard   ← leaderboard.js
  │
  └── WebSocketServer
        └── matchManager.js
              ├── connections: Map<id, ConnectionMeta>
              ├── matches: Map<matchId, MatchState>
              ├── handleConnection(ws)
              ├── startMatchmaking()  ← createMatch() from gameEngine.js
              └── handleMessage()
                    └── castEcho()   ← gameEngine.js (authoritative)
                          └── generateAgents(seed) ← agents.js
                                └── createRng(seed) ← rng.js
```
