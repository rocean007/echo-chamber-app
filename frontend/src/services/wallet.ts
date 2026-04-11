import { BrowserProvider, getAddress } from 'ethers'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isRabby?: boolean
  providers?: Eip1193Provider[]
}

function getInjectedEthereum(): Eip1193Provider | null {
  const w = window as unknown as { ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] } }
  const eth = w.ethereum
  if (!eth) return null
  if (eth.isRabby) return eth
  const list = eth.providers
  if (Array.isArray(list)) {
    const rabby = list.find((p) => p.isRabby)
    if (rabby) return rabby
  }
  return eth
}

export function isRabbyAvailable(): boolean {
  const p = getInjectedEthereum()
  return Boolean(p?.isRabby)
}

function monadChainConfig() {
  const id = Number(import.meta.env.VITE_MONAD_CHAIN_ID ?? 10143)
  const name = import.meta.env.VITE_MONAD_CHAIN_NAME ?? (id === 143 ? 'Monad Mainnet' : 'Monad Testnet')
  const rpc =
    import.meta.env.VITE_MONAD_RPC_URL ??
    (id === 143 ? 'https://rpc.monad.xyz' : 'https://testnet-rpc.monad.xyz')
  const explorer =
    import.meta.env.VITE_MONAD_EXPLORER_URL ??
    (id === 143 ? 'https://monadvision.com' : 'https://testnet.monadvision.com')
  return { chainId: id, name, rpc, explorer }
}

async function ensureMonadNetwork(provider: Eip1193Provider): Promise<void> {
  const { chainId, name, rpc, explorer } = monadChainConfig()
  const hexId = `0x${chainId.toString(16)}`
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexId }],
    })
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code !== 4902) throw err
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexId,
          chainName: name,
          nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
          rpcUrls: [rpc],
          blockExplorerUrls: [explorer],
        },
      ],
    })
  }
}

export type RabbySignInResult = {
  address: string
  token: string
}

/**
 * Connect Rabby (or the Rabby-priority injected stack), switch to Monad, sign the server nonce message, exchange for an API token.
 */
export async function connectRabbyAndSignIn(): Promise<RabbySignInResult> {
  const provider = getInjectedEthereum()
  if (!provider) {
    throw new Error('No wallet found. Install Rabby and refresh this page.')
  }
  if (!provider.isRabby) {
    throw new Error('Rabby was not detected. Set Rabby as your default wallet or install it from rabby.io.')
  }

  await ensureMonadNetwork(provider)

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const raw = accounts[0]
  if (!raw || typeof raw !== 'string') {
    throw new Error('Wallet did not return an account.')
  }
  const address = getAddress(raw).toLowerCase()

  const nonceRes = await fetch(`${API_URL}/api/auth/nonce?address=${encodeURIComponent(address)}`)
  if (!nonceRes.ok) {
    const err = await nonceRes.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Could not start sign-in (check API URL and CORS).')
  }
  const { nonce, message } = (await nonceRes.json()) as { nonce: string; message: string }

  const browserProvider = new BrowserProvider(provider)
  const signer = await browserProvider.getSigner()
  const signature = await signer.signMessage(message)

  const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, nonce, signature }),
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Signature verification failed.')
  }
  const { token } = (await verifyRes.json()) as { token: string }
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid response from server.')
  }

  return { address, token }
}
