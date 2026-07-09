import type { Condition, ConditionEffect } from '@/entities/condition/types'
import { Section, TextField, TextAreaField, SelectField } from '../formFields'
import styles from '../ContentEditor.module.css'

const AFFECTS = ['ac', 'attack', 'saving-throw', 'speed', 'ability-check', 'other'] as const
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
type MechanicKind = 'flag' | 'speedMultiplier' | 'acDelta' | 'flatSaveDelta'

interface Props {
  draft: Condition
  onChange: (next: Condition) => void
}

export function ConditionEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<Condition>) => onChange({ ...draft, ...patch })
  const setEffect = (i: number, patch: Partial<ConditionEffect>) =>
    set({ effects: draft.effects.map((e, j) => (j === i ? { ...e, ...patch } : e)) })

  function setMechanicKind(i: number, kind: MechanicKind | '') {
    const mechanic: ConditionEffect['mechanic'] =
      kind === '' ? undefined :
      kind === 'flag' ? { kind: 'flag' } :
      kind === 'speedMultiplier' ? { kind: 'speedMultiplier', value: 0.5 } :
      kind === 'acDelta' ? { kind: 'acDelta', value: -2 } :
      { kind: 'flatSaveDelta', ability: 'dex', value: -2 }
    setEffect(i, { mechanic })
  }

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <SelectField
        label="Category" value={draft.category}
        onChange={category => set({ category: category as Condition['category'] })}
        options={['debuff', 'buff', 'neutral'].map(c => ({ value: c, label: c }))}
      />
      <TextAreaField label="Description" rows={4} value={draft.description} onChange={description => set({ description })} />

      <Section>Effects</Section>
      {draft.effects.map((effect, i) => {
        const m = effect.mechanic
        return (
          <div key={i} className={styles.subRow} style={{ flexWrap: 'wrap' }}>
            <select
              className={styles.formSelect} style={{ flex: '0 0 120px' }}
              value={effect.affects}
              onChange={e => setEffect(i, { affects: e.target.value as ConditionEffect['affects'] })}
            >
              {AFFECTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              className={styles.formInput}
              value={effect.description}
              placeholder="what it does…"
              onChange={e => setEffect(i, { description: e.target.value })}
            />
            <select
              className={styles.formSelect} style={{ flex: '0 0 140px' }}
              value={m?.kind ?? ''}
              onChange={e => setMechanicKind(i, e.target.value as MechanicKind | '')}
            >
              <option value="">no mechanic</option>
              <option value="flag">flag (note only)</option>
              <option value="speedMultiplier">speed ×</option>
              <option value="acDelta">AC delta</option>
              <option value="flatSaveDelta">save delta</option>
            </select>
            {m?.kind === 'speedMultiplier' && (
              <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" step={0.5} min={0} max={4}
                value={m.value} onChange={e => setEffect(i, { mechanic: { kind: 'speedMultiplier', value: Number(e.target.value) } })} />
            )}
            {m?.kind === 'acDelta' && (
              <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={-10} max={10}
                value={m.value} onChange={e => setEffect(i, { mechanic: { kind: 'acDelta', value: Number(e.target.value) } })} />
            )}
            {m?.kind === 'flatSaveDelta' && (
              <>
                <select className={styles.formSelect} style={{ flex: '0 0 70px' }} value={m.ability}
                  onChange={e => setEffect(i, { mechanic: { kind: 'flatSaveDelta', ability: e.target.value as typeof ABILITIES[number], value: m.value } })}>
                  {ABILITIES.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                </select>
                <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={-10} max={10}
                  value={m.value} onChange={e => setEffect(i, { mechanic: { kind: 'flatSaveDelta', ability: m.ability, value: Number(e.target.value) } })} />
              </>
            )}
            <button className={styles.subRemove} onClick={() => set({ effects: draft.effects.filter((_, j) => j !== i) })}>×</button>
          </div>
        )
      })}
      <button
        className={styles.subAdd}
        onClick={() => set({ effects: [...draft.effects, { affects: 'other', description: '' }] })}
      >+ effect</button>
    </div>
  )
}
