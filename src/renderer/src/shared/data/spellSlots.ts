import type { SpellSlots } from '@/entities/character/types'

// Standard D&D 5e spell slot table by class type and character level
// [level1, level2, ..., level9] slots per spell level
const FULL_CASTER: Record<number, number[]> = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
}

// Half-casters (Paladin, Ranger) — spell slots start at level 2, half-caster slots
const HALF_CASTER: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],
  2:  [2,0,0,0,0,0,0,0,0],
  3:  [3,0,0,0,0,0,0,0,0],
  4:  [3,0,0,0,0,0,0,0,0],
  5:  [4,2,0,0,0,0,0,0,0],
  6:  [4,2,0,0,0,0,0,0,0],
  7:  [4,3,0,0,0,0,0,0,0],
  8:  [4,3,0,0,0,0,0,0,0],
  9:  [4,3,2,0,0,0,0,0,0],
  10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0],
  12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0],
  14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,2,0,0,0,0,0],
  16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0],
  18: [4,3,3,3,1,0,0,0,0],
  19: [4,3,3,3,2,0,0,0,0],
  20: [4,3,3,3,2,0,0,0,0],
}

// Warlock — pact slots (all same level, few but recover on short rest)
const WARLOCK_SLOTS: Record<number, number[]> = {
  1:  [1,0,0,0,0,0,0,0,0],
  2:  [2,0,0,0,0,0,0,0,0],
  3:  [0,2,0,0,0,0,0,0,0],
  4:  [0,2,0,0,0,0,0,0,0],
  5:  [0,0,2,0,0,0,0,0,0],
  6:  [0,0,2,0,0,0,0,0,0],
  7:  [0,0,0,2,0,0,0,0,0],
  8:  [0,0,0,2,0,0,0,0,0],
  9:  [0,0,0,0,2,0,0,0,0],
  10: [0,0,0,0,2,0,0,0,0],
  11: [0,0,0,0,3,0,0,0,0],
  12: [0,0,0,0,3,0,0,0,0],
  13: [0,0,0,0,3,0,0,0,0],
  14: [0,0,0,0,3,0,0,0,0],
  15: [0,0,0,0,3,0,0,0,0],
  16: [0,0,0,0,3,0,0,0,0],
  17: [0,0,0,0,4,0,0,0,0],
  18: [0,0,0,0,4,0,0,0,0],
  19: [0,0,0,0,4,0,0,0,0],
  20: [0,0,0,0,4,0,0,0,0],
}

// Third-casters (Eldritch Knight, Arcane Trickster) — by class level, start level 3
const THIRD_CASTER: Record<number, number[]> = {
  1:  [0,0,0,0,0,0,0,0,0],  2:  [0,0,0,0,0,0,0,0,0],
  3:  [2,0,0,0,0,0,0,0,0],  4:  [3,0,0,0,0,0,0,0,0],
  5:  [4,2,0,0,0,0,0,0,0],  6:  [4,2,0,0,0,0,0,0,0],
  7:  [4,3,0,0,0,0,0,0,0],  8:  [4,3,0,0,0,0,0,0,0],
  9:  [4,3,2,0,0,0,0,0,0],  10: [4,3,2,0,0,0,0,0,0],
  11: [4,3,3,0,0,0,0,0,0],  12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0],  14: [4,3,3,1,0,0,0,0,0],
  15: [4,3,3,1,0,0,0,0,0],  16: [4,3,3,1,0,0,0,0,0],
  17: [4,3,3,1,0,0,0,0,0],  18: [4,3,3,1,0,0,0,0,0],
  19: [4,3,3,2,0,0,0,0,0],  20: [4,3,3,2,0,0,0,0,0],
}

const FULL_CASTERS   = new Set(['Wizard', 'Cleric', 'Druid', 'Bard', 'Sorcerer'])
const HALF_CASTERS   = new Set(['Paladin', 'Ranger'])
const THIRD_CASTERS  = new Set(['EldritchKnight', 'ArcaneTrickster'])

export function defaultSpellSlots(classId: string, level: number, subclassId?: string): SpellSlots {
  let table: Record<number, number[]> | null = null

  if (subclassId && THIRD_CASTERS.has(subclassId)) table = THIRD_CASTER
  else if (FULL_CASTERS.has(classId)) table = FULL_CASTER
  else if (HALF_CASTERS.has(classId)) table = HALF_CASTER
  else if (classId === 'Warlock') table = WARLOCK_SLOTS
  else return {}

  const row = table[Math.min(20, Math.max(1, level))]
  const slots: SpellSlots = {}
  row.forEach((total, i) => {
    if (total > 0) slots[i + 1] = { used: 0, total }
  })
  return slots
}

export function defaultSpeedForRace(race: string): number {
  const slow = new Set(['Dwarf', 'Halfling', 'Gnome'])
  return slow.has(race) ? 25 : 30
}

export function defaultAC(classId: string): number {
  // Unarmored defense classes start higher; others assume light armor
  if (classId === 'Monk') return 10  // 10 + DEX + WIS (needs scores)
  if (classId === 'Barbarian') return 10  // 10 + DEX + CON (needs scores)
  return 13  // leather armor default
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}
