import { createCatalogLoader } from './contentLoader'
import { FEATS, setFeatsData, type FeatDef } from './featsData'
import { CONDITIONS, setConditionsData } from './conditionsData'
import type { Condition } from '@/entities/condition/types'
import { RACES, setRacesData, type RaceDef } from './raceData'
import { ACTIONS, setActionsData, type ActionDef } from './actionsData'
import { SPELLS, setSpellsData, type SpellEntry } from './spellData'
import { WILD_SHAPE_BEASTS, setWildShapeBeastsData, type WildShapeBeast } from './wildShapeBeasts'

// Built-in snapshots, captured at module init BEFORE any loader mutates the
// live arrays — these are what first-run seeding and new-built-in merging use.
const DEFAULT_FEATS: FeatDef[] = [...FEATS]
const DEFAULT_CONDITIONS: Condition[] = [...CONDITIONS]
const DEFAULT_RACES: RaceDef[] = [...RACES]
const DEFAULT_ACTIONS: ActionDef[] = [...ACTIONS]
const DEFAULT_SPELLS: SpellEntry[] = [...SPELLS]
const DEFAULT_BEASTS: WildShapeBeast[] = [...WILD_SHAPE_BEASTS]

export const featsCatalog      = createCatalogLoader('feats.json',      () => DEFAULT_FEATS,      setFeatsData,      () => FEATS)
export const conditionsCatalog = createCatalogLoader('conditions.json', () => DEFAULT_CONDITIONS, setConditionsData, () => CONDITIONS)
export const racesCatalog      = createCatalogLoader('races.json',      () => DEFAULT_RACES,      setRacesData,      () => RACES)
export const actionsCatalog    = createCatalogLoader('actions.json',    () => DEFAULT_ACTIONS,    setActionsData,    () => ACTIONS)
export const spellsCatalog     = createCatalogLoader('spells.json',     () => DEFAULT_SPELLS,     setSpellsData,     () => SPELLS)
export const beastsCatalog     = createCatalogLoader('wildShapeBeasts.json', () => DEFAULT_BEASTS, setWildShapeBeastsData, () => WILD_SHAPE_BEASTS)

/** Load every externalized catalog (equipment CSVs and summons have their own loaders). */
export async function loadContentCatalogs(): Promise<void> {
  await Promise.all([
    featsCatalog.load(),
    conditionsCatalog.load(),
    racesCatalog.load(),
    actionsCatalog.load(),
    spellsCatalog.load(),
    beastsCatalog.load(),
  ])
}
