import { useState } from 'react'
import { FEAT_BY_ID, setGrantedSpellMode, type FeatDef, type GrantedSpellMode } from '@/shared/data/featsData'
import { SPELLS, SPELL_BY_ID } from '@/shared/data/spellData'
import { SKILL_BY_KEY, type Skill } from '@/shared/data/skills'
import { ACTIONS } from '@/shared/data/actionsData'
import { CLASSES } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { actionsCatalog } from '@/shared/data/contentCatalogs'
import { buildSpendAction, knownResourceNames, type SpendActionMode } from '../resourceNames'
import { StatBlockEditor } from '../StatBlockEditor'
import { Section, TextField, TextAreaField, SelectField, AbilityBonusField, IdListField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const SPEND_ACTION_MODES: SpendActionMode[] = ['Action', 'Bonus Action', 'Reaction', 'Inside attack', 'Inside spell / other']
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

interface Props {
  draft: FeatDef
  onChange: (next: FeatDef) => void
}

export function FeatEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<FeatDef>) => onChange({ ...draft, ...patch })
  const [spendCreated, setSpendCreated] = useState<Record<string, boolean>>({})
  const [spendModes, setSpendModes] = useState<Record<string, SpendActionMode>>({})
  const [spellSearch, setSpellSearch] = useState('')
  const [spellSchool, setSpellSchool] = useState('')
  const resourceNames = knownResourceNames()
  const grantedSpellIds = draft.grantedSpells ?? []
  const spellResults = SPELLS
    .filter(spell => !grantedSpellIds.includes(spell.id))
    .filter(spell => spell.name.toLowerCase().includes(spellSearch.toLowerCase()))
    .filter(spell => !spellSchool || spell.school === spellSchool)
    .slice(0, 20)

  function freeCastMode(spellId: string): GrantedSpellMode {
    if (!(draft.freeCastSpells ?? []).includes(spellId)) return 'none'
    return draft.freeCastRecharge?.[spellId] === 'short' ? 'short' : 'long'
  }

  function removeGrantedSpell(spellId: string) {
    const grantedSpells = grantedSpellIds.filter(id => id !== spellId)
    const freeCastSpells = (draft.freeCastSpells ?? []).filter(id => id !== spellId)
    const freeCastRecharge = { ...(draft.freeCastRecharge ?? {}) }
    delete freeCastRecharge[spellId]
    set({
      grantedSpells: grantedSpells.length ? grantedSpells : undefined,
      freeCastSpells: freeCastSpells.length ? freeCastSpells : undefined,
      freeCastRecharge: Object.keys(freeCastRecharge).length ? freeCastRecharge : undefined,
    })
  }

  /** A resource nothing spends yet gets a one-click always-available spend action. */
  async function createSpendAction(name: string, mode: SpendActionMode) {
    await actionsCatalog.save(buildSpendAction(name, mode))
    setSpendCreated(prev => ({ ...prev, [name]: true }))
  }

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <TextAreaField label="Description" rows={4} value={draft.description} onChange={description => set({ description })} />

      <Section>General</Section>
      <SelectField
        label="Triggered"
        value={draft.trigger && draft.trigger !== 'passive' ? draft.trigger : ''}
        onChange={trigger => set({ trigger: trigger ? trigger as FeatDef['trigger'] : undefined })}
        options={[
          { value: '', label: 'Passive' },
          { value: 'action', label: 'Action' },
          { value: 'bonus', label: 'Bonus action' },
          { value: 'reaction', label: 'Reaction' },
          { value: 'on-attack', label: 'On attack' },
          { value: 'on-hit', label: 'On hit' },
          { value: 'on-damaged', label: 'When damaged' },
          { value: 'once-per-turn', label: 'Once per turn' },
        ]}
      />

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
      <Section>Granted spells</Section>
      <Row label="Search">
        <input
          className={styles.formInput}
          value={spellSearch}
          placeholder="spell name"
          onChange={e => setSpellSearch(e.target.value)}
        />
        <select className={styles.formSelect} value={spellSchool} onChange={e => setSpellSchool(e.target.value)}>
          <option value="">All schools</option>
          {SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}
        </select>
      </Row>
      <div className={styles.subList}>
        {spellResults.map(spell => (
          <button
            key={spell.id}
            className={styles.subAdd}
            style={{ margin: 0, textAlign: 'left' }}
            onClick={() => set({ grantedSpells: [...grantedSpellIds, spell.id] })}
          >
            {spell.name}
          </button>
        ))}
      </div>
      {grantedSpellIds.map(spellId => {
        const spell = SPELL_BY_ID[spellId]
        return (
          <div key={spellId} className={styles.subRow}>
            <span className={styles.formHint} style={{ flex: 1 }}>{spell?.name ?? spellId}</span>
            <select
              className={styles.formSelect}
              style={{ flex: '0 0 120px' }}
              value={freeCastMode(spellId)}
              onChange={e => onChange(setGrantedSpellMode(draft, spellId, e.target.value as GrantedSpellMode))}
            >
              <option value="none">none</option>
              <option value="short">short rest</option>
              <option value="long">long rest</option>
            </select>
            <button className={styles.subRemove} onClick={() => removeGrantedSpell(spellId)}>x</button>
          </div>
        )
      })}

      <Section>Proficiencies</Section>
      <IdListField
        label="Skills"
        value={draft.grantsProficiencies?.skills}
        onChange={skills => set({ grantsProficiencies: { ...(draft.grantsProficiencies ?? {}), skills: skills as Skill[] | undefined } })}
        known={SKILL_BY_KEY}
        hint="skill ids, comma-separated"
      />
      <Row label="Saving throws">
        <div className={styles.abilityGrid}>
          {ABILITIES.map(ab => (
            <label key={ab}>
              {ab.toUpperCase()}
              <input
                type="checkbox"
                checked={draft.grantsProficiencies?.savingThrows?.includes(ab) ?? false}
                onChange={e => {
                  const current = draft.grantsProficiencies?.savingThrows ?? []
                  const savingThrows = e.target.checked ? [...current, ab] : current.filter(x => x !== ab)
                  set({ grantsProficiencies: { ...(draft.grantsProficiencies ?? {}), savingThrows: savingThrows.length ? savingThrows : undefined } })
                }}
              />
            </label>
          ))}
        </div>
      </Row>
      <Row label="Weapons">
        <input
          className={styles.formInput}
          value={draft.grantsProficiencies?.weapons?.join(', ') ?? ''}
          placeholder="weapon names, or Martial / Simple"
          onChange={e => {
            const weapons = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            set({ grantsProficiencies: { ...(draft.grantsProficiencies ?? {}), weapons: weapons.length ? weapons : undefined } })
          }}
        />
      </Row>

      <Section>Prerequisites</Section>
      <datalist id="feat-prereq-classes">
        {CLASSES.map(cls => <option key={cls.id} value={cls.id} />)}
      </datalist>
      <Row label="Classes">
        <input
          className={styles.formInput}
          list="feat-prereq-classes"
          value={draft.prerequisites?.classes?.join(', ') ?? ''}
          placeholder="class ids, comma-separated"
          onChange={e => {
            const classes = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            set({ prerequisites: { ...(draft.prerequisites ?? {}), classes: classes.length ? classes : undefined } })
          }}
        />
      </Row>
      <IdListField
        label="Races"
        value={draft.prerequisites?.races}
        onChange={races => set({ prerequisites: { ...(draft.prerequisites ?? {}), races } })}
        known={RACE_BY_ID}
        hint="race ids, comma-separated"
      />
      <IdListField
        label="Feats"
        value={draft.prerequisites?.feats}
        onChange={feats => set({ prerequisites: { ...(draft.prerequisites ?? {}), feats } })}
        known={FEAT_BY_ID}
        hint="feat ids, comma-separated"
      />
      <AbilityBonusField
        label="Ability minimums"
        value={draft.prerequisites?.abilities}
        onChange={abilities => set({ prerequisites: { ...(draft.prerequisites ?? {}), abilities } })}
      />

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
            <>
              <select
                className={styles.formSelect}
                style={{ flex: '0 0 132px' }}
                value={spendModes[name] ?? 'Action'}
                onChange={e => setSpendModes(prev => ({ ...prev, [name]: e.target.value as SpendActionMode }))}
              >
                {SPEND_ACTION_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </select>
              <button
                className={styles.subAdd}
                style={{ margin: 0, whiteSpace: 'nowrap' }}
                title="Nothing spends this pool yet - create an action that consumes 1"
                onClick={() => createSpendAction(name, spendModes[name] ?? 'Action')}
              >+ spend action</button>
            </>
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
