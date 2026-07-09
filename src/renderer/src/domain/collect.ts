/**
 * Collects every active mechanical effect on a character into the shared
 * SourcedEffect vocabulary (domain/effects). Adapters read the existing data
 * catalogs (spell buff fields, condition mechanics, equipment stats); as
 * catalogs are normalized they will emit Effects directly and their adapter
 * here shrinks away.
 */
import type { Character } from '@/entities/character/types'
import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { CONDITION_BY_ID } from '@/shared/data/conditionsData'
import { computeEquipmentStats } from '@/shared/data/charCalculations'
import type { SourcedEffect } from './effects'

type EffectSources = Pick<Character, 'equipment' | 'abilityScores'> &
  Partial<Pick<Character, 'activeBuffSpells' | 'conditionIds' | 'buffStates' | 'weapons' | 'attunedItemIds' | 'feats' | 'race'>>

export function collectActiveEffects(char: EffectSources): SourcedEffect[] {
  return [
    ...collectBuffSpellEffects(char),
    ...collectConditionEffects(char),
    ...collectEquipmentEffects(char),
  ]
}

/** Active buff spells (char.activeBuffSpells) → Effects, honouring one-shot rider state. */
export function collectBuffSpellEffects(
  char: Pick<EffectSources, 'activeBuffSpells' | 'buffStates'>,
): SourcedEffect[] {
  const out: SourcedEffect[] = []
  for (const spellId of char.activeBuffSpells ?? []) {
    const spell = SPELL_BY_ID[spellId]
    if (!spell) continue
    const src = { sourceId: spell.id, sourceLabel: spell.name, sourceType: 'buff' as const }
    // attackBuff fields describe weapon-attack buffs in this app's model
    // (Divine Favor, Hunter's Mark, Elemental Weapon) — never spell damage.
    const scope = 'weapon' as const

    if (spell.setsBaseAC !== undefined) out.push({ ...src, effect: { kind: 'acBase', value: spell.setsBaseAC, addDex: true } })
    if (spell.acBonus)          out.push({ ...src, effect: { kind: 'acBonus', value: spell.acBonus } })
    if (spell.speedBonus)       out.push({ ...src, effect: { kind: 'speedBonus', value: spell.speedBonus } })
    if (spell.speedMultiplier)  out.push({ ...src, effect: { kind: 'speedMultiplier', value: spell.speedMultiplier } })
    if (spell.saveBonusDice)    out.push({ ...src, effect: { kind: 'saveBonusDice', ability: 'all', dice: spell.saveBonusDice } })

    if (spell.attackBuff) {
      const { toHit, toHitDice, bonusDmg, bonusDmgType } = spell.attackBuff
      if (toHit)     out.push({ ...src, effect: { kind: 'toHitBonus', value: toHit, appliesTo: scope } })
      if (toHitDice) out.push({ ...src, effect: { kind: 'toHitDice', dice: toHitDice, appliesTo: scope } })
      if (bonusDmg)  out.push({ ...src, effect: { kind: 'damageRider', dice: bonusDmg, damageType: bonusDmgType ?? '', appliesTo: scope } })
    }

    // One-shot on-hit riders (smites, Zephyr Strike): active until consumed.
    if (spell.turnResource?.kind === 'onHitRider' && spell.turnResource.formula && !char.buffStates?.[spellId]?.oneShotUsed) {
      out.push({
        ...src,
        effect: {
          kind: 'damageRider',
          dice: spell.turnResource.formula,
          damageType: spell.turnResource.damageType ?? '',
          appliesTo: 'weapon',
          oneShot: spell.turnResource.oneShot === true,
        },
      })
    }
  }
  return out
}

/** Active conditions → Effects (acDelta, speedMultiplier, save deltas, flags). */
export function collectConditionEffects(char: Pick<EffectSources, 'conditionIds'>): SourcedEffect[] {
  const out: SourcedEffect[] = []
  for (const entry of char.conditionIds ?? []) {
    const condition = CONDITION_BY_ID[entry.conditionId]
    if (!condition) continue
    const src = { sourceId: condition.id, sourceLabel: condition.name, sourceType: 'condition' as const }

    for (const effect of condition.effects) {
      const mechanic = effect.mechanic
      if (!mechanic || mechanic.kind === 'flag') {
        out.push({ ...src, effect: { kind: 'flag', note: effect.description } })
      } else if (mechanic.kind === 'acDelta') {
        out.push({ ...src, effect: { kind: 'acBonus', value: mechanic.value } })
      } else if (mechanic.kind === 'speedMultiplier') {
        out.push({ ...src, effect: { kind: 'speedMultiplier', value: mechanic.value } })
      } else if (mechanic.kind === 'flatSaveDelta') {
        out.push({ ...src, effect: { kind: 'saveBonus', ability: mechanic.ability, value: mechanic.value } })
      }
    }
  }
  return out
}

/** Equipped gear stats → Effects (bonuses, advantage grants, damage riders). */
export function collectEquipmentEffects(char: Pick<Character, 'equipment' | 'abilityScores'> & { weapons?: Character['weapons']; attunedItemIds?: Character['attunedItemIds']; feats?: Character['feats']; race?: Character['race'] }): SourcedEffect[] {
  const stats = computeEquipmentStats(char)
  const src = { sourceId: 'equipment', sourceLabel: 'Equipment', sourceType: 'gear' as const }
  const out: SourcedEffect[] = []

  if (stats.acBonus)    out.push({ ...src, effect: { kind: 'acBonus', value: stats.acBonus } })
  if (stats.toHitBonus) out.push({ ...src, effect: { kind: 'toHitBonus', value: stats.toHitBonus, appliesTo: 'all' } })
  if (stats.speedBonus) out.push({ ...src, effect: { kind: 'speedBonus', value: stats.speedBonus } })

  for (const [ability, value] of Object.entries(stats.abilityBonus) as [AbilityScore, number][]) {
    if (value) out.push({ ...src, effect: { kind: 'abilityBonus', ability, value } })
  }
  // abilitySet floors (Gauntlets of Ogre Power pattern) emit the delta over
  // the wearer's bonus-adjusted score, so effectiveMod folds them like any bonus.
  for (const [ability, setTo] of Object.entries(stats.abilitySet) as [AbilityScore, number][]) {
    const current = char.abilityScores[ability] + (stats.abilityBonus[ability] ?? 0)
    if (setTo > current) out.push({ ...src, effect: { kind: 'abilityBonus', ability, value: setTo - current } })
  }
  for (const [ability, value] of Object.entries(stats.savingThrowBonus) as [AbilityScore, number][]) {
    if (value) out.push({ ...src, effect: { kind: 'saveBonus', ability, value } })
  }
  for (const [skill, value] of Object.entries(stats.skillBonus) as [Skill, number][]) {
    if (value) out.push({ ...src, effect: { kind: 'skillBonus', skill, value } })
  }
  for (const ability of stats.advantage.savingThrows) {
    out.push({ ...src, effect: { kind: 'advantage', on: 'save', ability } })
  }
  for (const skill of stats.advantage.skills) {
    out.push({ ...src, effect: { kind: 'advantage', on: 'skill', skill } })
  }
  if (stats.advantage.deathSaves) out.push({ ...src, effect: { kind: 'advantage', on: 'deathSave' } })

  for (const rider of stats.bonusDamage) {
    out.push({
      sourceId: 'equipment',
      sourceLabel: rider.names.join(', '),
      sourceType: 'gear',
      effect: {
        kind: 'damageRider',
        dice: rider.dice.length ? rider.dice.join('+') : undefined,
        flat: rider.flat || undefined,
        damageType: rider.dmgType,
        appliesTo: rider.appliesTo,
      },
    })
  }
  return out
}
