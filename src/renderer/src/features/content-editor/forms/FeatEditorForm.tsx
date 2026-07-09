import { useState } from 'react'
import type { FeatDef } from '@/shared/data/featsData'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { ACTIONS } from '@/shared/data/actionsData'
import { actionsCatalog } from '@/shared/data/contentCatalogs'
import { knownResourceNames } from '../resourceNames'
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
  const [spendCreated, setSpendCreated] = useState<Record<string, boolean>>({})
  const resourceNames = knownResourceNames()

  /** A resource nothing spends yet gets a one-click always-available spend action. */
  async function createSpendAction(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    await actionsCatalog.save({
      id: `spend-${slug}`,
      name: `Use ${name}`,
      type: 'Action',
      generic: true,
      resourceKey: name,
      resourceCost: 1,
      short: `Spend 1 ${name}.`,
      full: `Spend one point from your ${name} pool. Edit this action in the Actions view to describe what it does.`,
    })
    setSpendCreated(prev => ({ ...prev, [name]: true }))
  }

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
      <datalist id="known-resource-names">
        {resourceNames.map(n => <option key={n} value={n} />)}
      </datalist>
      {Object.entries(draft.grantsResources ?? {}).map(([name, amount], i) => {
        const isSpent = ACTIONS.some(a => a.resourceKey === name) || spendCreated[name]
        return (
        <div key={i} className={styles.subRow}>
          <input
            className={styles.formInput}
            value={name}
            list="known-resource-names"
            placeholder="existing or new resource name"
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
          {!isSpent && name && (
            <button
              className={styles.subAdd}
              style={{ margin: 0, whiteSpace: 'nowrap' }}
              title="Nothing spends this pool yet - create an always-available action that consumes 1"
              onClick={() => createSpendAction(name)}
            >+ spend action</button>
          )}
          {spendCreated[name] && <span className={styles.formHint}>action created</span>}
          <button
            className={styles.subRemove}
            onClick={() => {
              const next = { ...draft.grantsResources }
              delete next[name]
              set({ grantsResources: Object.keys(next).length ? next : undefined })
            }}
          >×</button>
        </div>
      )})}
      <div className={styles.formHint}>
        Pick an existing pool (Ki, Sorcery Points, ...) or type a new name. New pools recover on long
        rest; "+ spend action" creates the action that consumes them (refine it in the Actions view).
      </div>
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
