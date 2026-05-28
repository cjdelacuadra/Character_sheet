import { useState } from 'react'
import type { SummonAttack, SummonTemplate, SummonType } from '@/entities/summon/types'
import styles from './SummonEditorForm.module.css'

const DAMAGE_PATTERN = /^\d+d\d+([+-]\d+)?$|^\d+$|^—$/
const TYPES: SummonType[] = ['creature', 'structure', 'object']

interface Props {
  initial?: SummonTemplate
  onSave: (t: SummonTemplate) => void
  onCancel: () => void
}

interface FormAttack {
  id: string
  name: string
  toHit: string
  damage: string
  damageType: string
  notes: string
}

function toFormAttack(a: SummonAttack): FormAttack {
  return { id: a.id, name: a.name, toHit: a.toHit, damage: a.damage, damageType: a.damageType ?? '', notes: a.notes ?? '' }
}

export function SummonEditorForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<SummonType>(initial?.type ?? 'creature')
  const [maxHp, setMaxHp] = useState(String(initial?.maxHp ?? 1))
  const [maxHpFormula, setMaxHpFormula] = useState(initial?.maxHpFormula ?? '')
  const [ac, setAc] = useState(String(initial?.ac ?? 10))
  const [speed, setSpeed] = useState(initial?.speed ?? '30 ft')
  const [initiativeMod, setInitiativeMod] = useState(String(initial?.initiativeMod ?? 0))
  const [actions, setActions] = useState(String(initial?.actionEconomy.actions ?? 1))
  const [bonusActions, setBonusActions] = useState(String(initial?.actionEconomy.bonusActions ?? 1))
  const [reactions, setReactions] = useState(String(initial?.actionEconomy.reactions ?? 1))
  const [attacks, setAttacks] = useState<FormAttack[]>(initial?.attacks.map(toFormAttack) ?? [])
  const [spells, setSpells] = useState((initial?.spells ?? []).join(', '))
  const [defaultNotes, setDefaultNotes] = useState(initial?.defaultNotes ?? '')
  const [error, setError] = useState<string | null>(null)

  function addAttack() {
    setAttacks([...attacks, { id: crypto.randomUUID(), name: '', toHit: '', damage: '', damageType: '', notes: '' }])
  }
  function updateAttack(id: string, patch: Partial<FormAttack>) {
    setAttacks(attacks.map(a => a.id === id ? { ...a, ...patch } : a))
  }
  function removeAttack(id: string) {
    setAttacks(attacks.filter(a => a.id !== id))
  }

  function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('Name is required.'); return }
    const hp = parseInt(maxHp, 10)
    if (isNaN(hp) || hp < 1) { setError('Max HP must be a positive number.'); return }
    const acNum = parseInt(ac, 10)
    if (isNaN(acNum)) { setError('AC must be a number.'); return }
    const initMod = parseInt(initiativeMod, 10)
    if (isNaN(initMod)) { setError('Initiative modifier must be a number.'); return }

    for (const a of attacks) {
      if (!a.name.trim()) { setError('Each attack needs a name.'); return }
      const dmg = a.damage.trim()
      if (dmg && !DAMAGE_PATTERN.test(dmg)) {
        setError(`Attack "${a.name}" damage must be like 1d6, 2d6+3, or a number.`); return
      }
    }
    setError(null)

    const cleanedAttacks: SummonAttack[] = attacks.map(a => ({
      id: a.id,
      name: a.name.trim(),
      toHit: a.toHit.trim(),
      damage: a.damage.trim() || '—',
      damageType: a.damageType.trim() || undefined,
      notes: a.notes.trim() || undefined,
    }))
    const cleanedSpells = spells.split(',').map(s => s.trim()).filter(Boolean)

    const template: SummonTemplate = {
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmedName,
      type,
      source: initial?.source ?? 'custom',
      maxHp: hp,
      maxHpFormula: maxHpFormula.trim() || undefined,
      ac: acNum,
      speed: speed.trim() || '—',
      initiativeMod: initMod,
      attacks: cleanedAttacks,
      actionEconomy: {
        actions: Math.max(0, parseInt(actions, 10) || 0),
        bonusActions: Math.max(0, parseInt(bonusActions, 10) || 0),
        reactions: Math.max(0, parseInt(reactions, 10) || 0),
      },
      spells: cleanedSpells.length > 0 ? cleanedSpells : undefined,
      defaultNotes: defaultNotes.trim() || undefined,
    }
    onSave(template)
  }

  return (
    <div className={styles.form}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Name *</span>
          <input className={styles.input} value={name} autoFocus placeholder="e.g. Giant Spider" onChange={e => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Type</span>
          <select className={styles.input} value={type} onChange={e => setType(e.target.value as SummonType)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Max HP *</span>
          <input className={styles.input} type="number" value={maxHp} onChange={e => setMaxHp(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>HP formula (note)</span>
          <input className={styles.input} value={maxHpFormula} placeholder="5 × level" onChange={e => setMaxHpFormula(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>AC *</span>
          <input className={styles.input} type="number" value={ac} onChange={e => setAc(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Speed</span>
          <input className={styles.input} value={speed} placeholder="30 ft" onChange={e => setSpeed(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Initiative mod</span>
          <input className={styles.input} type="number" value={initiativeMod} onChange={e => setInitiativeMod(e.target.value)} />
        </label>
      </div>

      <div className={styles.economyRow}>
        <span className={styles.economyLabel}>Per turn:</span>
        <label className={styles.economyField}>
          <span>Actions</span>
          <input className={styles.economyInput} type="number" min={0} value={actions} onChange={e => setActions(e.target.value)} />
        </label>
        <label className={styles.economyField}>
          <span>Bonus</span>
          <input className={styles.economyInput} type="number" min={0} value={bonusActions} onChange={e => setBonusActions(e.target.value)} />
        </label>
        <label className={styles.economyField}>
          <span>Reactions</span>
          <input className={styles.economyInput} type="number" min={0} value={reactions} onChange={e => setReactions(e.target.value)} />
        </label>
      </div>

      <div className={styles.attacksSection}>
        <div className={styles.attacksHead}>
          <span className={styles.sectionLabel}>Attacks</span>
          <button className={styles.addBtn} type="button" onClick={addAttack}>+ Attack</button>
        </div>
        {attacks.map(a => (
          <div key={a.id} className={styles.attackRow}>
            <input className={styles.attackName} value={a.name} placeholder="Name" onChange={e => updateAttack(a.id, { name: e.target.value })} />
            <input className={styles.attackSmall} value={a.toHit} placeholder="+4" onChange={e => updateAttack(a.id, { toHit: e.target.value })} />
            <input className={styles.attackSmall} value={a.damage} placeholder="1d6+2" onChange={e => updateAttack(a.id, { damage: e.target.value })} />
            <input className={styles.attackSmall} value={a.damageType} placeholder="type" onChange={e => updateAttack(a.id, { damageType: e.target.value })} />
            <button className={styles.removeAttack} type="button" onClick={() => removeAttack(a.id)}>×</button>
          </div>
        ))}
      </div>

      <label className={styles.field}>
        <span>Spells (comma-separated, optional)</span>
        <input className={styles.input} value={spells} placeholder="Fire Bolt, Misty Step" onChange={e => setSpells(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>Default notes</span>
        <textarea className={styles.textarea} value={defaultNotes} rows={2} onChange={e => setDefaultNotes(e.target.value)} />
      </label>

      {error && <span className={styles.error}>{error}</span>}

      <div className={styles.formBtns}>
        <button className={styles.cancelBtn} type="button" onClick={onCancel}>Cancel</button>
        <button className={styles.saveBtn} type="button" onClick={handleSave}>{initial ? 'Save Changes' : 'Create Template'}</button>
      </div>
    </div>
  )
}
