import type { ReactNode } from 'react'
import type { AbilityScores } from '@/entities/character/types'
import styles from './ContentEditor.module.css'

export function Section({ children }: { children: ReactNode }) {
  return <div className={styles.formSection}>{children}</div>
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.formRow}>
      <span className={styles.formLabel}>{label}</span>
      {children}
    </div>
  )
}

export function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <Row label={label}>
      <input className={styles.formInput} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </Row>
  )
}

export function NumberField({ label, value, onChange, min, max }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number
}) {
  return (
    <Row label={label}>
      <input
        className={`${styles.formInput} ${styles.formInputSm}`}
        type="number" min={min} max={max}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Row>
  )
}

export function TextAreaField({ label, value, onChange, rows }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <Row label={label}>
      <textarea className={styles.formTextarea} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
    </Row>
  )
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <Row label={label}>
      <select className={styles.formSelect} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Row>
  )
}

export function CheckboxField({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <Row label={label}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
    </Row>
  )
}

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

/** Six compact per-ability number inputs; empty = no bonus (field omitted). */
export function AbilityBonusField({ label, value, onChange }: {
  label: string
  value: Partial<AbilityScores> | undefined
  onChange: (v: Partial<AbilityScores> | undefined) => void
}) {
  function set(ab: typeof ABILITIES[number], raw: string) {
    const next = { ...(value ?? {}) }
    if (raw === '' || Number(raw) === 0) delete next[ab]
    else next[ab] = Number(raw)
    onChange(Object.keys(next).length ? next : undefined)
  }
  return (
    <Row label={label}>
      <div className={styles.abilityGrid}>
        {ABILITIES.map(ab => (
          <label key={ab}>
            {ab.toUpperCase()}
            <input type="number" min={-10} max={10} value={value?.[ab] ?? ''} onChange={e => set(ab, e.target.value)} />
          </label>
        ))}
      </div>
    </Row>
  )
}

/** Comma-separated id list with validation against a known-id lookup. */
export function IdListField({ label, value, onChange, known, hint }: {
  label: string
  value: string[] | undefined
  onChange: (v: string[] | undefined) => void
  known?: Record<string, unknown>
  hint?: string
}) {
  const ids = value ?? []
  const unknown = known ? ids.filter(id => !known[id]) : []
  return (
    <Row label={label}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          className={styles.formInput}
          style={{ width: '100%' }}
          value={ids.join(', ')}
          placeholder={hint}
          onChange={e => {
            const next = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            onChange(next.length ? next : undefined)
          }}
        />
        {unknown.length > 0 && <div className={styles.jsonError}>unknown: {unknown.join(', ')}</div>}
      </div>
    </Row>
  )
}
