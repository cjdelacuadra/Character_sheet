import { useState } from 'react'
import type { SpellEntry } from '@/shared/data/spellData'
import { Section, TextField, TextAreaField, SelectField, NumberField, CheckboxField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']
const DAMAGE_TYPES = ['slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force']

interface Props {
  draft: SpellEntry
  onChange: (next: SpellEntry) => void
}

export function SpellEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<SpellEntry>) => onChange({ ...draft, ...patch })
  const setAttackBuff = (patch: Partial<NonNullable<SpellEntry['attackBuff']>>) => {
    const next = { ...draft.attackBuff, ...patch }
    const has = next.toHit !== undefined || next.toHitDice || next.bonusDmg || next.bonusDmgType
    set({ attackBuff: has ? next : undefined })
  }
  const [advanced, setAdvanced] = useState(() => JSON.stringify(draft, null, 2))
  const [advError, setAdvError] = useState('')

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <NumberField label="Level (0=cantrip)" value={draft.level} onChange={level => set({ level: level ?? 0 })} min={0} max={9} />
      <SelectField label="School" value={draft.school} onChange={school => set({ school: school as SpellEntry['school'] })}
        options={SCHOOLS.map(s => ({ value: s, label: s }))} />
      <TextField label="Casting time" value={draft.castingTime} onChange={castingTime => set({ castingTime })} placeholder="1 action / 1 bonus action / 1 reaction" />
      <TextField label="Range" value={draft.range} onChange={range => set({ range })} placeholder="60ft / Touch / Self" />
      <TextField label="Components" value={draft.components} onChange={components => set({ components })} placeholder="V, S, M (…)" />
      <TextField label="Duration" value={draft.duration} onChange={duration => set({ duration })} placeholder="Instantaneous / Concentration, 1 minute" />
      <CheckboxField label="Concentration" value={draft.concentration ?? false} onChange={v => set({ concentration: v || undefined })} />
      <TextAreaField label="Description" rows={4} value={draft.description} onChange={description => set({ description })} />

      <Section>Damage / save</Section>
      <SelectField label="Attack type" value={draft.attackType ?? ''}
        onChange={v => set({ attackType: (v || undefined) as SpellEntry['attackType'] })}
        options={[{ value: '', label: 'none' }, { value: 'attack-roll', label: 'attack roll' }, { value: 'save', label: 'saving throw' }]} />
      {draft.attackType === 'save' && (
        <SelectField label="Save ability" value={draft.saveAbility ?? 'dex'}
          onChange={v => set({ saveAbility: v as SpellEntry['saveAbility'] })}
          options={['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => ({ value: a, label: a.toUpperCase() }))} />
      )}
      <TextField label="Damage formula" value={draft.damageFormula ?? ''} onChange={v => set({ damageFormula: v || undefined })} placeholder="8d6" />
      <SelectField label="Damage type" value={draft.damageType ?? ''}
        onChange={v => set({ damageType: v || undefined })}
        options={[{ value: '', label: 'none' }, ...DAMAGE_TYPES.map(dt => ({ value: dt, label: dt }))]} />

      <Section>Buff mechanics</Section>
      <NumberField label="AC bonus" value={draft.acBonus} onChange={acBonus => set({ acBonus })} min={-5} max={10} />
      <NumberField label="Sets base AC" value={draft.setsBaseAC} onChange={setsBaseAC => set({ setsBaseAC })} min={10} max={20} />
      <NumberField label="Speed bonus" value={draft.speedBonus} onChange={speedBonus => set({ speedBonus })} min={-30} max={30} />
      <NumberField label="Speed ×" value={draft.speedMultiplier} onChange={speedMultiplier => set({ speedMultiplier })} min={0} max={4} />
      <TextField label="Save bonus dice" value={draft.saveBonusDice ?? ''} onChange={v => set({ saveBonusDice: v || undefined })} placeholder="1d4 (Bless)" />
      <TextField label="Temp HP" value={draft.grantsTempHp ?? ''} onChange={v => set({ grantsTempHp: v || undefined })} placeholder="1d4+4 (False Life)" />
      <Row label="Attack buff">
        <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={-5} max={10} title="to-hit"
          value={draft.attackBuff?.toHit ?? ''}
          onChange={e => setAttackBuff({ toHit: e.target.value === '' ? undefined : Number(e.target.value) })} />
        <input className={`${styles.formInput} ${styles.formInputSm}`} title="to-hit dice" placeholder="1d4"
          value={draft.attackBuff?.toHitDice ?? ''}
          onChange={e => setAttackBuff({ toHitDice: e.target.value || undefined })} />
        <input className={`${styles.formInput} ${styles.formInputSm}`} title="bonus dmg" placeholder="1d6"
          value={draft.attackBuff?.bonusDmg ?? ''}
          onChange={e => setAttackBuff({ bonusDmg: e.target.value || undefined })} />
        <input className={styles.formInput} title="bonus dmg type" placeholder="radiant / weapon"
          value={draft.attackBuff?.bonusDmgType ?? ''}
          onChange={e => setAttackBuff({ bonusDmgType: e.target.value || undefined })} />
      </Row>
      <div className={styles.formHint}>
        Attack buff rides every weapon attack while the spell is active (Divine Favor, Hunter's Mark pattern).
        Clear all four fields to remove it. Per-turn riders (smites, Aura of Vitality) live under Advanced.
      </div>

      <details className={styles.advancedJson}>
        <summary>Advanced (full entry as JSON — scaling, turn resources, summons, viz…)</summary>
        <textarea
          className={styles.jsonArea}
          value={advanced}
          spellCheck={false}
          onChange={e => {
            setAdvanced(e.target.value)
            try {
              const parsed = JSON.parse(e.target.value) as SpellEntry
              setAdvError('')
              onChange(parsed)
            } catch (err) {
              setAdvError(err instanceof Error ? err.message : String(err))
            }
          }}
        />
        {advError && <div className={styles.jsonError}>⚠ {advError}</div>}
      </details>
    </div>
  )
}
