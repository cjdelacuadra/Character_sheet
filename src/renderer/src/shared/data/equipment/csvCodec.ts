import Papa from 'papaparse'
import type { WeaponEquipmentItem, GearEquipmentItem, ItemRarity, ArmorType, WeaponProficiencyCategory, WeaponRangeType, AccessorySlot } from './types'
import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'

// ── helpers ──────────────────────────────────────────────────────────────────

const ABILITIES: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const SKILLS: Skill[] = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleightOfHand', 'stealth', 'survival',
]

function num(v: string | undefined): number | undefined {
  if (!v || v === '') return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
function bool(v: string | undefined): boolean | undefined {
  if (v === 'true') return true
  return undefined
}
function str(v: string | undefined): string | undefined {
  return v && v !== '' ? v : undefined
}
function pipes(v: string | undefined): string[] {
  return v && v !== '' ? v.split('|').filter(Boolean) : []
}
function serPipes(arr: string[] | undefined): string {
  return arr && arr.length ? arr.join('|') : ''
}

// ── weapons ──────────────────────────────────────────────────────────────────

const WEAPON_COLS = [
  'id', 'name', 'kind', 'cost', 'rarity', 'sprite',
  'damageDie', 'damageType', 'proficiencyCategory', 'rangeType', 'properties',
  'enchantmentBonus', 'enchantment', 'enchantments', 'bonusDamageDie', 'bonusDamageType', 'isMonkWeapon',
  'to_hit_count', 'to_hit_die', 'to_hit_flat',
  'dmg_bonus_count', 'dmg_bonus_die', 'dmg_bonus_flat', 'dmg_bonus_type',
]

export function weaponsToCsv(weapons: WeaponEquipmentItem[]): string {
  const rows = weapons.map(w => ({
    id:                  w.id,
    name:                w.name,
    kind:                w.kind,
    cost:                w.cost,
    rarity:              w.rarity ?? '',
    sprite:              w.sprite ?? '',
    damageDie:           w.damageDie,
    damageType:          w.damageType,
    proficiencyCategory: w.proficiencyCategory,
    rangeType:           w.rangeType,
    properties:          serPipes(w.properties),
    enchantmentBonus:    w.enchantmentBonus ?? '',
    enchantment:         w.enchantment ?? '',
    enchantments:        serPipes(w.enchantments),
    bonusDamageDie:      w.bonusDamageDie ?? '',
    bonusDamageType:     w.bonusDamageType ?? '',
    isMonkWeapon:        w.isMonkWeapon ? 'true' : '',
    to_hit_count:        w.toHitDiceCount ?? '',
    to_hit_die:          w.toHitDieType ?? '',
    to_hit_flat:         w.toHitFlat ?? '',
    dmg_bonus_count:     w.dmgBonusCount ?? '',
    dmg_bonus_die:       w.dmgBonusDieType ?? '',
    dmg_bonus_flat:      w.dmgBonusFlat ?? '',
    dmg_bonus_type:      w.dmgBonusType ?? '',
  }))
  return Papa.unparse(rows, { columns: WEAPON_COLS })
}

export function csvToWeapons(csv: string): WeaponEquipmentItem[] {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  return result.data.map(r => {
    const w: WeaponEquipmentItem = {
      id:                  r.id,
      name:                r.name,
      kind:                'weapon',
      cost:                Number(r.cost) || 0,
      rarity:              (r.rarity as ItemRarity) || undefined,
      sprite:              str(r.sprite),
      damageDie:           r.damageDie,
      damageType:          r.damageType,
      proficiencyCategory: r.proficiencyCategory as WeaponProficiencyCategory,
      rangeType:           r.rangeType as WeaponRangeType,
      properties:          pipes(r.properties),
      enchantmentBonus:    num(r.enchantmentBonus),
      enchantment:         str(r.enchantment),
      enchantments:        pipes(r.enchantments).length ? pipes(r.enchantments) : undefined,
      bonusDamageDie:      str(r.bonusDamageDie),
      bonusDamageType:     str(r.bonusDamageType),
      isMonkWeapon:        bool(r.isMonkWeapon),
      toHitDiceCount:      num(r.to_hit_count),
      toHitDieType:        num(r.to_hit_die),
      toHitFlat:           num(r.to_hit_flat),
      dmgBonusCount:       num(r.dmg_bonus_count),
      dmgBonusDieType:     num(r.dmg_bonus_die),
      dmgBonusFlat:        num(r.dmg_bonus_flat),
      dmgBonusType:        str(r.dmg_bonus_type),
    }
    return w
  })
}

// ── gear (armor, shields, accessories) ────────────────────────────────────────

const GEAR_COLS = [
  'id', 'name', 'kind', 'cost', 'rarity', 'sprite',
  'type', 'baseAC', 'dexCap', 'stealthDisadvantage', 'strRequirement', 'enchantmentBonus',
  'stats_acBonus', 'stats_toHitBonus', 'stats_toHitAppliesTo', 'stats_speedBonus',
  ...ABILITIES.map(a => `stats_ab_${a}`),
  ...ABILITIES.map(a => `stats_save_${a}`),
  ...SKILLS.map(s  => `stats_skill_${s}`),
  'stats_adv_saves', 'stats_adv_skills', 'stats_adv_deathSaves',
  'stats_bonusDmg_flat', 'stats_bonusDmg_dice', 'stats_bonusDmg_type', 'stats_bonusDmg_appliesTo',
]

export function gearToCsv(gear: GearEquipmentItem[]): string {
  const rows = gear.map(g => {
    const s = g.stats
    const row: Record<string, string | number> = {
      id:                  g.id,
      name:                g.name,
      kind:                g.kind,
      cost:                g.cost,
      rarity:              g.rarity ?? '',
      sprite:              g.sprite ?? '',
      type:                g.type ?? '',
      baseAC:              g.baseAC ?? '',
      dexCap:              g.dexCap ?? '',
      stealthDisadvantage: g.stealthDisadvantage ? 'true' : '',
      strRequirement:      g.strRequirement ?? '',
      enchantmentBonus:    g.enchantmentBonus ?? '',
      stats_acBonus:       s?.acBonus ?? '',
      stats_toHitBonus:    s?.toHitBonus ?? '',
      stats_toHitAppliesTo: s?.toHitBonusAppliesTo ?? '',
      stats_speedBonus:    s?.speedBonus ?? '',
    }
    for (const ab of ABILITIES) {
      row[`stats_ab_${ab}`]   = s?.abilityBonus?.[ab] ?? ''
      row[`stats_save_${ab}`] = s?.savingThrowBonus?.[ab] ?? ''
    }
    for (const sk of SKILLS) {
      row[`stats_skill_${sk}`] = s?.skillBonus?.[sk] ?? ''
    }
    row.stats_adv_saves      = serPipes(s?.advantage?.savingThrows)
    row.stats_adv_skills     = serPipes(s?.advantage?.skills)
    row.stats_adv_deathSaves = s?.advantage?.deathSaves ? 'true' : ''
    row.stats_bonusDmg_flat  = s?.bonusDamage?.flat ?? ''
    row.stats_bonusDmg_dice  = s?.bonusDamage?.dice ?? ''
    row.stats_bonusDmg_type  = s?.bonusDamage?.dmgType ?? ''
    row.stats_bonusDmg_appliesTo = s?.bonusDamage?.appliesTo ?? ''
    return row
  })
  return Papa.unparse(rows, { columns: GEAR_COLS })
}

export function csvToGear(csv: string): GearEquipmentItem[] {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  return result.data.map(r => {
    const abilityBonus: Partial<Record<AbilityScore, number>> = {}
    for (const ab of ABILITIES) {
      const v = num(r[`stats_ab_${ab}`])
      if (v !== undefined) abilityBonus[ab] = v
    }
    const savingThrowBonus: Partial<Record<AbilityScore, number>> = {}
    for (const ab of ABILITIES) {
      const v = num(r[`stats_save_${ab}`])
      if (v !== undefined) savingThrowBonus[ab] = v
    }
    const skillBonus: Partial<Record<Skill, number>> = {}
    for (const sk of SKILLS) {
      const v = num(r[`stats_skill_${sk}`])
      if (v !== undefined) skillBonus[sk] = v
    }
    const advSaves  = pipes(r.stats_adv_saves) as AbilityScore[]
    const advSkills = pipes(r.stats_adv_skills) as Skill[]
    const deathSaves = r.stats_adv_deathSaves === 'true'
    const bonusDmgType = str(r.stats_bonusDmg_type)
    const bonusDmgFlat = num(r.stats_bonusDmg_flat)
    const bonusDmgDice = str(r.stats_bonusDmg_dice)
    const bonusDmgAppliesTo = str(r.stats_bonusDmg_appliesTo) as 'melee' | 'ranged' | 'all' | undefined
    const toHitAppliesTo = str(r.stats_toHitAppliesTo) as 'melee' | 'ranged' | 'both' | undefined

    const hasStats =
      num(r.stats_acBonus) !== undefined ||
      num(r.stats_toHitBonus) !== undefined ||
      num(r.stats_speedBonus) !== undefined ||
      Object.keys(abilityBonus).length > 0 ||
      Object.keys(savingThrowBonus).length > 0 ||
      Object.keys(skillBonus).length > 0 ||
      advSaves.length > 0 || advSkills.length > 0 || deathSaves ||
      bonusDmgType !== undefined

    const stats = hasStats ? {
      acBonus:          num(r.stats_acBonus),
      toHitBonus:            num(r.stats_toHitBonus),
      toHitBonusAppliesTo:   toHitAppliesTo,
      speedBonus:            num(r.stats_speedBonus),
      abilityBonus:     Object.keys(abilityBonus).length    ? abilityBonus     : undefined,
      savingThrowBonus: Object.keys(savingThrowBonus).length ? savingThrowBonus : undefined,
      skillBonus:       Object.keys(skillBonus).length       ? skillBonus       : undefined,
      advantage: (advSaves.length || advSkills.length || deathSaves) ? {
        savingThrows: advSaves.length   ? advSaves   : undefined,
        skills:       advSkills.length  ? advSkills  : undefined,
        deathSaves:   deathSaves || undefined,
      } : undefined,
      bonusDamage: bonusDmgType !== undefined ? {
        flat:      bonusDmgFlat,
        dice:      bonusDmgDice,
        dmgType:   bonusDmgType,
        appliesTo: bonusDmgAppliesTo,
      } : undefined,
    } : undefined

    const gear: GearEquipmentItem = {
      id:                  r.id,
      name:                r.name,
      kind:                r.kind as AccessorySlot,
      cost:                Number(r.cost) || 0,
      rarity:              (r.rarity as ItemRarity) || undefined,
      sprite:              str(r.sprite),
      type:                str(r.type) as ArmorType | undefined,
      baseAC:              num(r.baseAC),
      dexCap:              num(r.dexCap),
      stealthDisadvantage: bool(r.stealthDisadvantage),
      strRequirement:      num(r.strRequirement),
      enchantmentBonus:    num(r.enchantmentBonus),
      stats,
    }
    return gear
  })
}
