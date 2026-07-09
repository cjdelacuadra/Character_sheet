import { useState } from 'react'
import type { RaceDef } from '@/shared/data/raceData'
import { StatBlockEditor } from '../StatBlockEditor'
import { Section, TextField, TextAreaField, SelectField, NumberField, CheckboxField, AbilityBonusField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

interface Props {
  draft: RaceDef
  onChange: (next: RaceDef) => void
}

export function RaceEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<RaceDef>) => onChange({ ...draft, ...patch })
  const [actionsJson, setActionsJson] = useState(() => JSON.stringify(draft.racialActions ?? [], null, 2))
  const [actionsError, setActionsError] = useState('')

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Label" value={draft.label} onChange={label => set({ label })} />
      <SelectField
        label="Size" value={draft.size}
        onChange={size => set({ size: size as RaceDef['size'] })}
        options={['small', 'medium'].map(s => ({ value: s, label: s }))}
      />
      <NumberField label="Speed" value={draft.speed} onChange={speed => set({ speed: speed ?? 30 })} min={0} max={60} />
      <NumberField label="Darkvision (ft)" value={draft.darkvisionRange} onChange={darkvisionRange => set({ darkvisionRange })} min={0} max={120} />
      <AbilityBonusField label="Ability bonus" value={draft.abilityBonus} onChange={abilityBonus => set({ abilityBonus: abilityBonus ?? {} })} />
      <TextAreaField
        label="Traits" rows={5}
        value={draft.traits.join('\n')}
        onChange={v => set({ traits: v.split('\n').filter(Boolean) })}
      />
      <div className={styles.formHint}>One trait per line — informational text shown on the sheet.</div>

      <Section>Natural armor</Section>
      <CheckboxField
        label="Has natural AC"
        value={!!draft.naturalAC}
        onChange={v => set({ naturalAC: v ? { base: 13, addDex: true } : undefined })}
      />
      {draft.naturalAC && (
        <Row label="Unarmored AC">
          <input
            className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={10} max={22}
            value={draft.naturalAC.base}
            onChange={e => set({ naturalAC: { ...draft.naturalAC!, base: Number(e.target.value) } })}
          />
          <label className={styles.formHint}>
            <input type="checkbox" checked={draft.naturalAC.addDex ?? false}
              onChange={e => set({ naturalAC: { ...draft.naturalAC!, addDex: e.target.checked || undefined } })} /> + DEX mod
          </label>
          <label className={styles.formHint}>
            <input type="checkbox" checked={draft.naturalAC.addWis ?? false}
              onChange={e => set({ naturalAC: { ...draft.naturalAC!, addWis: e.target.checked || undefined } })} /> + WIS mod
          </label>
        </Row>
      )}

      <Section>Save advantages</Section>
      {(draft.saveAdvantages ?? []).map((adv, i) => (
        <div key={i} className={styles.subRow}>
          <input className={styles.formInput} style={{ flex: '0 0 110px' }} value={adv.saves.join(',')}
            title="abilities, comma-separated (con,wis…)"
            onChange={e => {
              const saves = e.target.value.split(',').map(s => s.trim()).filter(Boolean) as typeof adv.saves
              set({ saveAdvantages: draft.saveAdvantages!.map((a, j) => (j === i ? { ...a, saves } : a)) })
            }} />
          <input className={styles.formInput} value={adv.vs} placeholder="vs poison…"
            onChange={e => set({ saveAdvantages: draft.saveAdvantages!.map((a, j) => (j === i ? { ...a, vs: e.target.value } : a)) })} />
          <input className={styles.formInput} value={adv.source} placeholder="source trait"
            onChange={e => set({ saveAdvantages: draft.saveAdvantages!.map((a, j) => (j === i ? { ...a, source: e.target.value } : a)) })} />
          <button className={styles.subRemove}
            onClick={() => {
              const next = draft.saveAdvantages!.filter((_, j) => j !== i)
              set({ saveAdvantages: next.length ? next : undefined })
            }}>×</button>
        </div>
      ))}
      <button className={styles.subAdd}
        onClick={() => set({ saveAdvantages: [...(draft.saveAdvantages ?? []), { saves: ['con'], vs: 'vs poison', source: '' }] })}>
        + save advantage
      </button>

      <Section>Racial spells</Section>
      {Object.entries(draft.racialSpells ?? {}).map(([lvl, ids], i) => (
        <div key={i} className={styles.subRow}>
          <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={1} max={20} value={lvl}
            onChange={e => {
              const entries = Object.entries(draft.racialSpells ?? {})
              entries[i] = [e.target.value, ids]
              set({ racialSpells: Object.fromEntries(entries) })
            }} />
          <input className={styles.formInput} value={(ids ?? []).join(', ')} placeholder="spell ids, comma-separated"
            onChange={e => set({ racialSpells: { ...draft.racialSpells, [lvl]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} />
          <button className={styles.subRemove}
            onClick={() => {
              const next = { ...draft.racialSpells }
              delete next[Number(lvl)]
              set({ racialSpells: Object.keys(next).length ? next : undefined })
            }}>×</button>
        </div>
      ))}
      <button className={styles.subAdd}
        onClick={() => set({ racialSpells: { ...draft.racialSpells, 1: [] } })}>+ spell grant level</button>

      <Section>Misc</Section>
      <NumberField label="Bonus HP / level" value={draft.bonusHpPerLevel} onChange={bonusHpPerLevel => set({ bonusHpPerLevel })} min={0} max={5} />
      <NumberField label="Free ability pts" value={draft.freeAbilityPoints} onChange={freeAbilityPoints => set({ freeAbilityPoints })} min={0} max={3} />
      <CheckboxField label="Free feat" value={draft.freeFeat ?? false} onChange={v => set({ freeFeat: v || undefined })} />

      <Section>Racial actions (JSON)</Section>
      <textarea
        className={styles.jsonArea} style={{ minHeight: 140 }}
        value={actionsJson}
        spellCheck={false}
        onChange={e => {
          setActionsJson(e.target.value)
          try {
            const parsed = JSON.parse(e.target.value)
            setActionsError('')
            set({ racialActions: Array.isArray(parsed) && parsed.length ? parsed : undefined })
          } catch (err) {
            setActionsError(err instanceof Error ? err.message : String(err))
          }
        }}
      />
      {actionsError && <div className={styles.jsonError}>⚠ {actionsError}</div>}
      <div className={styles.formHint}>
        Array of {'{ id, name, description, cost, recharge?, maxUses?, grantsTempHp?, selfHeal? }'} — formulas accept dice, "level", "conmod", "prof".
      </div>

      <Section>Passive wiring (stats)</Section>
      <StatBlockEditor
        value={draft.stats ?? {}}
        onChange={stats => set({ stats: Object.keys(stats).length ? stats : undefined })}
      />
    </div>
  )
}
