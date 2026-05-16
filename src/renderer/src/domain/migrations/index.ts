import type { Character } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'

const CURRENT_SCHEMA_VERSION = 4

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

function v2_to_v3(char: Partial<Character>): Partial<Character> {
  if (!char.completedAsiLevels) {
    const classDef = CLASS_BY_ID[(char as Record<string, unknown>).classId as string]
    char.completedAsiLevels = (classDef?.asiLevels ?? []).filter((l: number) => l <= (char.level ?? 0))
  }
  return { ...char, schemaVersion: 3 }
}

function v3_to_v4(char: Partial<Character>): Partial<Character> {
  return { ...char, schemaVersion: 4 }
}

/** Apply all necessary migrations to bring a raw loaded character up to current schema. */
export function migrateCharacter(raw: unknown): Character {
  let data = raw as Partial<Character> & { schemaVersion?: number }

  const version = data.schemaVersion ?? 1
  if (version < 2) data = v1_to_v2(data) as typeof data
  if (version < 3) data = v2_to_v3(data) as typeof data
  if (version < 4) data = v3_to_v4(data) as typeof data

  return data as Character
}
