import type { Character } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'

const CURRENT_SCHEMA_VERSION = 9

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
      : {
          armorId: null, hasShield: false, shieldId: null,
          helmetId: null, necklaceId: null, capeId: null, legsId: null,
          bootsId: null, glovesId: null, quiverId: null,
          ring1Id: null, ring2Id: null, amuletId: null,
        },
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

function v4_to_v5(char: Partial<Character>): Partial<Character> {
  return {
    ...char,
    schemaVersion: 5,
    warlockInvocations: (char as Record<string, unknown>).warlockInvocations as string[] ?? [],
    pactBoon: (char as Record<string, unknown>).pactBoon as string | undefined,
    pactBoonLocked: (char as Record<string, unknown>).pactBoonLocked as boolean ?? false,
    isRaging: false,
  }
}

function v5_to_v6(char: Partial<Character>): Partial<Character> {
  const legacyManeuvers = (char as Record<string, unknown>).battleMasterManeuvers as string[] | undefined
  return {
    ...char,
    schemaVersion: 6,
    selectedManeuver: legacyManeuvers?.[0] ?? char.selectedManeuver ?? null,
    superiorityDiceUsed: (char as Record<string, unknown>).superiorityDiceUsed as number ?? 0,
    arcaneShots: (char as Record<string, unknown>).arcaneShots as string[] ?? [],
  }
}

function v7_to_v8(char: Partial<Character>): Partial<Character> {
  return {
    ...char,
    schemaVersion: 8,
    gold: (char as Record<string, unknown>).gold as number ?? 0,
    ownedItemIds: (char as Record<string, unknown>).ownedItemIds as string[] ?? [],
  }
}

function v8_to_v9(char: Partial<Character>): Partial<Character> {
  return {
    ...char,
    schemaVersion: 9,
    artificerInfusions: (char as Record<string, unknown>).artificerInfusions as string[] ?? [],
    activeArtificerInfusions: (char as Record<string, unknown>).activeArtificerInfusions as string[] ?? [],
  }
}

function v6_to_v7(char: Partial<Character>): Partial<Character> {
  const eq = char.equipment ?? { armorId: null, hasShield: false, shieldId: null }
  return {
    ...char,
    schemaVersion: 7,
    equipment: {
      ...eq,
      helmetId: (eq as Record<string, unknown>).helmetId as string | null ?? null,
      necklaceId: (eq as Record<string, unknown>).necklaceId as string | null ?? null,
      capeId: (eq as Record<string, unknown>).capeId as string | null ?? null,
      legsId: (eq as Record<string, unknown>).legsId as string | null ?? null,
      bootsId: (eq as Record<string, unknown>).bootsId as string | null ?? null,
      glovesId: (eq as Record<string, unknown>).glovesId as string | null ?? null,
      quiverId: (eq as Record<string, unknown>).quiverId as string | null ?? null,
      ring1Id: (eq as Record<string, unknown>).ring1Id as string | null ?? null,
      ring2Id: (eq as Record<string, unknown>).ring2Id as string | null ?? null,
      amuletId: (eq as Record<string, unknown>).amuletId as string | null ?? null,
    },
  }
}

/** Apply all necessary migrations to bring a raw loaded character up to current schema. */
export function migrateCharacter(raw: unknown): Character {
  let data = raw as Partial<Character> & { schemaVersion?: number }

  const version = data.schemaVersion ?? 1
  if (version < 2) data = v1_to_v2(data) as typeof data
  if (version < 3) data = v2_to_v3(data) as typeof data
  if (version < 4) data = v3_to_v4(data) as typeof data
  if (version < 5) data = v4_to_v5(data) as typeof data
  if (version < 6) data = v5_to_v6(data) as typeof data
  if (version < 7) data = v6_to_v7(data) as typeof data
  if (version < 8) data = v7_to_v8(data) as typeof data
  if (version < 9) data = v8_to_v9(data) as typeof data

  return data as Character
}
