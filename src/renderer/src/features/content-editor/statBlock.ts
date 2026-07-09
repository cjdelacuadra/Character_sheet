/**
 * The stat-rows encoding shared by every "how it wires" editor: an
 * AccessoryStats block decomposes into addable rows (statsToRows) and
 * recomposes on save (rowsToStats). Complex rows (to-hit dice, bonus/crit
 * damage, crit range) carry no simple value — their field clusters are
 * merged by the hosting form. Extracted from ItemEditorPanel so feats,
 * races, and items all share one vocabulary.
 */
import type { AccessoryStats } from '@/shared/data/equipment/types'
import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'


export interface StatRow { key: string; value: number }

export const STAT_OPTIONS: { key: string; label: string; adv: boolean; complex?: boolean }[] = [
  { key: 'toHitBonus',       label: 'To-Hit Bonus',      adv: false, complex: true },
  { key: 'speedBonus',       label: 'Speed Bonus',       adv: false },
  { key: 'bonusDamage',      label: 'Bonus Damage',      adv: false, complex: true },
  { key: 'critMod',          label: 'Crit Range',        adv: false, complex: true },
  { key: 'critDamage',       label: 'Crit Damage',       adv: false, complex: true },
  { key: 'abset_str',        label: 'Set STR (floor)',   adv: false },
  { key: 'abset_dex',        label: 'Set DEX (floor)',   adv: false },
  { key: 'abset_con',        label: 'Set CON (floor)',   adv: false },
  { key: 'abset_int',        label: 'Set INT (floor)',   adv: false },
  { key: 'abset_wis',        label: 'Set WIS (floor)',   adv: false },
  { key: 'abset_cha',        label: 'Set CHA (floor)',   adv: false },
  { key: 'ab_str',           label: 'STR Bonus',         adv: false },
  { key: 'ab_dex',           label: 'DEX Bonus',         adv: false },
  { key: 'ab_con',           label: 'CON Bonus',         adv: false },
  { key: 'ab_int',           label: 'INT Bonus',         adv: false },
  { key: 'ab_wis',           label: 'WIS Bonus',         adv: false },
  { key: 'ab_cha',           label: 'CHA Bonus',         adv: false },
  { key: 'str_save',         label: 'STR Save',          adv: false },
  { key: 'dex_save',         label: 'DEX Save',          adv: false },
  { key: 'con_save',         label: 'CON Save',          adv: false },
  { key: 'int_save',         label: 'INT Save',          adv: false },
  { key: 'wis_save',         label: 'WIS Save',          adv: false },
  { key: 'cha_save',         label: 'CHA Save',          adv: false },
  { key: 'athletics',        label: 'Athletics',         adv: false },
  { key: 'acrobatics',       label: 'Acrobatics',        adv: false },
  { key: 'stealth',          label: 'Stealth',           adv: false },
  { key: 'perception',       label: 'Perception',        adv: false },
  { key: 'arcana',           label: 'Arcana',            adv: false },
  { key: 'sleightOfHand',    label: 'Sleight of Hand',   adv: false },
  { key: 'persuasion',       label: 'Persuasion',        adv: false },
  { key: 'history',          label: 'History',           adv: false },
  { key: 'insight',          label: 'Insight',           adv: false },
  { key: 'intimidation',     label: 'Intimidation',      adv: false },
  { key: 'investigation',    label: 'Investigation',     adv: false },
  { key: 'medicine',         label: 'Medicine',          adv: false },
  { key: 'nature',           label: 'Nature',            adv: false },
  { key: 'religion',         label: 'Religion',          adv: false },
  { key: 'animalHandling',   label: 'Animal Handling',   adv: false },
  { key: 'deception',        label: 'Deception',         adv: false },
  { key: 'performance',      label: 'Performance',       adv: false },
  { key: 'survival',         label: 'Survival',          adv: false },
  { key: 'adv:str_save',     label: 'Adv STR Save',      adv: true  },
  { key: 'adv:dex_save',     label: 'Adv DEX Save',      adv: true  },
  { key: 'adv:con_save',     label: 'Adv CON Save',      adv: true  },
  { key: 'adv:int_save',     label: 'Adv INT Save',      adv: true  },
  { key: 'adv:wis_save',     label: 'Adv WIS Save',      adv: true  },
  { key: 'adv:cha_save',     label: 'Adv CHA Save',      adv: true  },
  { key: 'adv:perception',   label: 'Adv Perception',    adv: true  },
  { key: 'adv:stealth',      label: 'Adv Stealth',       adv: true  },
  { key: 'adv:athletics',    label: 'Adv Athletics',     adv: true  },
  { key: 'adv:death',        label: 'Adv Death Saves',   adv: true  },
]

export function labelOf(key: string): string {
  return STAT_OPTIONS.find(o => o.key === key)?.label ?? key
}

export function statsToRows(stats: AccessoryStats | undefined): StatRow[] {
  if (!stats) return []
  const rows: StatRow[] = []
  if (stats.toHitBonus || stats.toHitDice) rows.push({ key: 'toHitBonus', value: 0 })
  if (stats.speedBonus) rows.push({ key: 'speedBonus', value: stats.speedBonus })
  for (const [ab, v] of Object.entries(stats.abilityBonus ?? {}))
    if (v) rows.push({ key: `ab_${ab}`, value: v })
  for (const [ab, v] of Object.entries(stats.abilitySet ?? {}))
    if (v) rows.push({ key: `abset_${ab}`, value: v })
  if (stats.bonusDamage) rows.push({ key: 'bonusDamage', value: 0 })
  if (stats.critModifier) rows.push({ key: 'critMod', value: Object.values(stats.critModifier)[0] ?? 0 })
  if (stats.critBonusDamage) rows.push({ key: 'critDamage', value: 0 })
  for (const [ab, v] of Object.entries(stats.savingThrowBonus ?? {}))
    if (v) rows.push({ key: `${ab}_save`, value: v })
  for (const [sk, v] of Object.entries(stats.skillBonus ?? {}))
    if (v) rows.push({ key: sk, value: v })
  for (const ab of stats.advantage?.savingThrows ?? [])
    rows.push({ key: `adv:${ab}_save`, value: 1 })
  for (const sk of stats.advantage?.skills ?? [])
    rows.push({ key: `adv:${sk}`, value: 1 })
  if (stats.advantage?.deathSaves) rows.push({ key: 'adv:death', value: 1 })
  return rows
}

export function rowsToStats(rows: StatRow[]): AccessoryStats {
  const s: AccessoryStats = {}
  for (const row of rows) {
    if (row.key === 'toHitBonus') {
      // Complex row — dice/flat/applies merged by the caller.
    } else if (row.key === 'speedBonus') {
      s.speedBonus = row.value
    } else if (row.key.startsWith('abset_')) {
      const ab = row.key.slice(6) as AbilityScore
      s.abilitySet = { ...s.abilitySet, [ab]: row.value }
    } else if (row.key.startsWith('ab_')) {
      const ab = row.key.slice(3) as AbilityScore
      s.abilityBonus = { ...s.abilityBonus, [ab]: row.value }
    } else if (row.key === 'bonusDamage' || row.key === 'critMod' || row.key === 'critDamage') {
      // Complex stats carry no simple value; their fields are merged in the caller.
    } else if (row.key === 'adv:death') {
      s.advantage = { ...s.advantage, deathSaves: true }
    } else if (row.key.startsWith('adv:')) {
      const rest = row.key.slice(4)
      if (rest.endsWith('_save')) {
        const ab = rest.slice(0, -5) as AbilityScore
        s.advantage = { ...s.advantage, savingThrows: [...(s.advantage?.savingThrows ?? []), ab] }
      } else {
        s.advantage = { ...s.advantage, skills: [...(s.advantage?.skills ?? []), rest as Skill] }
      }
    } else if (row.key.endsWith('_save')) {
      const ab = row.key.slice(0, -5) as AbilityScore
      s.savingThrowBonus = { ...s.savingThrowBonus, [ab]: row.value }
    } else {
      s.skillBonus = { ...s.skillBonus, [row.key]: row.value }
    }
  }
  return s
}

