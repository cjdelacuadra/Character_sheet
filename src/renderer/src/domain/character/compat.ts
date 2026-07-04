/**
 * Transitional accessors for the v13→v14 flip: read featureState first, fall
 * back to the legacy one-off field. Every consumer ported to these keeps
 * working before the flip (featureState empty → legacy value) and after it
 * (legacy fields deleted → featureState value). At cutover the fallbacks are
 * removed and these become thin featureState reads.
 */
import type { Character, FeatureState } from '@/entities/character/types'

type AnyChar = { featureState?: Record<string, FeatureState> } & Partial<
  Pick<
    Character,
    | 'isRaging' | 'isBladesinging' | 'fightingStyle' | 'fightingStyleLocked'
    | 'hexWarriorWeaponId' | 'chosenTotem' | 'circleOfLandTerrain'
    | 'pactBoon' | 'pactBoonLocked' | 'chainFamiliarType' | 'tomeCantrips'
    | 'warlockInvocations' | 'selectedManeuver' | 'chosenManeuvers' | 'activeManeuver'
    | 'arcaneShots' | 'activeArcaneShot' | 'artificerInfusions' | 'activeArtificerInfusions'
    | 'knownRunes' | 'activeRunes' | 'racialActionUses' | 'wildShapeForm' | 'masterySpells'
    | 'feats' | 'piercerCritExtraDie' | 'crusherCritAdvantage' | 'spellSniperDoubleRange'
  >
>

const fs = (char: AnyChar, key: string): FeatureState => char.featureState?.[key] ?? {}

export const isRaging = (char: AnyChar): boolean =>
  fs(char, 'rage').on ?? char.isRaging ?? false

export const isBladesinging = (char: AnyChar): boolean =>
  fs(char, 'bladesong').on ?? char.isBladesinging ?? false

export const fightingStyleOf = (char: AnyChar): string | undefined =>
  fs(char, 'fighting-style').choice ?? char.fightingStyle

export const fightingStyleLocked = (char: AnyChar): boolean =>
  fs(char, 'fighting-style').locked ?? char.fightingStyleLocked ?? false

export const hexWarriorWeaponIdOf = (char: AnyChar): string | undefined =>
  fs(char, 'hex-warrior').choice ?? char.hexWarriorWeaponId

export const chosenTotemOf = (char: AnyChar): string | undefined =>
  fs(char, 'totem-spirit').choice ?? char.chosenTotem

export const landTerrainOf = (char: AnyChar): string | undefined =>
  fs(char, 'circle-of-the-land').choice ?? char.circleOfLandTerrain

export const pactBoonOf = (char: AnyChar): string | undefined =>
  fs(char, 'pact-boon').choice ?? char.pactBoon

export const pactBoonLockedOf = (char: AnyChar): boolean =>
  fs(char, 'pact-boon').locked ?? char.pactBoonLocked ?? false

export const chainFamiliarOf = (char: AnyChar): string | undefined =>
  fs(char, 'pact-of-the-chain').choice ?? char.chainFamiliarType

export const tomeCantripsOf = (char: AnyChar): string[] =>
  fs(char, 'pact-of-the-tome').known ?? char.tomeCantrips ?? []

export const invocationsOf = (char: AnyChar): string[] =>
  fs(char, 'invocations').known ?? char.warlockInvocations ?? []

export const maneuversKnownOf = (char: AnyChar): string[] =>
  fs(char, 'maneuvers').known ?? char.chosenManeuvers ?? (char.selectedManeuver ? [char.selectedManeuver] : [])

export const activeManeuverOf = (char: AnyChar): string | null =>
  fs(char, 'maneuvers').active?.[0] ?? char.activeManeuver ?? null

export const arcaneShotsKnownOf = (char: AnyChar): string[] =>
  fs(char, 'arcane-shots').known ?? char.arcaneShots ?? []

export const activeArcaneShotOf = (char: AnyChar): string | null =>
  fs(char, 'arcane-shots').active?.[0] ?? char.activeArcaneShot ?? null

export const infusionsKnownOf = (char: AnyChar): string[] =>
  fs(char, 'infusions').known ?? char.artificerInfusions ?? []

export const activeInfusionsOf = (char: AnyChar): string[] =>
  fs(char, 'infusions').active ?? char.activeArtificerInfusions ?? []

export const runesKnownOf = (char: AnyChar): string[] =>
  fs(char, 'runes').known ?? char.knownRunes ?? []

export const activeRunesOf = (char: AnyChar): string[] =>
  fs(char, 'runes').active ?? char.activeRunes ?? []

export const racialActionUsesOf = (char: AnyChar): Record<string, number> =>
  fs(char, 'racial-actions').uses ?? char.racialActionUses ?? {}

export const wildShapeFormOf = (char: AnyChar): Character['wildShapeForm'] =>
  (fs(char, 'wild-shape').data?.form as Character['wildShapeForm']) ?? char.wildShapeForm

export const masterySpellsOf = (char: AnyChar): NonNullable<Character['masterySpells']> =>
  (fs(char, 'spell-mastery').data as Character['masterySpells']) ?? char.masterySpells ?? {}

// Feat riders: v14 derives these from the feat list (the stored flags were
// redundant); the flag remains as the legacy fallback for un-migrated saves.
export const hasPiercerCrit = (char: AnyChar): boolean =>
  (char.feats ?? []).includes('piercer') || char.piercerCritExtraDie === true

export const hasCrusherCrit = (char: AnyChar): boolean =>
  (char.feats ?? []).includes('crusher') || char.crusherCritAdvantage === true

export const hasSpellSniper = (char: AnyChar): boolean =>
  (char.feats ?? []).some(f => f === 'spellSniper' || f === 'spell-sniper') || char.spellSniperDoubleRange === true
