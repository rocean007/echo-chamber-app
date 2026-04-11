import { BrowserProvider, getAddress } from 'ethers'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isRabby?: boolean
  isMetaMask?: boolean
  isBraveWallet?: boolean
  isCoinbaseWallet?: boolean
  providers?: Eip1193Provider[]
  [key: string]: unknown
}

export type WalletOption = {
  id: string
  name: string
  icon: string
  provider: Eip1193Provider
}

function getWindowEthereum(): (Eip1193Provider & { providers?: Eip1193Provider[] }) | null {
  const w = window as unknown as { ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] } }
  return w.ethereum ?? null
}

export function getAvailableWallets(): WalletOption[] {
  const eth = getWindowEthereum()
  if (!eth) return []

  const candidates: Eip1193Provider[] = Array.isArray(eth.providers)
    ? eth.providers
    : [eth]

  const wallets: WalletOption[] = []

  for (const p of candidates) {
    if (p.isRabby) {
      wallets.push({ id: 'rabby', name: 'Rabby', icon: '🐰', provider: p })
    } else if (p.isBraveWallet) {
      wallets.push({ id: 'brave', name: 'Brave Wallet', icon: '🦁', provider: p })
    } else if (p.isCoinbaseWallet) {
      wallets.push({ id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', provider: p })
    } else if (p.isMetaMask) {
      wallets.push({ id: 'metamask', name: 'MetaMask', icon: '🦊', provider: p })
    } else {
      wallets.push({ id: 'injected', name: 'Injected Wallet', icon: '👛', provider: p })
    }
  }

  // deduplicate by id
  return wallets.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i)
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
    const msg = (err as { message?: string })?.message ?? ''
    const chainNotFound = code === 4902 || code === -32603 || msg.toLowerCase().includes('unrecognized chain')
    if (!chainNotFound) throw err
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

export type SignInResult = {
  address: string
  token: string
}

export async function connectWalletAndSignIn(provider: Eip1193Provider): Promise<SignInResult> {
  console.log('1. ensureMonadNetwork...')
  await ensureMonadNetwork(provider)

  console.log('2. requesting accounts...')
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const raw = accounts[0]
  if (!raw || typeof raw !== 'string') throw new Error('Wallet did not return an account.')
  const address = getAddress(raw).toLowerCase()
  console.log('3. address:', address)

  console.log('4. fetching nonce from', `${API_URL}/api/auth/nonce`)
  const nonceRes = await fetch(`${API_URL}/api/auth/nonce?address=${encodeURIComponent(address)}`)
  console.log('5. nonce response status:', nonceRes.status)
  if (!nonceRes.ok) {
    const err = await nonceRes.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Could not start sign-in.')
  }
  const { nonce, message } = (await nonceRes.json()) as { nonce: string; message: string }
  console.log('6. nonce:', nonce)
  console.log('7. message:', message)

  console.log('8. requesting signature...')
  const browserProvider = new BrowserProvider(provider)
  const signer = await browserProvider.getSigner()
  const signature = await signer.signMessage(message)
  console.log('9. signature:', signature)

  console.log('10. verifying...')
  const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, nonce, signature }),
  })
  console.log('11. verify status:', verifyRes.status)
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Signature verification failed.')
  }
  const { token } = (await verifyRes.json()) as { token: string }
  if (!token || typeof token !== 'string') throw new Error('Invalid response from server.')

  return { address, token }
}

// keep backward compat
export async function connectRabbyAndSignIn(): Promise<SignInResult> {
  const wallets = getAvailableWallets()
  const rabby = wallets.find(w => w.id === 'rabby')
  if (!rabby) throw new Error('Rabby not found. Install it from rabby.io.')
  return connectWalletAndSignIn(rabby.provider)
}