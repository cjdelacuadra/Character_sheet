/**
 * Modal primitive matching the app's catalog-modal look: dimmed backdrop
 * (click to close), centered card, display-font title, boxed × button,
 * Escape to close. Width can be overridden per modal via `width`.
 */
import { useEffect, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  onClose: () => void
  /** CSS width for the card, e.g. '720px'. Defaults to the standard min(560px, 92vw). */
  width?: string
  children: ReactNode
}

export function Modal({ title, onClose, width, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={width ? { width: `min(${width}, 92vw)` } : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** The standard modal search input (toolbar style). */
export function ModalSearch(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className={styles.search}
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      placeholder={props.placeholder ?? 'Search…'}
    />
  )
}
