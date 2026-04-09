import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConsentCategories } from './types'
import { useConsent } from './useConsent'
import { useConsentShell } from './ConsentContext'
import { purgeStorageForRevokedCategories } from './consentStorage'
import { loadAnalyticsIfConsented } from './analytics'

const CATEGORY_COPY: Record<
  keyof ConsentCategories,
  { title: string; body: string; locked?: boolean }
> = {
  necessary: {
    title: 'Strictly necessary',
    body: 'Required for security, load balancing, and core session features. Cannot be disabled.',
    locked: true,
  },
  functional: {
    title: 'Functional',
    body: 'Remember UI choices, language, and quality-of-life settings (e.g. local preferences).',
  },
  analytics: {
    title: 'Analytics',
    body: 'Helps us understand usage patterns and improve performance (e.g. aggregated metrics).',
  },
  targeting: {
    title: 'Targeting / personalisation',
    body: 'Used for relevant content or ads where applicable; may involve third-party partners per your policy.',
  },
}

function Toggle({
  on,
  disabled,
  onToggle,
  id,
  label,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
  id: string
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={onToggle}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: '1px solid rgba(211,47,47,0.35)',
        background: on ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 22 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--panel-ink)',
          transition: 'left 0.15s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}

export function PreferenceCenter() {
  const { record, save, withdraw, categories: live } = useConsent()
  const { preferenceCenterOpen, closePreferenceCenter } = useConsentShell()
  const [draft, setDraft] = useState<ConsentCategories>(live)

  useEffect(() => {
    if (preferenceCenterOpen) {
      setDraft(record?.categories ?? live)
}
  }, [preferenceCenterOpen, record, live])

  const persist = useCallback(() => {
    save(draft)
    purgeStorageForRevokedCategories()
    loadAnalyticsIfConsented()
    closePreferenceCenter()
  }, [draft, save, closePreferenceCenter])

  const onWithdraw = useCallback(() => {
    withdraw()
    purgeStorageForRevokedCategories()
    closePreferenceCenter()
  }, [withdraw, closePreferenceCenter])

  return (
    <AnimatePresence>
      {preferenceCenterOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9600,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreferenceCenter()
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pref-center-title"
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(480px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'rgba(18,18,20,0.98)',
              border: '1px solid rgba(211,47,47,0.35)',
              borderRadius: 14,
              padding: '24px 22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <h2
                id="pref-center-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  letterSpacing: '0.15em',
                  color: 'var(--accent-2)',
                }}
              >
                PREFERENCE CENTER
              </h2>
              <button
                type="button"
                onClick={closePreferenceCenter}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: '1px solid rgba(211,47,47,0.3)',
                  color: 'var(--panel-ink)',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              Adjust categories below. Necessary cookies always stay on. Withdrawing resets optional data according to our retention policy.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(Object.keys(CATEGORY_COPY) as (keyof ConsentCategories)[]).map((key) => {
                const meta = CATEGORY_COPY[key]
                const on = draft[key]
                return (
                  <li
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Toggle
                      id={`toggle-${key}`}
                      label={meta.title}
                      on={on}
                      disabled={meta.locked}
                      onToggle={() => {
                        if (meta.locked) return
                        setDraft((d) => ({ ...d, [key]: !d[key] }))
                      }}
                    />
                    <div>
                      <label htmlFor={`toggle-${key}`} style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--text)', cursor: meta.locked ? 'default' : 'pointer' }}>
                        {meta.title}
                      </label>
                      <p style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {meta.body}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={onWithdraw}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '10px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(211,47,47,0.35)',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                }}
              >
                WITHDRAW ALL OPTIONAL
              </button>
              <button
                type="button"
                onClick={persist}
                style={{
                  flex: 2,
                  minWidth: 160,
                  padding: '10px',
                  background: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  color: 'var(--text)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.78rem',
                  letterSpacing: '0.12em',
                }}
              >
                SAVE PREFERENCES
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
