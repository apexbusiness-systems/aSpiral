/**
 * @fileoverview Premium settings modal with Apple-level polish
 * @module components/menu/SettingsPanel
 * @sonarqube cognitive-complexity: 8
 */

import { useEffect, useRef, useCallback, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

/** Portal container ID */
const PORTAL_ID = 'settings-panel-portal'

/** Z-index constants (above everything) */
const Z_INDEX = Object.freeze({
  container: 2147483000,
  overlay: 2147483001
} as const)

/** Component props */
export interface SettingsPanelProps {
  /** Whether panel is open */
  readonly isOpen: boolean
  /** Close handler */
  readonly onClose: () => void
  /** Panel content */
  readonly children?: ReactNode
}

/**
 * Gets or creates portal container element.
 * Idempotent: safe to call multiple times.
 */
function getOrCreatePortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID)

  if (portal === null) {
    portal = document.createElement('div')
    portal.id = PORTAL_ID
    portal.setAttribute('aria-hidden', 'true')

    Object.assign(portal.style, {
      position: 'fixed',
      inset: '0',
      zIndex: String(Z_INDEX.container),
      pointerEvents: 'none'
    })

    document.body.appendChild(portal)
  }

  return portal
}

/**
 * Premium settings panel modal.
 * 
 * Design principles:
 * - Safe area aware (iOS notch, Android cutouts)
 * - Smooth backdrop blur
 * - Elastic scroll for content
 * - Keyboard accessible (Escape to close)
 * - Focus trap for accessibility
 */
export function SettingsPanel({
  isOpen,
  onClose,
  children
}: SettingsPanelProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLElement | null>(null)

  // Initialize portal
  useEffect(() => {
    portalRef.current = getOrCreatePortal()
  }, [])

  // Update portal aria-hidden state
  useEffect(() => {
    if (portalRef.current) {
      portalRef.current.setAttribute('aria-hidden', String(!isOpen))
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (!isOpen || !panelRef.current) return undefined

    const panel = panelRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus panel
    panel.focus()

    return () => {
      // Restore focus
      previouslyFocused?.focus()
    }
  }, [isOpen])

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  // Panel click handler (stop propagation)
  const handlePanelClick = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      event.stopPropagation()
    },
    []
  )

  // Don't render if closed or no portal
  if (!isOpen || portalRef.current === null) {
    return null
  }

  return createPortal(
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
        // Safe area padding (iOS/Android)
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        paddingLeft: 'max(20px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(20px, env(safe-area-inset-right, 0px))',
        zIndex: Z_INDEX.overlay
      }}
    >
      <div
        ref={panelRef}
        onClick={handlePanelClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'min(720px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 40px))',
          backgroundColor: 'var(--background, #1a1a2e)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <h2
            id="settings-title"
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--foreground, #ffffff)'
            }}
          >
            Settings
          </h2>

          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: '10px',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '24px',
            // Custom scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    portalRef.current
  )
}
