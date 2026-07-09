import type { FeatDef } from '@/shared/data/featsData'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { StatBlockEditor } from '../StatBlockEditor'
import { Section, TextField, TextAreaField, AbilityBonusField, IdListField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

interface Props {
  draft: FeatDef
  onChange: (next: FeatDef) => void
}

export function FeatEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<FeatDef>) => onChange({ ...draft, ...patch })

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <TextAreaField label="Description" rows={4} value={draft.description} onChange={description => set({ description })} />

      <Section>Mechanics</Section>
      <AbilityBonusField label="Ability bonus" value={draft.abilityBonus} onChange={abilityBonus => set({ abilityBonus })} />
      <Row label="Ability choice">
        <div className={styles.abilityGrid}>
          {ABILITIES.map(ab => (
            <label key={ab}>
              {ab.toUpperCase()}
              <input
                type="checkbox"
                checked={draft.abilityChoice?.includes(ab) ?? false}
                onChange={e => {
                  const current = draft.abilityChoice ?? []
                  const next = e.target.checked ? [...current, ab] : current.filter(x => x !== ab)
                  set({ abilityChoice: next.length ? next : undefined })
                }}
              />
            </label>
          ))}
        </div>
      </Row>
      <IdListField label="Granted spells" value={draft.grantedSpells} onChange={grantedSpells => set({ grantedSpells })} known={SPELL_BY_ID} hint="spell ids, comma-separated" />
      <IdListField label="Free casts" value={draft.freeCastSpells} onChange={freeCastSpells => set({ freeCastSpells })} known={SPELL_BY_ID} hint="once/long-rest spell ids" />

      <Section>Grants resources</Section>
      {Object.entries(draft.grantsResources ?? {}).map(([name, amount], i) => (
        <div key={i} className={styles.subRow}>
          <input
            className={styles.formInput}
            value={name}
            onChange={e => {
              const entries = Object.entries(draft.grantsResources ?? {})
              entries[i] = [e.target.value, amount]
              set({ grantsResources: Object.fromEntries(entries) })
            }}
          />
          <input
            className={`${styles.formInput} ${styles.formInputSm}`}
            type="number" min={1} max={20}
            value={amount}
            onChange={e => set({ grantsResources: { ...draft.grantsResources, [name]: Number(e.target.value) } })}
          />
          <button
            className={styles.subRemove}
            onClick={() => {
              const next = { ...draft.grantsResources }
              delete next[name]
              set({ grantsResources: Object.keys(next).length ? next : undefined })
            }}
          >×</button>
        </div>
      ))}
      <button className={styles.subAdd} onClick={() => set({ grantsResources: { ...draft.grantsResources, 'New Resource': 1 } })}>
        + resource pool
      </button>

      <Section>Passive wiring (stats)</Section>
      <StatBlockEditor
        value={draft.stats ?? {}}
        onChange={stats => set({ stats: Object.keys(stats).length ? stats : undefined })}
      />
    </div>
  )
}
