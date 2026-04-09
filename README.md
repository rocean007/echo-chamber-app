# Echo Chamber — full stack

Real-time 1v1-style session (**you vs server bot**) with an authoritative Node backend and a React + Vite + Three.js client.

## Prerequisites

- Node.js 18+

## Run locally

**Terminal 1 — backend**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
cp .env.example .env   # optional; defaults match localhost:3001
npm run dev
```

Open **http://localhost:5173**. The UI connects to **WebSocket `ws://localhost:3001`** and REST **`http://localhost:3001`**. Content Security Policy allows those origins explicitly.

## Security notes (short)

- Backend validates WebSocket payloads with **Joi** (strict `type` discriminator, unknown fields stripped).
- **Wallet** strings are restricted to hex / `0x` style (mock-friendly); this is **not** cryptographic verification — add SIWE later for real auth.
- **Express** JSON body limit **16kb**; **rate limit** on `/api/*`; **helmet** enabled; **CORS** limited to `FRONTEND_URL`; WebSocket **Origin** checked against the same allowlist (plus `localhost` / `127.0.0.1` pairing).
- Per-socket **message rate limit** (default 10/s).

## Production

Set `FRONTEND_URL` to your real SPA origin, `NODE_ENV=production`, and `VITE_API_URL` / `VITE_WS_URL` to your deployed API host. Update CSP `connect-src` in `frontend/index.html` and `vite.config.ts` to match.
