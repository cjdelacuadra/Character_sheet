import type { StateCreator } from 'zustand'
import type { TurnSlice } from './turnSlice'
import type { AbilityScore, Character, AbilityScores, Equipment, Weapon } from '@/entities/character/types'
import type { ActiveSummon, ActiveSummonRuntime, SummonBase } from '@/entities/summon/types'
import type { GearEquipmentItem } from '@/shared/data/equipment/types'
import { WEAPON_BY_ID } from '@/shared/data/equipment/weapons'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { SUMMON_TEMPLATE_BY_ID } from '@/shared/data/summons/summonTemplates'
import { loadSummonTemplatesFromDisk } from '@/shared/data/summons/summonLoader'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { profBonus, computeMaxHP, computeSpeed, computeInitiativeFull, mod, computeACFull, computeDerivedStats } from '@/shared/data/charCalculations'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { getResourceDefaults } from '@/shared/data/resourceDefaults'
import { applyRestToResources } from '@/domain/rules/resources'
import { racialActionUsesOf } from '@/domain/character/compat'
import { migrateCharacterV14 } from '@/domain/character/migrations'
import { ipcService } from '@/services/ipc'
import { loadEquipmentFromCsv, mergeCustomGearIntoCatalog } from '@/shared/data/equipment/equipmentLoader'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { FEAT_BY_ID } from '@/shared/data/featsData'

const ABILITY_SHORT: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
function formatAsiChoice(choice: AsiChoice): string {
  if (choice.type === 'double') return `+2 ${ABILITY_SHORT[choice.ability]}`
  if (choice.type === 'split') return `+1 ${ABILITY_SHORT[choice.ability1]} / +1 ${ABILITY_SHORT[choice.ability2]}`
  const featName = FEAT_BY_ID[choice.featId]?.name ?? choice.featId
  const abSuffix = choice.featAbilityChoice ? ` (+1 ${ABILITY_SHORT[choice.featAbilityChoice]})` : ''
  return `Feat: ${featName}${abSuffix}`
}

function seedBuffState(char: Character, spellId: string): Character['buffStates'] {
  const spell = SPELL_BY_ID[spellId]
  if (!spell?.turnResource) return char.buffStates
  return {
    ...(char.buffStates ?? {}),
    [spellId]: char.buffStates?.[spellId] ?? (spell.buffTarget && spell.buffTarget !== 'self' ? { trackedTargetLabel: '' } : {}),
  }
}

function removeBuffState(char: Character, spellIds: string[]): Character['buffStates'] {
  const next = { ...(char.buffStates ?? {}) }
  for (const spellId of spellIds) delete next[spellId]
  return next
}

export interface CharacterSlice {
  activeCharacterId: string | null
  characters: Record<string, Character>
  loaded: boolean

  setActiveCharacter: (id: string) => void
  exitCharacter: () => void
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  dropConcentration: (id: string) => void
  addFeat: (id: string, featId: string, opts?: { abilityChoice?: AbilityScore; spellIds?: string[] }) => void
  removeFeat: (id: string, featId: string) => void
  deleteCharacter: (id: string) => void
  loadFromDisk: () => Promise<void>
  shortRest: (id: string, hdRolled: number) => void
  longRest: (id: string) => void
  levelUp: (id: string, asiChoice?: AsiChoice, newSpellIds?: string[]) => void
  applyPendingAsi: (id: string, asiLevel: number, choice: AsiChoice) => void
  setTempHp: (id: string, amount: number) => void
  updateEquipmentSlot: (id: string, slot: keyof Equipment, value: string | null) => void
  buyItem: (charId: string, itemId: string, cost: number) => void
  sellItem: (charId: string, itemId: string, cost: number) => void
  equipItemToSlot: (charId: string, slot: keyof Equipment, itemId: string | null) => void
  unequipSlot: (charId: string, slot: keyof Equipment) => void
  unequipWeapon: (charId: string, slotIndex: 0 | 1) => void
  equipWeaponFromId: (charId: string, defId: string, slotIndex: 0 | 1) => void
  toggleAttune: (charId: string, itemId: string) => void

  summonFromTemplate: (charId: string, templateId: string, count?: number, source?: { spellId?: string }) => void
  removeSummon: (charId: string, summonId: string) => void
  updateSummonState: (charId: string, summonId: string, patch: Partial<ActiveSummonRuntime>) => void
  newSummonTurn: (charId: string, summonId: string) => void
  clearAllSummons: (charId: string, filter?: { concentrationOnly?: boolean; spellId?: string }) => void

  customItems: Record<string, GearEquipmentItem>
  addCustomItem: (def: GearEquipmentItem) => void
  removeCustomItem: (id: string) => void
}


/**
 * Transition shim: any patch that writes a legacy one-off class field is
 * mirrored into featureState, so bridge accessors (featureState-first) see
 * every write regardless of which generation the writer targeted. Removed at
 * cutover together with the legacy fields themselves.
 */
function mirrorLegacyPatch(char: Character, patch: Partial<Character>): Partial<Character> {
  type FS = NonNullable<Character['featureState']>[string]
  const entries: Array<[string, FS]> = []
  const has = (k: keyof Character) => Object.prototype.hasOwnProperty.call(patch, k)

  if (has('isRaging')) entries.push(['rage', { on: patch.isRaging === true }])
  if (has('isBladesinging')) entries.push(['bladesong', { on: patch.isBladesinging === true }])
  if (has('fightingStyle') || has('fightingStyleLocked')) entries.push(['fighting-style', {
    ...(has('fightingStyle') ? { choice: patch.fightingStyle } : {}),
    ...(has('fightingStyleLocked') ? { locked: patch.fightingStyleLocked } : {}),
  }])
  if (has('masterySpells')) entries.push(['spell-mastery', { data: patch.masterySpells ? { ...patch.masterySpells } : {} }])
  if (has('warlockInvocations')) entries.push(['invocations', { known: patch.warlockInvocations }])
  if (has('artificerInfusions') || has('activeArtificerInfusions')) entries.push(['infusions', {
    ...(has('artificerInfusions') ? { known: patch.artificerInfusions } : {}),
    ...(has('activeArtificerInfusions') ? { active: patch.activeArtificerInfusions } : {}),
  }])
  if (has('knownRunes') || has('activeRunes')) entries.push(['runes', {
    ...(has('knownRunes') ? { known: patch.knownRunes } : {}),
    ...(has('activeRunes') ? { active: patch.activeRunes } : {}),
  }])
  if (has('pactBoon') || has('pactBoonLocked')) entries.push(['pact-boon', {
    ...(has('pactBoon') ? { choice: patch.pactBoon } : {}),
    ...(has('pactBoonLocked') ? { locked: patch.pactBoonLocked } : {}),
  }])
  if (has('tomeCantrips')) entries.push(['pact-of-the-tome', { known: patch.tomeCantrips }])
  if (has('chainFamiliarType')) entries.push(['pact-of-the-chain', { choice: patch.chainFamiliarType }])
  if (has('hexWarriorWeaponId')) entries.push(['hex-warrior', { choice: patch.hexWarriorWeaponId }])
  if (has('chosenTotem')) entries.push(['totem-spirit', { choice: patch.chosenTotem }])
  if (has('circleOfLandTerrain')) entries.push(['circle-of-the-land', { choice: patch.circleOfLandTerrain }])
  if (has('chosenManeuvers') || has('activeManeuver') || has('selectedManeuver')) entries.push(['maneuvers', {
    ...(has('chosenManeuvers') ? { known: patch.chosenManeuvers ?? [] } : {}),
    ...(has('activeManeuver') ? { active: patch.activeManeuver ? [patch.activeManeuver] : [] } : {}),
  }])
  if (has('arcaneShots') || has('activeArcaneShot')) entries.push(['arcane-shots', {
    ...(has('arcaneShots') ? { known: patch.arcaneShots } : {}),
    ...(has('activeArcaneShot') ? { active: patch.activeArcaneShot ? [patch.activeArcaneShot] : [] } : {}),
  }])
  if (has('racialActionUses')) entries.push(['racial-actions', { uses: patch.racialActionUses ?? {} }])
  if (has('wildShapeForm')) entries.push(['wild-shape', { data: patch.wildShapeForm ? { form: patch.wildShapeForm } : {} }])

  if (entries.length === 0) return patch
  let featureState = { ...(patch.featureState ?? char.featureState ?? {}) }
  for (const [key, fsPatch] of entries) {
    featureState = { ...featureState, [key]: { ...featureState[key], ...fsPatch } }
  }
  return { ...patch, featureState }
}

export const createCharacterSlice: StateCreator<CharacterSlice & TurnSlice, [], [], CharacterSlice> = (set, get) => {
  /**
   * The one write path for character changes: applies the recipe, stamps
   * updatedAt, persists, and updates the map — replacing the clone-save-return
   * boilerplate previously repeated in every action. A recipe returning null
   * aborts (no save, no update).
   */
  function mutateCharacter(id: string, recipe: (char: Character) => Partial<Character> | null): void {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const patch = recipe(char)
      if (patch === null) return state
      const updated: Character = { ...char, ...mirrorLegacyPatch(char, patch), updatedAt: new Date().toISOString() }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  }

  return ({
  activeCharacterId: null,
  characters: {},
  customItems: {},

  addCustomItem: (def) => {
    const customItems = { ...get().customItems, [def.id]: def }
    set({ customItems })
    ipcService.saveCustomItems(customItems as Record<string, unknown>)
  },
  removeCustomItem: (id) => {
    const { [id]: _removed, ...rest } = get().customItems
    set({ customItems: rest })
    ipcService.saveCustomItems(rest as Record<string, unknown>)
  },
  loaded: false,

  setActiveCharacter: (id) => {
    set({ activeCharacterId: id })
    get().initTurnState?.(id)
  },

  exitCharacter: () => set({ activeCharacterId: null }),

  addCharacter: (character) => {
    set((state) => ({
      characters: { ...state.characters, [character.id]: character }
    }))
    ipcService.save(character.id, character)
  },

  updateCharacter: (id, patch) => {
    set((state) => {
      const current = state.characters[id]
      if (!current) return state
      let nextPatch = patch
      if (current && patch.activeBuffSpells) {
        const previous = new Set(current.activeBuffSpells ?? [])
        const next = new Set(patch.activeBuffSpells)
        const removed = [...previous].filter(spellId => !next.has(spellId))
        let buffStates = removeBuffState({ ...current, buffStates: patch.buffStates ?? current.buffStates }, removed)
        for (const spellId of patch.activeBuffSpells) {
          buffStates = seedBuffState({ ...current, buffStates }, spellId)
        }
        nextPatch = { ...patch, buffStates }
      }
      const updated: Character = { ...current, ...mirrorLegacyPatch(current, nextPatch), updatedAt: new Date().toISOString() }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  dropConcentration: (id) => {
    const char = get().characters[id]
    if (!char) return
    const concId = char.concentrationSpellId
    const nextBuffs = (char.activeBuffSpells ?? []).filter(x => x !== concId)
    const nextConds = char.conditionIds.filter(c => c.conditionId !== 'concentration')
    const patch: Partial<Character> = {
      concentrationSpellId: null,
      conditionIds: nextConds,
      activeBuffSpells: nextBuffs,
      buffStates: removeBuffState(char, concId ? [concId] : []),
      armorClass: computeACFull({ ...char, activeBuffSpells: nextBuffs, conditionIds: nextConds }),
    }
    get().updateCharacter(id, patch)
    get().clearAllSummons(id, { concentrationOnly: true })
  },

  addFeat: (id, featId, opts) => {
    const char = get().characters[id]
    if (!char || char.feats.includes(featId)) return
    const def = FEAT_BY_ID[featId]
    if (!def) return
    if (def.abilityChoice && (!opts?.abilityChoice || !def.abilityChoice.includes(opts.abilityChoice))) return

    const feats = [...char.feats, featId]
    const abilityScores: AbilityScores = { ...char.abilityScores }
    if (def.abilityBonus) {
      for (const [ab, value] of Object.entries(def.abilityBonus) as [AbilityScore, number][]) {
        abilityScores[ab] = Math.min(20, abilityScores[ab] + value)
      }
    }

    const featChoices = { ...(char.featChoices ?? {}) }
    if (def.abilityChoice && opts?.abilityChoice) {
      abilityScores[opts.abilityChoice] = Math.min(20, abilityScores[opts.abilityChoice] + 1)
      featChoices[featId] = opts.abilityChoice
    }

    const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
    const toughBonusHp = feats.includes('tough') ? 2 : 0
    const newMaxHP = computeMaxHP(char.classId, char.level, abilityScores.con, raceBonusHp + toughBonusHp)
    const hpDiff = newMaxHP - char.hitPoints.max
    const withFeat: Character = { ...char, feats, abilityScores, featChoices }
    const patch: Partial<Character> = {
      feats,
      abilityScores,
      featChoices,
      armorClass: computeACFull(withFeat),
      initiative: computeInitiativeFull(withFeat),
      hitPoints: { ...char.hitPoints, max: newMaxHP, current: Math.max(0, char.hitPoints.current + hpDiff) },
    }

    if (featId === 'piercer') patch.piercerCritExtraDie = true
    if (featId === 'crusher') patch.crusherCritAdvantage = true
    if (featId === 'spellSniper' || featId === 'spell-sniper') patch.spellSniperDoubleRange = true
    if (featId === 'mountedCombatant') patch.mountedCombatantFlags = true
    const grantedSpellIds = [...new Set([...(def.grantedSpells ?? []), ...(def.freeCastSpells ?? []), ...(opts?.spellIds ?? [])])]
    if (grantedSpellIds.length) patch.spellIds = [...new Set([...char.spellIds, ...grantedSpellIds])]

    const freeCastSpellIds = [...new Set([...(def.freeCastSpells ?? [])])]
    const chosenFreeCastIds = (opts?.spellIds ?? [])
      .filter(spellId => {
        const spell = SPELL_BY_ID[spellId]
        return !!spell && spell.level === 1 && ['fey-touched', 'shadow-touched', 'magicInitiate', 'artificer-initiate'].includes(featId)
      })
    const featFreeCastIds = [...new Set([...freeCastSpellIds, ...chosenFreeCastIds])]
    if (featFreeCastIds.length || def.grantsResources) {
      const resources = { ...char.resources }
      for (const spellId of featFreeCastIds) {
        resources[`Feat:${spellId}`] = resources[`Feat:${spellId}`] ?? { used: 0, total: 1 }
      }
      // Feat-granted pools (Lucky, Metamagic Adept): add to an existing pool
      // or create it, so the resource shows up with pips immediately.
      for (const [resName, amount] of Object.entries(def.grantsResources ?? {})) {
        const existing = resources[resName]
        resources[resName] = existing
          ? { ...existing, total: existing.total + amount }
          : { used: 0, total: amount }
      }
      patch.resources = resources
    }

    get().updateCharacter(id, patch)
  },

  removeFeat: (id, featId) => {
    const char = get().characters[id]
    if (!char || !char.feats.includes(featId)) return
    const def = FEAT_BY_ID[featId]

    const feats = char.feats.filter(f => f !== featId)
    const abilityScores: AbilityScores = { ...char.abilityScores }
    if (def?.abilityBonus) {
      for (const [ab, value] of Object.entries(def.abilityBonus) as [AbilityScore, number][]) {
        abilityScores[ab] = Math.max(1, abilityScores[ab] - value)
      }
    }

    const featChoices = { ...(char.featChoices ?? {}) }
    const chosen = featChoices[featId]
    if (chosen) {
      abilityScores[chosen] = Math.max(1, abilityScores[chosen] - 1)
      delete featChoices[featId]
    }

    const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
    const toughBonusHp = feats.includes('tough') ? 2 : 0
    const newMaxHP = computeMaxHP(char.classId, char.level, abilityScores.con, raceBonusHp + toughBonusHp)
    const hpDiff = newMaxHP - char.hitPoints.max
    const withoutFeat: Character = { ...char, feats, abilityScores, featChoices }
    const patch: Partial<Character> = {
      feats,
      abilityScores,
      featChoices,
      armorClass: computeACFull(withoutFeat),
      initiative: computeInitiativeFull(withoutFeat),
      hitPoints: { ...char.hitPoints, max: newMaxHP, current: Math.max(0, char.hitPoints.current + hpDiff) },
    }

    if (featId === 'piercer') patch.piercerCritExtraDie = false
    if (featId === 'crusher') patch.crusherCritAdvantage = false
    if (featId === 'spellSniper' || featId === 'spell-sniper') patch.spellSniperDoubleRange = false
    if (featId === 'mountedCombatant') patch.mountedCombatantFlags = false

    if (def?.grantsResources) {
      const resources = { ...char.resources }
      for (const [resName, amount] of Object.entries(def.grantsResources)) {
        const existing = resources[resName]
        if (!existing) continue
        const nextTotal = existing.total - amount
        if (nextTotal <= 0) delete resources[resName]
        else resources[resName] = { used: Math.min(existing.used, nextTotal), total: nextTotal }
      }
      patch.resources = resources
    }

    get().updateCharacter(id, patch)
  },

  deleteCharacter: (id) => {
    ipcService.delete(id)
    set((state) => {
      const { [id]: _, ...rest } = state.characters
      return {
        characters: rest,
        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
      }
    })
  },

  loadFromDisk: async () => {
    if (get().loaded) return
    try {
      await loadEquipmentFromCsv()
      await loadSummonTemplatesFromDisk()

      const allIds = await ipcService.list()
      const charIds = allIds.filter(id => id !== '__customItems__')
      const entries = await Promise.all(
        charIds.map(async (id) => {
          const data = await ipcService.load(id)
          if (data == null) return [id, null] as const
          // THE FLIP: saves load as v14 — legacy one-off fields are folded into
          // featureState. The store's Character type stays the transitional
          // superset until cutover, hence the cast.
          return [id, migrateCharacterV14(data) as unknown as Character] as const
        })
      )
      const characters = Object.fromEntries(
        entries.filter(([, v]) => v != null)
      ) as Record<string, Character>

      let customItems: Record<string, GearEquipmentItem> = {}
      try {
        const rawCustom = await ipcService.loadCustomItems()
        if (rawCustom && typeof rawCustom === 'object') {
          customItems = rawCustom as Record<string, GearEquipmentItem>
        }
      } catch { /* no custom items file yet */ }

      // Legacy custom items must live in the gear catalog for their stats,
      // AC, and attunement to resolve — merge once, then the catalog wins.
      try {
        await mergeCustomGearIntoCatalog(Object.values(customItems))
      } catch { /* keep loading even if the catalog write fails */ }

      set({ characters, customItems, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  shortRest: (id, hdRolled) => {
    mutateCharacter(id, (char) => {
      const availableHD = char.level - char.hitDiceUsed
      if (availableHD <= 0) return null

      const healed = Math.max(0, hdRolled + mod(char.abilityScores.con))

      // Recharge short-rest racial actions (e.g. Breath Weapon, Shift, Fey Step, Hidden Step).
      const newRacialUses = { ...racialActionUsesOf(char) }
      for (const a of RACE_BY_ID[char.race]?.racialActions ?? []) {
        if (a.recharge === 'short') delete newRacialUses[a.id]
      }

      let newSlots = char.spellSlots
      if (char.classId === 'Warlock') {
        newSlots = Object.fromEntries(
          Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
        )
      }

      return {
        hitPoints: { ...char.hitPoints, current: Math.min(char.hitPoints.max, char.hitPoints.current + healed) },
        hitDiceUsed: Math.min(char.level, char.hitDiceUsed + 1),
        resources: applyRestToResources(char, 'short'),
        spellSlots: newSlots,
        racialActionUses: newRacialUses,
        featureState: {
          ...(char.featureState ?? {}),
          'racial-actions': { ...(char.featureState?.['racial-actions'] ?? {}), uses: newRacialUses },
        },
      }
    })
    get().initTurnState?.(id)
  },

  longRest: (id) => {
    mutateCharacter(id, (char) => {
      const recoverHD = Math.max(1, Math.floor(char.level / 2))
      const nextConditionIds = char.conditionIds.filter(c => c.conditionId === 'exhaustion')
      const nextActiveBuffSpells = (char.activeBuffSpells ?? []).filter(id => id !== char.concentrationSpellId)
      const nextBuffStates = removeBuffState(char, char.concentrationSpellId ? [char.concentrationSpellId] : [])

      return {
        hitPoints: { ...char.hitPoints, current: char.hitPoints.max, temp: 0 },
        hitDiceUsed: Math.max(0, char.hitDiceUsed - recoverHD),
        spellSlots: Object.fromEntries(
          Object.entries(char.spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
        ),
        resources: applyRestToResources(char, 'long'),
        deathSaves: { successes: 0, failures: 0 },
        concentrationSpellId: null,
        conditionIds: nextConditionIds,
        activeBuffSpells: nextActiveBuffSpells,
        buffStates: nextBuffStates,
        activeSummons: [],
        armorClass: computeACFull({ ...char, conditionIds: nextConditionIds, activeBuffSpells: nextActiveBuffSpells }),
        isRaging: false,
        isBladesinging: false,
        racialActionUses: {},
        featureState: {
          ...(char.featureState ?? {}),
          rage: { ...(char.featureState?.['rage'] ?? {}), on: false },
          bladesong: { ...(char.featureState?.['bladesong'] ?? {}), on: false },
          'racial-actions': { ...(char.featureState?.['racial-actions'] ?? {}), uses: {} },
        },
      }
    })
    get().initTurnState?.(id)
  },

  levelUp: (id, asiChoice, newSpellIds) => {
    set((state) => {
      const char = state.characters[id]
      if (!char || char.level >= 20) return state
      const newLevel = char.level + 1
      const newProf = profBonus(newLevel)

      let newScores: AbilityScores = { ...char.abilityScores }
      let newFeats: string[] = [...char.feats]
      if (asiChoice) {
        if (asiChoice.type === 'double') {
          newScores = { ...newScores, [asiChoice.ability]: Math.min(20, newScores[asiChoice.ability] + 2) }
        } else if (asiChoice.type === 'split') {
          newScores = {
            ...newScores,
            [asiChoice.ability1]: Math.min(20, newScores[asiChoice.ability1] + 1),
            [asiChoice.ability2]: Math.min(20, newScores[asiChoice.ability2] + 1),
          }
        } else if (asiChoice.type === 'feat') {
          newFeats = [...newFeats, asiChoice.featId]
          if (asiChoice.featAbilityChoice) {
            newScores = { ...newScores, [asiChoice.featAbilityChoice]: Math.min(20, newScores[asiChoice.featAbilityChoice] + 1) }
          }
        }
      }

      const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
      const bonusHpPerLevel = raceBonusHp + (newFeats.includes('tough') ? 2 : 0)
      const mobileBonus = newFeats.includes('mobile') ? 10 : 0

      const newMaxHp = computeMaxHP(char.classId, newLevel, newScores.con, bonusHpPerLevel)
      const hpGain = newMaxHp - char.hitPoints.max
      const newSlots = defaultSpellSlots(char.classId, newLevel, char.subclass ?? undefined)
      const mergedSlots = { ...newSlots }
      for (const [lvl, slot] of Object.entries(char.spellSlots)) {
        if (mergedSlots[Number(lvl)]) {
          mergedSlots[Number(lvl)] = {
            total: mergedSlots[Number(lvl)].total,
            used: Math.min(slot.used, mergedSlots[Number(lvl)].total),
          }
        }
      }

      const newDefaults = getResourceDefaults(char.classId, newLevel, newScores, char.subclass)
      const newResources: Record<string, { used: number; total: number }> = {}
      for (const [key, def] of Object.entries(newDefaults)) {
        const existing = char.resources[key]
        newResources[key] = existing
          ? { used: existing.used, total: def.total }
          : { used: 0, total: def.total }
      }

      const racialSpellsAtLevel = RACE_BY_ID[char.race]?.racialSpells?.[newLevel] ?? []
      const mergedSpellIds = [...new Set([
        ...(newSpellIds ? [...char.spellIds, ...newSpellIds] : char.spellIds),
        ...racialSpellsAtLevel,
      ])]
      const mergedSpellSet = new Set(mergedSpellIds)
      const validPreparedIds = char.preparedSpellIds.filter(id => mergedSpellSet.has(id))

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        level: newLevel,
        proficiencyBonus: newProf,
        abilityScores: newScores,
        feats: newFeats,
        bonusHpPerLevel,
        initiative: computeInitiativeFull({ ...char, abilityScores: newScores, level: newLevel, proficiencyBonus: newProf, feats: newFeats }),
        armorClass: computeACFull({ ...char, abilityScores: newScores }),
        speed: mobileBonus > 0 ? computeSpeed(char.race) + mobileBonus : char.speed,
        hitPoints: {
          ...char.hitPoints,
          max: newMaxHp,
          current: Math.min(newMaxHp, char.hitPoints.current + hpGain),
        },
        spellSlots: mergedSlots,
        resources: newResources,
        spellIds: mergedSpellIds,
        preparedSpellIds: validPreparedIds,
        completedAsiLevels: asiChoice
          ? [...(char.completedAsiLevels ?? []), newLevel]
          : (char.completedAsiLevels ?? []),
        completedAsiChoices: asiChoice
          ? { ...(char.completedAsiChoices ?? {}), [newLevel]: formatAsiChoice(asiChoice) }
          : (char.completedAsiChoices ?? {}),
      }
      ipcService.save(id, updated)
      get().initTurnState?.(id)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  applyPendingAsi: (id, asiLevel, choice) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state

      let newScores = { ...char.abilityScores }
      let newFeats = [...char.feats]
      if (choice.type === 'double') {
        newScores = { ...newScores, [choice.ability]: Math.min(20, newScores[choice.ability] + 2) }
      } else if (choice.type === 'split') {
        newScores = {
          ...newScores,
          [choice.ability1]: Math.min(20, newScores[choice.ability1] + 1),
          [choice.ability2]: Math.min(20, newScores[choice.ability2] + 1),
        }
      } else if (choice.type === 'feat') {
        newFeats = [...newFeats, choice.featId]
        if (choice.featAbilityChoice) {
          newScores = { ...newScores, [choice.featAbilityChoice]: Math.min(20, newScores[choice.featAbilityChoice] + 1) }
        }
      }

      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        abilityScores: newScores,
        feats: newFeats,
        armorClass: computeACFull({ ...char, abilityScores: newScores }),
        initiative: computeInitiativeFull({ ...char, abilityScores: newScores, feats: newFeats }),
        completedAsiLevels: [...(char.completedAsiLevels ?? []), asiLevel],
        completedAsiChoices: { ...(char.completedAsiChoices ?? {}), [asiLevel]: formatAsiChoice(choice) },
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  setTempHp: (id, amount) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        hitPoints: { ...char.hitPoints, temp: Math.max(0, amount) },
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  updateEquipmentSlot: (id, slot, value) => {
    set((state) => {
      const char = state.characters[id]
      if (!char) return state
      // Auto-attune on equip when the item needs it and a slot is free (max 3).
      const attuned = char.attunedItemIds ?? []
      const needsAttune = !!value && !!GEAR_BY_ID[value]?.requiresAttunement && !attuned.includes(value)
      const nextAttuned = needsAttune && attuned.length < 3 ? [...attuned, value!] : attuned
      const withEquip: Character = { ...char, equipment: { ...char.equipment, [slot]: value }, attunedItemIds: nextAttuned }
      const updated: Character = {
        ...withEquip,
        updatedAt: new Date().toISOString(),
        ...computeDerivedStats(withEquip),
      }
      ipcService.save(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  buyItem: (charId, itemId, cost) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char || char.gold < cost) return state
      if (char.ownedItemIds.includes(itemId)) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        gold: char.gold - cost,
        ownedItemIds: [...char.ownedItemIds, itemId],
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  sellItem: (charId, itemId, cost) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char || !char.ownedItemIds.includes(itemId)) return state
      const newEquipment = { ...char.equipment } as unknown as Record<string, string | null>
      for (const key of Object.keys(newEquipment)) {
        if (newEquipment[key] === itemId) newEquipment[key] = null
      }
      const withEquip: Character = {
        ...char,
        gold: char.gold + cost,
        ownedItemIds: char.ownedItemIds.filter(id => id !== itemId),
        equipment: newEquipment as unknown as typeof char.equipment,
      }
      const updated: Character = {
        ...withEquip,
        updatedAt: new Date().toISOString(),
        ...computeDerivedStats(withEquip),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  equipItemToSlot: (charId, slot, itemId) => {
    get().updateEquipmentSlot(charId, slot, itemId)
  },

  unequipSlot: (charId, slot) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const itemId = char.equipment[slot] as string | null
      if (!itemId) return state
      const needsOwned = !char.ownedItemIds.includes(itemId)
      const withEquip: Character = {
        ...char,
        equipment: { ...char.equipment, [slot]: null },
        ownedItemIds: needsOwned ? [...char.ownedItemIds, itemId] : char.ownedItemIds,
        attunedItemIds: (char.attunedItemIds ?? []).filter(id => id !== itemId),
      }
      const updated: Character = {
        ...withEquip,
        updatedAt: new Date().toISOString(),
        ...computeDerivedStats(withEquip),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  unequipWeapon: (charId, slotIndex) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const weapon = char.weapons[slotIndex]
      if (!weapon) return state
      const needsOwned = !char.ownedItemIds.includes(weapon.id)
      const withWeapons: Character = {
        ...char,
        weapons: char.weapons.filter((_, i) => i !== slotIndex),
        ownedItemIds: needsOwned ? [...char.ownedItemIds, weapon.id] : char.ownedItemIds,
        attunedItemIds: (char.attunedItemIds ?? []).filter(id => id !== weapon.id),
      }
      const updated: Character = {
        ...withWeapons,
        updatedAt: new Date().toISOString(),
        ...computeDerivedStats(withWeapons),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  equipWeaponFromId: (charId, defId, slotIndex) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const def = WEAPON_BY_ID[defId]
      if (!def) return state
      const newWeapon: Weapon = {
        id: defId,
        name: def.name,
        atkBonus: 0,
        damage: def.damageDie,
        damageType: def.damageType,
        rangeType: def.rangeType,
        properties: [...def.properties],
        enchantmentBonus: def.enchantmentBonus || undefined,
        toHitDiceCount:   def.toHitDiceCount,
        toHitDieType:     def.toHitDieType,
        toHitFlat:        def.toHitFlat,
        dmgBonusCount:    def.dmgBonusCount,
        dmgBonusDieType:  def.dmgBonusDieType,
        dmgBonusFlat:     def.dmgBonusFlat,
        dmgBonusType:     def.dmgBonusType,
        critModifier:     def.critModifier,
      }
      const nextWeapons = [...char.weapons]
      nextWeapons[slotIndex] = newWeapon
      if (slotIndex === 0 && def.properties.some(p => p.toLowerCase().includes('two-handed')))
        nextWeapons.length = 1
      // Auto-attune on equip when the weapon needs it and a slot is free (max 3).
      const attuned = char.attunedItemIds ?? []
      const nextAttuned = def.requiresAttunement && !attuned.includes(defId) && attuned.length < 3
        ? [...attuned, defId] : attuned
      const withWeapons: Character = { ...char, weapons: nextWeapons, attunedItemIds: nextAttuned }
      const updated: Character = {
        ...withWeapons,
        updatedAt: new Date().toISOString(),
        ...computeDerivedStats(withWeapons),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  toggleAttune: (charId, itemId) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const attuned = char.attunedItemIds ?? []
      const isAttuned = attuned.includes(itemId)
      const next = isAttuned
        ? attuned.filter(id => id !== itemId)
        : attuned.length < 3 ? [...attuned, itemId] : attuned
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        attunedItemIds: next,
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  summonFromTemplate: (charId, templateId, count = 1, source) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const tpl = SUMMON_TEMPLATE_BY_ID[templateId]
      if (!tpl) return state

      const base: SummonBase = {
        name: tpl.name,
        type: tpl.type,
        maxHp: tpl.maxHp,
        ac: templateId === 'echo' ? 11 + char.proficiencyBonus : tpl.ac,
        speed: tpl.speed,
        initiativeMod: tpl.initiativeMod,
        attacks: tpl.attacks.map(a => ({ ...a })),
        actionEconomy: { ...tpl.actionEconomy },
        spells: tpl.spells ? [...tpl.spells] : undefined,
        resources: tpl.resources ? tpl.resources.map(r => ({ ...r })) : undefined,
        abilityScores: templateId === 'echo'
          ? { ...char.abilityScores }
          : tpl.abilityScores ? { ...tpl.abilityScores } : undefined,
        savingThrowProficiencies: tpl.savingThrowProficiencies ? [...tpl.savingThrowProficiencies] : undefined,
        proficiencyBonus: tpl.proficiencyBonus,
        usesCasterPB: tpl.usesCasterPB,
      }

      const concentration = source?.spellId
        ? SPELL_BY_ID[source.spellId]?.concentration
        : undefined

      // Continue #N numbering per template name across existing summons.
      const existingOfName = char.activeSummons.filter(s => s.base.name === tpl.name).length
      const now = new Date().toISOString()
      const newSummons: ActiveSummon[] = []
      for (let i = 0; i < Math.max(1, count); i++) {
        newSummons.push({
          id: crypto.randomUUID(),
          templateId,
          label: `${tpl.name} #${existingOfName + i + 1}`,
          createdAt: now,
          sourceSpellId: source?.spellId,
          concentration,
          base,
          hp: { current: tpl.maxHp, max: tpl.maxHp, temp: 0 },
          conditionIds: [],
          economyUsed: { actions: 0, bonusActions: 0, reactions: 0 },
          resourcesUsed: {},
          initiativeRoll: null,
          notes: tpl.defaultNotes ?? '',
        })
      }

      const updated: Character = {
        ...char,
        updatedAt: now,
        activeSummons: [...char.activeSummons, ...newSummons],
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  removeSummon: (charId, summonId) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        activeSummons: char.activeSummons.filter(s => s.id !== summonId),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  updateSummonState: (charId, summonId, patch) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        activeSummons: char.activeSummons.map(s =>
          s.id === summonId ? { ...s, ...patch } : s
        ),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  newSummonTurn: (charId, summonId) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        activeSummons: char.activeSummons.map(s =>
          s.id === summonId
            ? { ...s, economyUsed: { actions: 0, bonusActions: 0, reactions: 0 } }
            : s
        ),
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },

  clearAllSummons: (charId, filter) => {
    set((state) => {
      const char = state.characters[charId]
      if (!char) return state
      let next: ActiveSummon[] = []
      if (filter?.concentrationOnly) {
        next = char.activeSummons.filter(s => !s.concentration)
      } else if (filter?.spellId) {
        next = char.activeSummons.filter(s => s.sourceSpellId !== filter.spellId)
      }
      const updated: Character = {
        ...char,
        updatedAt: new Date().toISOString(),
        activeSummons: next,
      }
      ipcService.save(charId, updated)
      return { characters: { ...state.characters, [charId]: updated } }
    })
  },
  })
}
