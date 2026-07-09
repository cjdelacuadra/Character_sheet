import { useState } from 'react'
import type { AccessoryStats } from '@/shared/data/equipment/types'
import { STAT_OPTIONS, labelOf, statsToRows, rowsToStats, type StatRow } from './statBlock'
import styles from '@/features/inventory/ItemEditorPanel.module.css'

const DIE_SIDES = ['4', '6', '8', '10', '12', '20'] as const
const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'thunder',
  'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force',
] as const

function parseDie(die: string | undefined): { count: number; sides: string } {
  const m = die?.match(/^(\d+)d(\d+)$/)
  return m ? { count: Number(m[1]), sides: m[2] } : { count: 0, sides: '6' }
}

interface Props {
  value: AccessoryStats
  onChange: (stats: AccessoryStats) => void
}

/**
 * Controlled "how it wires" editor over one AccessoryStats block — the same
 * addable stat rows the item editor uses (simple bonuses, floors, advantage,
 * plus the complex dice clusters), reusable by any content form (feats,
 * races). The host owns the stats value; every edit recomposes and emits it.
 */
export function StatBlockEditor({ value, onChange }: Props) {
  const [addKey, setAddKey] = useState('')
  const rows = statsToRows(value)

  /** Recompose simple rows, carrying the complex fields straight from value. */
  function emit(nextRows: StatRow[], patch?: Partial<AccessoryStats>) {
    const s = rowsToStats(nextRows)
    const keep = (k: string) => nextRows.some(r => r.key === k)
    if (keep('toHitBonus')) {
      s.toHitBonus = value.toHitBonus
      s.toHitDice = value.toHitDice
      s.toHitBonusAppliesTo = value.toHitBonusAppliesTo
    }
    if (keep('bonusDamage')) s.bonusDamage = value.bonusDamage
    if (keep('critMod')) s.critModifier = value.critModifier
    if (keep('critDamage')) s.critBonusDamage = value.critBonusDamage
    onChange({ ...s, ...patch })
  }

  function addStat() {
    if (!addKey || rows.some(r => r.key === addKey)) return
    const seeded: Partial<AccessoryStats> =
      addKey === 'toHitBonus' ? { toHitBonus: 1, toHitBonusAppliesTo: 'both' } :
      addKey === 'bonusDamage' ? { bonusDamage: { dice: '1d6', dmgType: 'fire', appliesTo: 'all' } } :
      addKey === 'critMod' ? { critModifier: { all: 1 } } :
      addKey === 'critDamage' ? { critBonusDamage: { dice: '1d6', dmgType: 'fire' } } :
      {}
    emit([...rows, { key: addKey, value: addKey.startsWith('abset_') ? 13 : 1 }], seeded)
    setAddKey('')
  }

  function removeStat(key: string) {
    emit(rows.filter(r => r.key !== key))
  }

  function setSimple(key: string, v: number) {
    emit(rows.map(r => (r.key === key ? { ...r, value: v } : r)))
  }

  const available = STAT_OPTIONS.filter(o => !rows.some(r => r.key === o.key))
  const toHit = { ...parseDie(value.toHitDice), flat: value.toHitBonus ?? 0, applies: value.toHitBonusAppliesTo ?? 'both' }
  const bd = { ...parseDie(value.bonusDamage?.dice), flat: value.bonusDamage?.flat ?? 0, type: value.bonusDamage?.dmgType ?? 'fire', applies: value.bonusDamage?.appliesTo ?? 'all' }
  const critMod = { value: Object.values(value.critModifier ?? {})[0] ?? 0, applies: (Object.keys(value.critModifier ?? {})[0] ?? 'all') as 'melee' | 'ranged' | 'spells' | 'martial' | 'all' }
  const cd = { ...parseDie(value.critBonusDamage?.dice), flat: value.critBonusDamage?.flat ?? 0, type: value.critBonusDamage?.dmgType ?? 'fire' }

  const setToHit = (p: Partial<typeof toHit>) => {
    const n = { ...toHit, ...p }
    emit(rows, {
      toHitDice: n.count > 0 ? `${n.count}d${n.sides}` : undefined,
      toHitBonus: n.flat || undefined,
      toHitBonusAppliesTo: n.applies as AccessoryStats['toHitBonusAppliesTo'],
    })
  }
  const setBd = (p: Partial<typeof bd>) => {
    const n = { ...bd, ...p }
    emit(rows, { bonusDamage: { dice: n.count > 0 ? `${n.count}d${n.sides}` : undefined, flat: n.flat || undefined, dmgType: n.type, appliesTo: n.applies as 'melee' | 'ranged' | 'all' } })
  }
  const setCd = (p: Partial<typeof cd>) => {
    const n = { ...cd, ...p }
    emit(rows, { critBonusDamage: { dice: n.count > 0 ? `${n.count}d${n.sides}` : undefined, flat: n.flat || undefined, dmgType: n.type } })
  }

  return (
    <div>
      {rows.map(row => {
        if (row.key === 'toHitBonus') return (
          <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
            <label className={styles.label}>To-Hit Bonus</label>
            <div className={styles.diceRow}>
              <input type="number" min={0} max={20} value={toHit.count} onChange={e => setToHit({ count: Math.max(0, Number(e.target.value)) })} className={styles.diceCount} />
              <span className={styles.diceSep}>d</span>
              <select value={toHit.sides} onChange={e => setToHit({ sides: e.target.value })} className={styles.diceSelect}>
                {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={styles.diceSep}>+</span>
              <input type="number" min={-20} max={20} value={toHit.flat} onChange={e => setToHit({ flat: Number(e.target.value) })} className={styles.diceCount} />
              <span className={styles.diceSep}>Applies</span>
              <select value={toHit.applies} onChange={e => setToHit({ applies: e.target.value as typeof toHit.applies })} className={styles.diceSelect}>
                <option value="both">both</option><option value="melee">melee</option><option value="ranged">ranged</option>
              </select>
              <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
            </div>
          </div>
        )
        if (row.key === 'bonusDamage') return (
          <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
            <label className={styles.label}>Bonus DMG</label>
            <div className={styles.diceRow}>
              <input type="number" min={0} max={20} value={bd.count} onChange={e => setBd({ count: Math.max(0, Number(e.target.value)) })} className={styles.diceCount} />
              <span className={styles.diceSep}>d</span>
              <select value={bd.sides} onChange={e => setBd({ sides: e.target.value })} className={styles.diceSelect}>
                {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={styles.diceSep}>+</span>
              <input type="number" min={-20} max={20} value={bd.flat} onChange={e => setBd({ flat: Number(e.target.value) })} className={styles.diceCount} />
              <select value={bd.type} onChange={e => setBd({ type: e.target.value })} className={styles.diceSelect}>
                {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
              </select>
              <select value={bd.applies} onChange={e => setBd({ applies: e.target.value as typeof bd.applies })} className={styles.diceSelect}>
                <option value="all">all</option><option value="melee">melee</option><option value="ranged">ranged</option>
              </select>
              <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
            </div>
          </div>
        )
        if (row.key === 'critMod') return (
          <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
            <label className={styles.label} title="Crit threshold reduction (1 = crit on 19+)">Crit Range</label>
            <div className={styles.diceRow}>
              <input type="number" min={-20} max={20} value={critMod.value} onChange={e => emit(rows, { critModifier: { [critMod.applies]: Number(e.target.value) } })} className={styles.diceCount} />
              <select value={critMod.applies} onChange={e => emit(rows, { critModifier: { [e.target.value]: critMod.value } })} className={styles.diceSelect}>
                <option value="all">all</option><option value="martial">martial</option><option value="melee">melee</option><option value="ranged">ranged</option><option value="spells">spells</option>
              </select>
              <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
            </div>
          </div>
        )
        if (row.key === 'critDamage') return (
          <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
            <label className={styles.label} title="Extra damage dealt only on a critical hit">Crit DMG</label>
            <div className={styles.diceRow}>
              <input type="number" min={0} max={20} value={cd.count} onChange={e => setCd({ count: Math.max(0, Number(e.target.value)) })} className={styles.diceCount} />
              <span className={styles.diceSep}>d</span>
              <select value={cd.sides} onChange={e => setCd({ sides: e.target.value })} className={styles.diceSelect}>
                {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={styles.diceSep}>+</span>
              <input type="number" min={-20} max={20} value={cd.flat} onChange={e => setCd({ flat: Number(e.target.value) })} className={styles.diceCount} />
              <select value={cd.type} onChange={e => setCd({ type: e.target.value })} className={styles.diceSelect}>
                {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
              </select>
              <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
            </div>
          </div>
        )
        const isAdv = row.key.startsWith('adv:')
        return (
          <div key={row.key} className={styles.statRow}>
            <span className={styles.statLabel}>{labelOf(row.key)}</span>
            {isAdv
              ? <span className={styles.statAdv}>Adv</span>
              : <input
                  className={styles.statInput}
                  type="number"
                  min={row.key.startsWith('abset_') ? 1 : -20}
                  max={row.key.startsWith('abset_') ? 30 : 20}
                  value={row.value}
                  onChange={e => setSimple(row.key, Number(e.target.value))}
                />}
            <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
          </div>
        )
      })}
      <div className={styles.addStatRow}>
        <select className={styles.addStatSel} value={addKey} onChange={e => setAddKey(e.target.value)}>
          <option value="">+ stat…</option>
          {available.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button className={styles.addStatBtn} onClick={addStat} disabled={!addKey}>Add</button>
      </div>
    </div>
  )
}
