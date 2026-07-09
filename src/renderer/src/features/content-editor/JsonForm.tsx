import { useState } from 'react'
import styles from './ContentEditor.module.css'

interface Props<T> {
  draft: T
  onChange: (next: T) => void
}

/**
 * Fallback editor: the raw entry as editable JSON. Every catalog view works
 * through this from day one; dedicated forms replace it field by field.
 * Host must remount on selection change (key={draft.id}) so the textarea
 * resets without effect-driven state sync.
 */
export function JsonForm<T extends { id: string }>({ draft, onChange }: Props<T>) {
  const [text, setText] = useState(() => JSON.stringify(draft, null, 2))
  const [error, setError] = useState('')

  function handleChange(value: string) {
    setText(value)
    try {
      const parsed = JSON.parse(value) as T
      if (typeof parsed.id !== 'string' || !parsed.id) throw new Error('entry needs a non-empty string "id"')
      setError('')
      onChange(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      <textarea
        className={styles.jsonArea}
        value={text}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
      />
      {error && <div className={styles.jsonError}>⚠ {error}</div>}
    </div>
  )
}
