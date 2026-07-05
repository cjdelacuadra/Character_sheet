/**
 * The left-column panel primitive: header (label + count + action buttons),
 * list body, empty note, and collapsible groups — the SummonsPanel pattern
 * every panel follows, extracted so ported panels share one implementation
 * and stay pixel-identical to v2.
 */
import { useState, type ReactNode } from 'react'
import styles from './Panel.module.css'

export interface PanelAction {
  label: string
  onClick: () => void
  title?: string
}

interface PanelProps {
  label: string
  count?: number
  actions?: PanelAction[]
  children: ReactNode
}

export function Panel({ label, count, actions = [], children }: PanelProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>
          {label} {count !== undefined && count > 0 && `(${count})`}
        </span>
        {actions.length > 0 && (
          <div className={styles.headActions}>
            {actions.map(a => (
              <button key={a.label} className={styles.headBtn} onClick={a.onClick} title={a.title}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.list}>{children}</div>
    </section>
  )
}

export function PanelEmptyNote({ children }: { children: ReactNode }) {
  return <span className={styles.emptyNote}>{children}</span>
}

interface PanelRowProps {
  selected?: boolean
  dim?: boolean
  onClick?: () => void
  children: ReactNode
}

/** A selectable row (button) in a panel list. */
export function PanelRow({ selected, dim, onClick, children }: PanelRowProps) {
  return (
    <button
      className={`${styles.row}${selected ? ` ${styles.rowSelected}` : ''}${dim ? ` ${styles.rowDim}` : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Collapse-state helper shared by grouped panels. */
export function useCollapsedGroups(): { isCollapsed: (key: string) => boolean; toggle: (key: string) => void } {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  return {
    isCollapsed: (key) => collapsed.has(key),
    toggle: (key) =>
      setCollapsed(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
  }
}

interface PanelGroupProps {
  name: string
  count: number
  collapsed: boolean
  onToggle: () => void
  /** Hide the group header when a panel has a single group (SummonsPanel behavior). */
  showHeader?: boolean
  children: ReactNode
}

export function PanelGroup({ name, count, collapsed, onToggle, showHeader = true, children }: PanelGroupProps) {
  return (
    <div className={styles.group}>
      {showHeader && (
        <button className={styles.groupHeader} onClick={onToggle}>
          <span className={styles.groupArrow}>{collapsed ? '▶' : '▼'}</span>
          <span className={styles.groupName}>{name}</span>
          <span className={styles.groupCount}>{count}</span>
        </button>
      )}
      {!collapsed && children}
    </div>
  )
}
