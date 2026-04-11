/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WS_URL?: string
  /** Monad chain for Rabby (default 10143 testnet; mainnet is 143). Must match backend AUTH_CHAIN_ID. */
  readonly VITE_MONAD_CHAIN_ID?: string
  readonly VITE_MONAD_CHAIN_NAME?: string
  readonly VITE_MONAD_RPC_URL?: string
  readonly VITE_MONAD_EXPLORER_URL?: string
  /** Optional GA4 measurement ID — enable analytics consent + CSP updates */
  readonly VITE_GA_MEASUREMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
