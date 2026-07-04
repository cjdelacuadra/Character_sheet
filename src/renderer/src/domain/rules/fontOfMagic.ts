/**
 * Font of Magic — flexible casting (previously entirely unmodeled).
 *
 * Sorcery points ↔ spell slots per RAW: creating a slot costs
 * {1st:2, 2nd:3, 3rd:5, 4th:6, 5th:7} points (only levels 1–5 can be
 * created); converting a slot into points yields points equal to the slot's
 * level. Pure functions returning character patches — the resource pool is
 * `resources['Sorcery Points']`, so any character granted that resource can
 * use flexible casting (no class cage).
 */
import type { Character, SpellSlots } from '@/entities/character/types'

export const SORCERY_POINTS_RESOURCE = 'Sorcery Points'

/** RAW slot-creation costs. Slots above 5th level cannot be created. */
export const CREATE_SLOT_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 }

type FontInput = Pick<Character, 'resources' | 'spellSlots'>

export function sorceryPointsAvailable(char: FontInput): number {
  const pool = char.resources[SORCERY_POINTS_RESOURCE]
  return pool ? Math.max(0, pool.total - pool.used) : 0
}

/** Why a conversion is unavailable — UI disables the control with this reason. */
export type FontOfMagicError =
  | 'no-sorcery-points-resource'
  | 'not-enough-points'
  | 'slot-level-not-creatable'
  | 'no-such-slot'
  | 'no-expended-slot'
  | 'no-available-slot'

export function canCreateSlot(char: FontInput, slotLevel: number): FontOfMagicError | null {
  const cost = CREATE_SLOT_COST[slotLevel]
  if (cost === undefined) return 'slot-level-not-creatable'
  if (!char.resources[SORCERY_POINTS_RESOURCE]) return 'no-sorcery-points-resource'
  if (sorceryPointsAvailable(char) < cost) return 'not-enough-points'
  if (!char.spellSlots[slotLevel]) return 'no-such-slot'
  // RAW creates a slot even at full slots? The created slot must be usable:
  // this app models slots as used/total, so creating requires an expended one
  // to refill (a temporary extra slot has nowhere to live in the pool).
  if (char.spellSlots[slotLevel].used <= 0) return 'no-expended-slot'
  return null
}

/**
 * Spend sorcery points to recover one expended slot of the given level.
 * Returns the patch, or null if not allowed (check canCreateSlot for why).
 */
export function createSlotFromPoints(char: FontInput, slotLevel: number): Pick<Character, 'resources' | 'spellSlots'> | null {
  if (canCreateSlot(char, slotLevel) !== null) return null
  const cost = CREATE_SLOT_COST[slotLevel]
  const pool = char.resources[SORCERY_POINTS_RESOURCE]
  const slots: SpellSlots = {
    ...char.spellSlots,
    [slotLevel]: { ...char.spellSlots[slotLevel], used: char.spellSlots[slotLevel].used - 1 },
  }
  return {
    resources: { ...char.resources, [SORCERY_POINTS_RESOURCE]: { ...pool, used: pool.used + cost } },
    spellSlots: slots,
  }
}

export function canConvertSlot(char: FontInput, slotLevel: number): FontOfMagicError | null {
  if (!char.resources[SORCERY_POINTS_RESOURCE]) return 'no-sorcery-points-resource'
  const slot = char.spellSlots[slotLevel]
  if (!slot) return 'no-such-slot'
  if (slot.used >= slot.total) return 'no-available-slot'
  return null
}

/**
 * Expend a spell slot to gain sorcery points equal to its level (capped at
 * the pool's total — points beyond the max are lost per RAW pool size).
 */
export function convertSlotToPoints(char: FontInput, slotLevel: number): Pick<Character, 'resources' | 'spellSlots'> | null {
  if (canConvertSlot(char, slotLevel) !== null) return null
  const pool = char.resources[SORCERY_POINTS_RESOURCE]
  const gained = slotLevel
  return {
    resources: {
      ...char.resources,
      [SORCERY_POINTS_RESOURCE]: { ...pool, used: Math.max(0, pool.used - gained) },
    },
    spellSlots: {
      ...char.spellSlots,
      [slotLevel]: { ...char.spellSlots[slotLevel], used: char.spellSlots[slotLevel].used + 1 },
    },
  }
}
