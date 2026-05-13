import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from './skills'
import type { ArmorProficiency } from './armorData'
import { ALL_SKILL_KEYS } from './skills'

export interface ClassDef {
  id: string
  hitDie: 6 | 8 | 10 | 12
  savingThrows: [AbilityScore, AbilityScore]
  armorProficiencies: ArmorProficiency[]
  weaponProficiencies: string[]
  skillOptions: Skill[]
  skillCount: number
  primaryAbility: AbilityScore
  spellcastingAbility?: AbilityScore
  isSpellcaster: boolean
  resources?: { name: string; scalingPer?: 'level' | 'chamod' | 'wismod' | 'conmod' }[]
}

export const CLASSES: ClassDef[] = [
  {
    id: 'Barbarian',
    hitDie: 12,
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    skillOptions: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    skillCount: 2,
    primaryAbility: 'str',
    isSpellcaster: false,
    resources: [{ name: 'Rage', scalingPer: 'level' }],
  },
  {
    id: 'Bard',
    hitDie: 8,
    savingThrows: ['dex', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    skillOptions: ALL_SKILL_KEYS,
    skillCount: 3,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    isSpellcaster: true,
    resources: [{ name: 'Bardic Inspiration', scalingPer: 'chamod' }],
  },
  {
    id: 'Cleric',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Simple weapons'],
    skillOptions: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    primaryAbility: 'wis',
    spellcastingAbility: 'wis',
    isSpellcaster: true,
    resources: [{ name: 'Channel Divinity', scalingPer: 'level' }],
  },
  {
    id: 'Druid',
    hitDie: 8,
    savingThrows: ['int', 'wis'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'],
    skillOptions: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    skillCount: 2,
    primaryAbility: 'wis',
    spellcastingAbility: 'wis',
    isSpellcaster: true,
    resources: [{ name: 'Wild Shape', scalingPer: 'level' }],
  },
  {
    id: 'Fighter',
    hitDie: 10,
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    skillOptions: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    skillCount: 2,
    primaryAbility: 'str',
    isSpellcaster: false,
    resources: [{ name: 'Second Wind', scalingPer: 'level' }, { name: 'Action Surge', scalingPer: 'level' }],
  },
  {
    id: 'Monk',
    hitDie: 8,
    savingThrows: ['str', 'dex'],
    armorProficiencies: [],
    weaponProficiencies: ['Simple weapons', 'Shortswords'],
    skillOptions: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    skillCount: 2,
    primaryAbility: 'dex',
    isSpellcaster: false,
    resources: [{ name: 'Ki', scalingPer: 'level' }],
  },
  {
    id: 'Paladin',
    hitDie: 10,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    skillOptions: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    primaryAbility: 'str',
    spellcastingAbility: 'cha',
    isSpellcaster: true,
    resources: [{ name: 'Lay on Hands', scalingPer: 'level' }, { name: 'Divine Sense', scalingPer: 'chamod' }],
  },
  {
    id: 'Ranger',
    hitDie: 10,
    savingThrows: ['str', 'dex'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    skillOptions: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    skillCount: 3,
    primaryAbility: 'dex',
    spellcastingAbility: 'wis',
    isSpellcaster: true,
  },
  {
    id: 'Rogue',
    hitDie: 8,
    savingThrows: ['dex', 'int'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    skillOptions: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
    skillCount: 4,
    primaryAbility: 'dex',
    isSpellcaster: false,
    resources: [{ name: 'Sneak Attack', scalingPer: 'level' }],
  },
  {
    id: 'Sorcerer',
    hitDie: 6,
    savingThrows: ['con', 'cha'],
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    skillOptions: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    skillCount: 2,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    isSpellcaster: true,
    resources: [{ name: 'Sorcery Points', scalingPer: 'level' }],
  },
  {
    id: 'Warlock',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Simple weapons'],
    skillOptions: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    skillCount: 2,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    isSpellcaster: true,
  },
  {
    id: 'Wizard',
    hitDie: 6,
    savingThrows: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    skillOptions: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    skillCount: 2,
    primaryAbility: 'int',
    spellcastingAbility: 'int',
    isSpellcaster: true,
  },
  {
    id: 'Artificer',
    hitDie: 8,
    savingThrows: ['con', 'int'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Simple weapons'],
    skillOptions: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand'],
    skillCount: 2,
    primaryAbility: 'int',
    spellcastingAbility: 'int',
    isSpellcaster: true,
    resources: [{ name: 'Infuse Item', scalingPer: 'level' }],
  },
]

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map(c => [c.id, c])) as Record<string, ClassDef>

export const CLASS_LABELS = CLASSES.map(c => c.id)

export const HIT_DIE_AVERAGE: Record<6 | 8 | 10 | 12, number> = { 6: 4, 8: 5, 10: 6, 12: 7 }
