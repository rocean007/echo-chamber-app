/**
 * First-party cookie helpers (client-side only — HttpOnly not available in browser).
 * UNHACKABLE-ish: SameSite + Secure (prod) reduces CSRF / accidental leakage over HTTP.
 */

export interface CookieSetOptions {
  maxAgeSeconds?: number
  path?: string
  domain?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
  /** In production builds, defaults true when on HTTPS. */
  secure?: boolean
}

function isHttps(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'https:'
}

export function setCookie(
  name: string,
  value: string,
  options: CookieSetOptions = {},
): void {
  if (typeof document === 'undefined') return

  const {
    maxAgeSeconds = 365 * 24 * 60 * 60,
    path = '/',
    domain,
    sameSite = 'Lax',
  } = options

  const secure =
    options.secure ??
    (import.meta.env.PROD && isHttps())

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  cookie += `; Path=${path}`
  cookie += `; Max-Age=${maxAgeSeconds}`
  cookie += `; SameSite=${sameSite}`
  if (secure) cookie += '; Secure'
  if (domain) cookie += `; Domain=${domain}`

  document.cookie = cookie
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const key = `${encodeURIComponent(name)}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const p = part.trim()
    if (p.startsWith(key)) return decodeURIComponent(p.slice(key.length))
  }
  return null
}

export function deleteCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=; Path=${path}; Max-Age=0; SameSite=Lax`
}
