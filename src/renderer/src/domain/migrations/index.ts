import type { Character } from '@/entities/character/types'

const CURRENT_SCHEMA_VERSION = 2

/**
 * Upgrade a V1 character (no schemaVersion) to V2.
 * Handles: hasShield → shieldId, missing fields with defaults.
 */
function v1_to_v2(raw: Partial<Character>): Partial<Character> {
  const rawEq = raw.equipment
  const shieldId = rawEq?.shieldId !== undefined
    ? rawEq.shieldId
    : rawEq?.hasShield ? 'shield' : null

  return {
    ...raw,
    schemaVersion: 2,
    createdAt: (raw as Record<string, unknown>).createdAt as string ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    equipment: rawEq
      ? { ...rawEq, shieldId }
      : { armorId: null, hasShield: false, shieldId: null },
    preparedSpellIds: (raw as Record<string, unknown>).preparedSpellIds as string[] ?? [],
    notes: (raw as Record<string, unknown>).notes as string ?? '',
    savingThrowProficiencies: raw.savingThrowProficiencies ?? [],
    skillProficiencies: raw.skillProficiencies ?? {},
    conditionIds: raw.conditionIds ?? [],
    resources: raw.resources ?? {},
    deathSaves: raw.deathSaves ?? { successes: 0, failures: 0 },
    inspiration: typeof raw.inspiration === 'boolean'
      ? (raw.inspiration ? 1 : 0)
      : (raw.inspiration ?? 0),
    spellIds: raw.spellIds ?? [],
    spellSlots: raw.spellSlots ?? {},
    hitDiceUsed: raw.hitDiceUsed ?? 0,
    weapons: raw.weapons ?? [],
    feats: raw.feats ?? [],
    concentrationSpellId: raw.concentrationSpellId ?? null,
    bonusHpPerLevel: (raw as Record<string, unknown>).bonusHpPerLevel as number ?? 0,
  }
}

/** Apply all necessary migrations to bring a raw loaded character up to current schema. */
export function migrateCharacter(raw: unknown): Character {
  let data = raw as Partial<Character> & { schemaVersion?: number }

  const version = data.schemaVersion ?? 1
  if (version < 2) data = v1_to_v2(data) as typeof data

  return data as Character
}
