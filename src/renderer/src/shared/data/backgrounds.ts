import type { Skill } from './skills'

export interface BackgroundDef {
  id: string
  label: string
  skills: [Skill, Skill]
  tools?: string[]
  feature: string
  feat?: string
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'Acolyte',      label: 'Acolyte',      skills: ['insight', 'religion'],        feature: 'Shelter of the Faithful',  feat: 'Magic Initiate' },
  { id: 'Charlatan',    label: 'Charlatan',    skills: ['deception', 'sleightOfHand'], tools: ['Forgery kit', 'Disguise kit'], feature: 'False Identity', feat: 'Actor' },
  { id: 'Criminal',     label: 'Criminal',     skills: ['deception', 'stealth'],       tools: ["Thieves' tools"], feature: 'Criminal Contact', feat: 'Alert' },
  { id: 'Entertainer',  label: 'Entertainer',  skills: ['acrobatics', 'performance'],  tools: ['Disguise kit'], feature: 'By Popular Demand', feat: 'Inspiring Leader' },
  { id: 'FolkHero',     label: 'Folk Hero',    skills: ['animalHandling', 'survival'], tools: ["Artisan's tools"], feature: 'Rustic Hospitality', feat: 'Tough' },
  { id: 'GuildArtisan', label: 'Guild Artisan', skills: ['insight', 'persuasion'],     tools: ["Artisan's tools"], feature: "Guild Membership", feat: 'Skilled' },
  { id: 'Hermit',       label: 'Hermit',       skills: ['medicine', 'religion'],       tools: ['Herbalism kit'], feature: 'Discovery', feat: 'Magic Initiate' },
  { id: 'Noble',        label: 'Noble',        skills: ['history', 'persuasion'],      tools: ['Gaming set'], feature: 'Position of Privilege', feat: 'Skilled' },
  { id: 'Outlander',    label: 'Outlander',    skills: ['athletics', 'survival'],      tools: ['Musical instrument'], feature: 'Wanderer', feat: 'Tough' },
  { id: 'Sage',         label: 'Sage',         skills: ['arcana', 'history'],          feature: 'Researcher', feat: 'Keen Mind' },
  { id: 'Sailor',       label: 'Sailor',       skills: ['athletics', 'perception'],    tools: ["Navigator's tools", 'Water vehicles'], feature: "Ship's Passage", feat: 'Alert' },
  { id: 'Soldier',      label: 'Soldier',      skills: ['athletics', 'intimidation'],  tools: ['Gaming set', 'Land vehicles'], feature: 'Military Rank', feat: 'Weapon Master' },
  { id: 'Urchin',       label: 'Urchin',       skills: ['sleightOfHand', 'stealth'],   tools: ['Disguise kit', "Thieves' tools"], feature: 'City Secrets', feat: 'Alert' },
]

export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map(b => [b.id, b])) as Record<string, BackgroundDef>

export const BACKGROUND_LABELS = BACKGROUNDS.map(b => ({ id: b.id, label: b.label }))
