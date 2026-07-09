import type { CatalogAdapter } from './CatalogShell'
import { FEATS, FEAT_BY_ID, type FeatDef } from '@/shared/data/featsData'
import { CONDITIONS, CONDITION_BY_ID } from '@/shared/data/conditionsData'
import type { Condition } from '@/entities/condition/types'
import { RACES, RACE_BY_ID, type RaceDef } from '@/shared/data/raceData'
import { ACTIONS, ACTION_BY_ID, type ActionDef } from '@/shared/data/actionsData'
import { SPELLS, SPELL_BY_ID, isBuffConditionSpell, type SpellEntry } from '@/shared/data/spellData'
import { featsCatalog, conditionsCatalog, racesCatalog, actionsCatalog, spellsCatalog } from '@/shared/data/contentCatalogs'
import { SUMMON_TEMPLATES, SUMMON_TEMPLATE_BY_ID } from '@/shared/data/summons/summonTemplates'
import { addSummonTemplate, updateSummonTemplate, deleteSummonTemplate } from '@/shared/data/summons/summonLoader'
import type { SummonTemplate } from '@/entities/summon/types'

export const featsAdapter: CatalogAdapter<FeatDef> = {
  list: () => FEATS.map(f => ({ id: f.id, name: f.name })),
  get: id => FEAT_BY_ID[id],
  blank: () => ({ id: 'new-feat', name: 'New Feat', description: '' }),
  save: e => featsCatalog.save(e),
  remove: id => featsCatalog.remove(id),
}

export const conditionsAdapter: CatalogAdapter<Condition> = {
  list: () => CONDITIONS.map(c => ({ id: c.id, name: c.name, tag: c.category })),
  get: id => CONDITION_BY_ID[id],
  blank: () => ({ id: 'new-condition', name: 'New Condition', description: '', category: 'debuff', effects: [] }),
  save: e => conditionsCatalog.save(e),
  remove: id => conditionsCatalog.remove(id),
}

export const racesAdapter: CatalogAdapter<RaceDef> = {
  list: () => RACES.map(r => ({ id: r.id, name: r.label })),
  get: id => RACE_BY_ID[id],
  blank: () => ({ id: 'NewRace', label: 'New Race', speed: 30, abilityBonus: {}, traits: [], size: 'medium' }),
  save: e => racesCatalog.save(e),
  remove: id => racesCatalog.remove(id),
}

export const actionsAdapter: CatalogAdapter<ActionDef> = {
  list: () => ACTIONS.map(a => ({ id: a.id, name: a.name, tag: a.classOnly ?? (a.generic ? 'generic' : a.type) })),
  get: id => ACTION_BY_ID[id],
  blank: () => ({ id: 'new-action', name: 'New Action', type: 'Action', short: '', full: '' }),
  save: e => actionsCatalog.save(e),
  remove: id => actionsCatalog.remove(id),
}

export const spellsAdapter: CatalogAdapter<SpellEntry> = {
  list: () => SPELLS.map(s => ({ id: s.id, name: s.name, tag: s.level === 0 ? 'cantrip' : `L${s.level}` })),
  get: id => SPELL_BY_ID[id],
  blank: () => ({
    id: 'new-spell', name: 'New Spell', level: 1, school: 'Evocation',
    castingTime: '1 action', range: '60ft', components: 'V, S',
    duration: 'Instantaneous', description: '',
  } as SpellEntry),
  save: e => spellsCatalog.save(e),
  remove: id => spellsCatalog.remove(id),
}

/** Same catalog as spells, listed through the buff lens. */
export const buffsAdapter: CatalogAdapter<SpellEntry> = {
  ...spellsAdapter,
  list: () => SPELLS.filter(isBuffConditionSpell).map(s => ({ id: s.id, name: s.name, tag: s.buffCategory ?? (s.level === 0 ? 'cantrip' : `L${s.level}`) })),
}

export const summonsAdapter: CatalogAdapter<SummonTemplate> = {
  list: () => SUMMON_TEMPLATES.map(s => ({ id: s.id, name: s.name, tag: s.type })),
  get: id => SUMMON_TEMPLATE_BY_ID[id],
  blank: () => ({
    id: 'new-summon', name: 'New Summon', type: 'creature',
    maxHp: 10, ac: 12, speed: '30 ft', initiativeMod: 0,
    attacks: [], actionEconomy: { actions: 1, bonusActions: 1, reactions: 1 },
  }),
  save: e => (SUMMON_TEMPLATE_BY_ID[e.id] ? updateSummonTemplate(e) : addSummonTemplate(e)),
  remove: id => deleteSummonTemplate(id),
}
