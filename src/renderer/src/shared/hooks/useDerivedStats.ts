import { useMemo } from 'react'
import type { Character, AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS } from '@/shared/data/skills'
import {
  mod,
  profBonus,
  computeMaxHP,
  computeAC,
  computeSpeed,
  skillBonus,
  savingThrowBonus,
} from '@/shared/data/charCalculations'
import {
  computeSpellSaveDC,
  computeSpellAttackBonus,
  computeAttackBonus,
} from '@/domain/rules'

export interface DerivedStats {
  abilityModifiers: Record<AbilityScore, number>
  proficiencyBonus: number
  maxHP: number
  armorClass: number
  initiative: number
  speed: number
  spellSaveDC: number
  spellAttackBonus: number
  passivePerception: number
  skillBonuses: Record<Skill, number>
  savingThrowBonuses: Record<AbilityScore, number>
  attackBonuses: number[]
}

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function useDerivedStats(character: Character): DerivedStats {
  return useMemo(() => {
    const { abilityScores, level, equipment, classId, race, subclass } = character
    const pb = profBonus(level)

    const abilityModifiers = Object.fromEntries(
      ABILITY_KEYS.map(k => [k, mod(abilityScores[k])])
    ) as Record<AbilityScore, number>

    const maxHP = computeMaxHP(classId, level, abilityScores.con, character.bonusHpPerLevel)

    const armorClass = computeAC({ abilityScores, equipment, classId, race, subclass })

    const initiative = character.feats.includes('alert')
      ? abilityModifiers.dex + 5
      : abilityModifiers.dex

    const speed = character.feats.includes('mobile')
      ? computeSpeed(race) + 10
      : computeSpeed(race)

    const spellSaveDC = computeSpellSaveDC(character)
    const spellAttackBonusVal = computeSpellAttackBonus(character)

    const skillBonuses = Object.fromEntries(
      SKILLS.map(s => [
        s.key,
        skillBonus(s.key, abilityScores[s.ability], character.skillProficiencies[s.key] ?? 'none', pb)
      ])
    ) as Record<Skill, number>

    const savingThrowBonuses = Object.fromEntries(
      ABILITY_KEYS.map(k => [
        k,
        savingThrowBonus(abilityScores[k], character.savingThrowProficiencies.includes(k), pb)
      ])
    ) as Record<AbilityScore, number>

    const passivePerception = 10 + skillBonuses.perception

    const attackBonuses = (character.weapons ?? []).map(w => computeAttackBonus(character, w))

    return {
      abilityModifiers,
      proficiencyBonus: pb,
      maxHP,
      armorClass,
      initiative,
      speed,
      spellSaveDC,
      spellAttackBonus: spellAttackBonusVal,
      passivePerception,
      skillBonuses,
      savingThrowBonuses,
      attackBonuses,
    }
  }, [character])
}
