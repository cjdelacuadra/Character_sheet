import type { Skill } from './skills'

export interface BackgroundDef {
  id: string
  label: string
  skills: [Skill, Skill]
  tools?: string[]
  feature: string
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'Acolyte',      label: 'Acolyte',      skills: ['insight', 'religion'],      feature: 'Shelter of the Faithful' },
  { id: 'Charlatan',    label: 'Charlatan',    skills: ['deception', 'sleightOfHand'], tools: ['Forgery kit', 'Disguise kit'], feature: 'False Identity' },
  { id: 'Criminal',     label: 'Criminal',     skills: ['deception', 'stealth'],     tools: ["Thieves' tools"], feature: 'Criminal Contact' },
  { id: 'Entertainer',  label: 'Entertainer',  skills: ['acrobatics', 'performance'], tools: ['Disguise kit'], feature: 'By Popular Demand' },
  { id: 'FolkHero',     label: 'Folk Hero',    skills: ['animalHandling', 'survival'], tools: ["Artisan's tools"], feature: 'Rustic Hospitality' },
  { id: 'GuildArtisan', label: 'Guild Artisan', skills: ['insight', 'persuasion'],   tools: ["Artisan's tools"], feature: "Guild Membership" },
  { id: 'Hermit',       label: 'Hermit',       skills: ['medicine', 'religion'],     tools: ['Herbalism kit'], feature: 'Discovery' },
  { id: 'Noble',        label: 'Noble',        skills: ['history', 'persuasion'],    tools: ['Gaming set'], feature: 'Position of Privilege' },
  { id: 'Outlander',    label: 'Outlander',    skills: ['athletics', 'survival'],    tools: ['Musical instrument'], feature: 'Wanderer' },
  { id: 'Sage',         label: 'Sage',         skills: ['arcana', 'history'],        feature: 'Researcher' },
  { id: 'Sailor',       label: 'Sailor',       skills: ['athletics', 'perception'],  tools: ["Navigator's tools", 'Water vehicles'], feature: "Ship's Passage" },
  { id: 'Soldier',      label: 'Soldier',      skills: ['athletics', 'intimidation'], tools: ['Gaming set', 'Land vehicles'], feature: 'Military Rank' },
  { id: 'Urchin',       label: 'Urchin',       skills: ['sleightOfHand', 'stealth'], tools: ['Disguise kit', "Thieves' tools"], feature: 'City Secrets' },
]

export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map(b => [b.id, b])) as Record<string, BackgroundDef>

export const BACKGROUND_LABELS = BACKGROUNDS.map(b => ({ id: b.id, label: b.label }))
