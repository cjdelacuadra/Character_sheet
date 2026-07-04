/**
 * v14 migration chain.
 *
 * Steps v1→v13 are the proven legacy chain (domain/migrations); v13→v14 maps
 * every one-off class field onto the generic `featureState` and drops fields
 * that are now derived (feat flags). The legacy chain moves in here wholesale
 * at cutover; until Phase 3 flips the store to v14, the app keeps loading
 * characters through the legacy `migrateCharacter`.
 */
import type { Character } from '@/entities/character/types'
import { migrateCharacter as migrateToV13 } from '@/domain/migrations'
import { CURRENT_SCHEMA_VERSION, FEATURE_KEYS, type CharacterV14, type FeatureState } from './schema'

/** v13 fields that v14 folds into featureState or derives from `feats`. */
const V13_LEGACY_FIELDS = [
  'isRaging', 'isBladesinging', 'chosenTotem', 'hexWarriorWeaponId',
  'pactBoon', 'pactBoonLocked', 'chainFamiliarType', 'tomeCantrips',
  'warlockInvocations', 'fightingStyle', 'fightingStyleLocked',
  'selectedManeuver', 'chosenManeuvers', 'activeManeuver',
  'arcaneShots', 'activeArcaneShot',
  'artificerInfusions', 'activeArtificerInfusions',
  'knownRunes', 'activeRunes',
  'circleOfLandTerrain', 'wildShapeForm', 'racialActionUses', 'masterySpells',
  // Derived from feats in v14 — no longer stored:
  'piercerCritExtraDie', 'crusherCritAdvantage', 'spellSniperDoubleRange', 'mountedCombatantFlags',
] as const

export function v13_to_v14(v13: Character): CharacterV14 {
  // Seed with any featureState the character accumulated pre-flip (features
  // like metamagic adopt the map early); legacy-derived keys overwrite.
  const featureState: Record<string, FeatureState> = { ...(v13.featureState ?? {}) }
  const put = (key: string, state: FeatureState) => {
    // Only create entries that carry actual state, so fresh characters stay lean.
    const hasContent = Object.values(state).some(v =>
      v !== undefined && v !== false && (!Array.isArray(v) || v.length > 0) &&
      (typeof v !== 'object' || Array.isArray(v) || Object.keys(v as object).length > 0))
    if (hasContent) featureState[key] = state
  }

  put(FEATURE_KEYS.rage,       { on: v13.isRaging === true || undefined })
  put(FEATURE_KEYS.bladesong,  { on: v13.isBladesinging === true || undefined })
  put(FEATURE_KEYS.totemSpirit,{ choice: v13.chosenTotem })
  put(FEATURE_KEYS.hexWarrior, { choice: v13.hexWarriorWeaponId })
  put(FEATURE_KEYS.pactBoon,   { choice: v13.pactBoon, locked: v13.pactBoonLocked || undefined })
  put(FEATURE_KEYS.pactOfTheChain, { choice: v13.chainFamiliarType })
  put(FEATURE_KEYS.pactOfTheTome,  { known: v13.tomeCantrips })
  put(FEATURE_KEYS.invocations,    { known: v13.warlockInvocations })
  put(FEATURE_KEYS.fightingStyle,  { choice: v13.fightingStyle, locked: v13.fightingStyleLocked || undefined })
  put(FEATURE_KEYS.maneuvers, {
    // v5→v6 kept a single legacy `selectedManeuver`; fold it into the known list.
    known: dedupe([...(v13.chosenManeuvers ?? []), ...(v13.selectedManeuver ? [v13.selectedManeuver] : [])]),
    active: v13.activeManeuver ? [v13.activeManeuver] : undefined,
  })
  put(FEATURE_KEYS.arcaneShots, {
    known: v13.arcaneShots,
    active: v13.activeArcaneShot ? [v13.activeArcaneShot] : undefined,
  })
  put(FEATURE_KEYS.infusions, { known: v13.artificerInfusions, active: v13.activeArtificerInfusions })
  put(FEATURE_KEYS.runes,     { known: v13.knownRunes, active: v13.activeRunes })
  put(FEATURE_KEYS.circleOfTheLand, { choice: v13.circleOfLandTerrain })
  put(FEATURE_KEYS.wildShape, { data: v13.wildShapeForm ? { form: v13.wildShapeForm } : undefined })
  put(FEATURE_KEYS.racialActions, {
    uses: v13.racialActionUses && Object.keys(v13.racialActionUses).length > 0 ? v13.racialActionUses : undefined,
  })
  put(FEATURE_KEYS.spellMastery, {
    data: v13.masterySpells && (v13.masterySpells.level1 || v13.masterySpells.level2)
      ? { ...v13.masterySpells }
      : undefined,
  })

  const v14 = { ...v13, schemaVersion: CURRENT_SCHEMA_VERSION, featureState } as unknown as CharacterV14
  for (const field of V13_LEGACY_FIELDS) {
    delete (v14 as unknown as Record<string, unknown>)[field]
  }
  return v14
}

function dedupe(values: string[]): string[] | undefined {
  const unique = [...new Set(values)]
  return unique.length > 0 ? unique : undefined
}

/** Bring any raw loaded character (v1..v14) up to schema v14. */
export function migrateCharacterV14(raw: unknown): CharacterV14 {
  const version = (raw as { schemaVersion?: number }).schemaVersion ?? 1
  if (version >= CURRENT_SCHEMA_VERSION) return raw as CharacterV14
  return v13_to_v14(migrateToV13(raw))
}
