import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ConsentContextValue = {
  openPreferenceCenter: () => void
  closePreferenceCenter: () => void
  preferenceCenterOpen: boolean
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferenceCenterOpen, setPreferenceCenterOpen] = useState(false)

  const openPreferenceCenter = useCallback(() => setPreferenceCenterOpen(true), [])
  const closePreferenceCenter = useCallback(() => setPreferenceCenterOpen(false), [])

  const value = useMemo(
    () => ({
      openPreferenceCenter,
      closePreferenceCenter,
      preferenceCenterOpen,
    }),
    [openPreferenceCenter, closePreferenceCenter, preferenceCenterOpen],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsentShell() {
  const ctx = useContext(ConsentContext)
  if (!ctx) {
    throw new Error('useConsentShell must be used within ConsentProvider')
  }
  return ctx
}
