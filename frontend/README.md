# ECHO CHAMBER — THE LAST PROTOCOL

> A 1v1 psychological strategy Web3 game set in a procedurally generated 3D world.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| 3D | Three.js via React Three Fiber + Drei |
| State | Zustand |
| Animations | Framer Motion |
| Styling | Tailwind CSS + CSS Variables |
| Fonts | Cinzel Decorative, Rajdhani, Share Tech Mono |

---

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build for Production

```bash
npm run build
npm run preview
```

---

## Game Flow

1. **Lobby** — Connect wallet (mocked: MetaMask, WalletConnect, Email)
2. **Matchmaking** — 3-second mock queue finds an opponent
3. **Playing** — 3D world loads with 12 AI Agents
   - Orbit/zoom camera with mouse/touch
   - Click an Agent to open interaction modal
   - Build an Echo sequence (1–3 stones) to match the Agent's Desire
   - Cast Echo — success converts agent, triggers opponent AI response
   - First to convert majority (>50%) wins
4. **Game Over** — Rematch or return to lobby

---

## Project Structure

```
src/
  components/
    GameBoard.tsx      # Three.js Canvas wrapper
    World.tsx          # Procedural 3D terrain + particles
    Agent.tsx          # Individual AI agent (3D octahedron)
    AgentModal.tsx     # Echo-casting interaction panel
    EchoHUD.tsx        # Bottom HUD: stones + score bar
    MatchmakingQueue.tsx
    Leaderboard.tsx
  store/
    gameStore.ts       # Zustand global state
  utils/
    worldGenerator.ts  # Terrain tile generation
    agentGenerator.ts  # Procedural agent creation
  hooks/
    useWebGL.ts        # WebGL support detection
  styles/
    globals.css        # Crimson Aurora palette + utilities
```

---

## Color Palette — Crimson Aurora

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#D32F2F` | Ember Red — CTAs, Player 1 |
| `--secondary` | `#8B0000` | Deep Crimson — backgrounds |
| `--accent-1` | `#FF5722` | Burnt Orange — Player 2 |
| `--accent-2` | `#FFC107` | Pale Gold — highlights |
| `--background` | `#1A1A1A` | Smoked Charcoal |
| `--text` | `#FFF8E7` | Warm Ivory |
| `--success` | `#2E7D32` | Moss Green |
| `--agent-neutral` | `#9E9E9E` | Neutral agents |

---

## WebGL Fallback

If WebGL is unavailable, a friendly error screen is shown automatically via `useWebGL.ts`.

---

## Mobile

- OrbitControls support touch drag/pinch
- UI panels use `min(Xpx, Yvw)` sizing
- Bottom HUD adapts to small screens

---

## Notes

- All blockchain logic is **mocked** — no real transactions occur
- Opponent AI makes random conversions after each player turn
- World state persists for the duration of a match only
- Audio hooks are scaffolded via Web Audio API (extend in `useWebGL.ts` or a new `useAudio.ts`)
