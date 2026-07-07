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


// ── shared stats block (gear + weapons) ──────────────────────────────────────

const STATS_COLS = [
  'stats_acBonus', 'stats_toHitBonus', 'stats_toHitDice', 'stats_toHitAppliesTo', 'stats_speedBonus',
  ...ABILITIES.map(a => `stats_ab_${a}`),
  ...ABILITIES.map(a => `stats_abset_${a}`),
  ...ABILITIES.map(a => `stats_save_${a}`),
  ...SKILLS.map(s  => `stats_skill_${s}`),
  'stats_adv_saves', 'stats_adv_skills', 'stats_adv_deathSaves',
  'stats_bonusDmg_flat', 'stats_bonusDmg_dice', 'stats_bonusDmg_type', 'stats_bonusDmg_appliesTo',
  'stats_crit_bonus', 'stats_crit_bonus_type',
  'stats_critDmg_dice', 'stats_critDmg_flat', 'stats_critDmg_type',
]

function writeStatsColumns(row: Record<string, string | number>, s: import('./types').AccessoryStats | undefined): void {
  row.stats_acBonus        = s?.acBonus ?? ''
  row.stats_toHitBonus     = s?.toHitBonus ?? ''
  row.stats_toHitDice      = s?.toHitDice ?? ''
  row.stats_toHitAppliesTo = s?.toHitBonusAppliesTo ?? ''
  row.stats_speedBonus     = s?.speedBonus ?? ''
  for (const ab of ABILITIES) {
    row[`stats_ab_${ab}`]    = s?.abilityBonus?.[ab] ?? ''
    row[`stats_abset_${ab}`] = s?.abilitySet?.[ab] ?? ''
    row[`stats_save_${ab}`]  = s?.savingThrowBonus?.[ab] ?? ''
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
  row.stats_crit_bonus     = s?.critModifier ? Object.values(s.critModifier)[0] ?? '' : ''
  row.stats_crit_bonus_type = s?.critModifier ? Object.keys(s.critModifier)[0] ?? '' : ''
  row.stats_critDmg_dice   = s?.critBonusDamage?.dice ?? ''
  row.stats_critDmg_flat   = s?.critBonusDamage?.flat ?? ''
  row.stats_critDmg_type   = s?.critBonusDamage?.dmgType ?? ''
}

function readStatsColumns(r: Record<string, string>): import('./types').AccessoryStats | undefined {
  const abilityBonus: Partial<Record<AbilityScore, number>> = {}
  const abilitySet: Partial<Record<AbilityScore, number>> = {}
  const savingThrowBonus: Partial<Record<AbilityScore, number>> = {}
  for (const ab of ABILITIES) {
    const b = num(r[`stats_ab_${ab}`]);    if (b !== undefined) abilityBonus[ab] = b
    const st = num(r[`stats_abset_${ab}`]); if (st !== undefined) abilitySet[ab] = st
    const sv = num(r[`stats_save_${ab}`]);  if (sv !== undefined) savingThrowBonus[ab] = sv
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
  const critModifier: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>> = {}
  const cb = num(r.stats_crit_bonus)
  const cbt = str(r.stats_crit_bonus_type) as 'melee' | 'ranged' | 'spells' | 'martial' | 'all' | undefined
  if (cb !== undefined && cbt) critModifier[cbt] = cb
  const critDmgType = str(r.stats_critDmg_type)

  const hasStats =
    num(r.stats_acBonus) !== undefined ||
    num(r.stats_toHitBonus) !== undefined ||
    str(r.stats_toHitDice) !== undefined ||
    num(r.stats_speedBonus) !== undefined ||
    Object.keys(abilityBonus).length > 0 ||
    Object.keys(abilitySet).length > 0 ||
    Object.keys(savingThrowBonus).length > 0 ||
    Object.keys(skillBonus).length > 0 ||
    advSaves.length > 0 || advSkills.length > 0 || deathSaves ||
    bonusDmgType !== undefined ||
    critDmgType !== undefined ||
    Object.keys(critModifier).length > 0

  if (!hasStats) return undefined
  return {
    acBonus:             num(r.stats_acBonus),
    toHitBonus:          num(r.stats_toHitBonus),
    toHitDice:           str(r.stats_toHitDice),
    toHitBonusAppliesTo: str(r.stats_toHitAppliesTo) as 'melee' | 'ranged' | 'both' | undefined,
    speedBonus:          num(r.stats_speedBonus),
    abilityBonus:     Object.keys(abilityBonus).length     ? abilityBonus     : undefined,
    abilitySet:       Object.keys(abilitySet).length       ? abilitySet       : undefined,
    savingThrowBonus: Object.keys(savingThrowBonus).length ? savingThrowBonus : undefined,
    skillBonus:       Object.keys(skillBonus).length       ? skillBonus       : undefined,
    advantage: (advSaves.length || advSkills.length || deathSaves) ? {
      savingThrows: advSaves.length  ? advSaves  : undefined,
      skills:       advSkills.length ? advSkills : undefined,
      deathSaves:   deathSaves || undefined,
    } : undefined,
    bonusDamage: bonusDmgType !== undefined ? {
      flat:      num(r.stats_bonusDmg_flat),
      dice:      str(r.stats_bonusDmg_dice),
      dmgType:   bonusDmgType,
      appliesTo: str(r.stats_bonusDmg_appliesTo) as 'melee' | 'ranged' | 'all' | undefined,
    } : undefined,
    critModifier: Object.keys(critModifier).length > 0 ? critModifier : undefined,
    critBonusDamage: critDmgType !== undefined ? {
      dice:    str(r.stats_critDmg_dice),
      flat:    num(r.stats_critDmg_flat),
      dmgType: critDmgType,
    } : undefined,
  }
}

// ── weapons ──────────────────────────────────────────────────────────────────

const WEAPON_COLS = [
  'id', 'name', 'kind', 'cost', 'rarity', 'sprite',
  'damageDie', 'damageType', 'proficiencyCategory', 'rangeType', 'properties',
  'enchantmentBonus', 'enchantment', 'enchantments', 'bonusDamageDie', 'bonusDamageType', 'isMonkWeapon',
  'to_hit_count', 'to_hit_die', 'to_hit_flat',
  'dmg_bonus_count', 'dmg_bonus_die', 'dmg_bonus_flat', 'dmg_bonus_type',
  'requiresAttunement', 'crit_bonus', 'crit_bonus_type',
  ...STATS_COLS,
]

export function weaponsToCsv(weapons: WeaponEquipmentItem[]): string {
  const rows = weapons.map(w => {
    const row: Record<string, string | number> = {
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
    requiresAttunement:  w.requiresAttunement ? 'true' : '',
    crit_bonus:          w.critModifier ? Object.values(w.critModifier)[0] ?? '' : '',
    crit_bonus_type:     w.critModifier ? Object.keys(w.critModifier)[0] ?? '' : '',
    }
    writeStatsColumns(row, w.stats)
    return row
  })
  return Papa.unparse(rows, { columns: WEAPON_COLS })
}

export function csvToWeapons(csv: string): WeaponEquipmentItem[] {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  return result.data.map(r => {
    const critModifier: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>> = {}
    const cb = num(r.crit_bonus)
    const cbt = str(r.crit_bonus_type) as 'melee' | 'ranged' | 'spells' | 'martial' | 'all' | undefined
    if (cb !== undefined && cbt) {
      critModifier[cbt] = cb
    }

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
      requiresAttunement:  bool(r.requiresAttunement),
      critModifier:        Object.keys(critModifier).length > 0 ? critModifier : undefined,
      stats:               readStatsColumns(r),
    }
    return w
  })
}

// ── gear (armor, shields, accessories) ────────────────────────────────────────

const GEAR_COLS = [
  'id', 'name', 'kind', 'cost', 'rarity', 'sprite',
  'type', 'baseAC', 'dexCap', 'stealthDisadvantage', 'strRequirement', 'enchantmentBonus', 'requiresAttunement',
  ...STATS_COLS,
]

export function gearToCsv(gear: GearEquipmentItem[]): string {
  const rows = gear.map(g => {
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
      requiresAttunement:  g.requiresAttunement ? 'true' : '',
    }
    writeStatsColumns(row, g.stats)
    return row
  })
  return Papa.unparse(rows, { columns: GEAR_COLS })
}

export function csvToGear(csv: string): GearEquipmentItem[] {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  return result.data.map(r => {
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
      requiresAttunement:  bool(r.requiresAttunement),
      stats:               readStatsColumns(r),
    }
    return gear
  })
}
