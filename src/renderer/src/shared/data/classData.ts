import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from './skills'
import type { ArmorProficiency } from './equipment/gear'
import { ALL_SKILL_KEYS } from './skills'

export type ResourceRecovery = 'short' | 'long' | 'none'

export interface ResourceDef {
  name: string
  recoverOn: ResourceRecovery
  /** 'intmod' = max(1, INT mod); 'chamod'/'wismod'/'conmod' = max(1, mod+1) per existing pattern */
  scalingPer?: 'level' | 'chamod' | 'wismod' | 'conmod' | 'intmod' | 'fixed'
  fixedTotal?: number
  scalingTable?: Partial<Record<number, number>>
  /** Resource is not created below this character level. */
  minLevel?: number
}

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
  spellsKnownTable?: Partial<Record<number, number>>
  cantripsKnownTable?: Partial<Record<number, number>>
  prepareSpells?: boolean
  resources?: ResourceDef[]
  asiLevels: number[]
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
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{
      name: 'Rage', recoverOn: 'long',
      scalingTable: { 1:2, 2:2, 3:3, 4:3, 5:3, 6:4, 7:4, 8:4, 9:4, 10:4, 11:4, 12:5, 13:5, 14:5, 15:5, 16:5, 17:6, 18:6, 19:6, 20:99 },
    }],
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
    cantripsKnownTable: { 1:2, 4:3, 10:4 },
    spellsKnownTable: { 1:4, 2:5, 3:6, 4:7, 5:8, 6:9, 7:10, 8:11, 9:12, 10:14, 11:15, 13:16, 14:18, 15:19, 17:20, 18:22 },
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{ name: 'Bardic Inspiration', recoverOn: 'long', scalingPer: 'chamod' }],
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
    cantripsKnownTable: { 1:3, 4:4, 10:5 },
    prepareSpells: true,
    asiLevels: [4, 8, 12, 16, 19],
    resources: [
      { name: 'Channel Divinity', recoverOn: 'short', scalingTable: { 1:1, 2:1, 3:1, 4:1, 5:1, 6:2, 18:3 } },
      { name: 'Divine Intervention', recoverOn: 'long', minLevel: 10, fixedTotal: 1 },
      { name: 'Eyes of Night', recoverOn: 'long', minLevel: 1, scalingPer: 'wismod' },
    ],
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
    cantripsKnownTable: { 1:2, 4:3, 10:4 },
    prepareSpells: true,
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{ name: 'Wild Shape', recoverOn: 'short', fixedTotal: 2 }],
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
    asiLevels: [4, 6, 8, 12, 14, 16, 19],
    resources: [
      { name: 'Second Wind', recoverOn: 'short', fixedTotal: 1 },
      { name: 'Action Surge', recoverOn: 'short', scalingTable: { 1:0, 2:1, 17:2 } },
      { name: 'Indomitable', recoverOn: 'long', minLevel: 9, scalingTable: { 9:1, 13:2, 17:3 } },
    ],
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
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{ name: 'Ki', recoverOn: 'short', scalingPer: 'level' }],
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
    prepareSpells: true,
    asiLevels: [4, 8, 12, 16, 19],
    resources: [
      { name: 'Lay on Hands', recoverOn: 'long', scalingPer: 'level', scalingTable: { 1:5, 2:10, 3:15, 4:20, 5:25, 6:30, 7:35, 8:40, 9:45, 10:50, 11:55, 12:60, 13:65, 14:70, 15:75, 16:80, 17:85, 18:90, 19:95, 20:100 } },
      { name: 'Divine Sense', recoverOn: 'long', scalingPer: 'chamod' },
      { name: 'Channel Divinity', recoverOn: 'short', fixedTotal: 1, minLevel: 3 },
    ],
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
    asiLevels: [4, 8, 12, 16, 19],
    spellsKnownTable: { 2:2, 3:3, 5:4, 7:5, 9:6, 11:7, 13:8, 15:9, 17:10, 19:11, 20:11 },
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
    asiLevels: [4, 8, 10, 12, 16, 19],
    resources: [{ name: 'Sneak Attack', recoverOn: 'none', scalingTable: { 1:1, 2:1, 3:2, 4:2, 5:3, 6:3, 7:4, 8:4, 9:5, 10:5, 11:6, 12:6, 13:7, 14:7, 15:8, 16:8, 17:9, 18:9, 19:10, 20:10 } }],
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
    cantripsKnownTable: { 1:4, 10:5, 14:6 },
    spellsKnownTable: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11, 11:12, 13:13, 15:14, 17:15 },
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{ name: 'Sorcery Points', recoverOn: 'long', scalingPer: 'level', scalingTable: { 1:0, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12, 13:13, 14:14, 15:15, 16:16, 17:17, 18:18, 19:19, 20:20 } }],
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
    cantripsKnownTable: { 1:2, 4:3, 10:4 },
    spellsKnownTable: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 11:11, 13:12, 15:13, 17:14, 19:15 },
    asiLevels: [4, 8, 12, 16, 19],
    resources: [
      { name: 'Mystic Arcanum 6', recoverOn: 'long', minLevel: 11, fixedTotal: 1 },
      { name: 'Mystic Arcanum 7', recoverOn: 'long', minLevel: 13, fixedTotal: 1 },
      { name: 'Mystic Arcanum 8', recoverOn: 'long', minLevel: 15, fixedTotal: 1 },
      { name: 'Mystic Arcanum 9', recoverOn: 'long', minLevel: 17, fixedTotal: 1 },
    ],
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
    cantripsKnownTable: { 1:3, 4:4, 10:5 },
    // Wizards add 2 spells to their spellbook each level; starting spellbook = 6 at level 1
    spellsKnownTable: {
      1:6, 2:8, 3:10, 4:12, 5:14, 6:16, 7:18, 8:20, 9:22, 10:24,
      11:26, 12:28, 13:30, 14:32, 15:34, 16:36, 17:38, 18:40, 19:42, 20:44,
    },
    asiLevels: [4, 8, 12, 16, 19],
    resources: [{ name: 'Arcane Recovery', recoverOn: 'none', fixedTotal: 1 }],
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
    prepareSpells: true,
    asiLevels: [4, 8, 12, 16, 19],
    resources: [
      { name: 'Infuse Item', recoverOn: 'long', scalingTable: { 2:2, 6:3, 10:4, 14:5, 18:6 } },
      { name: 'Flash of Genius', recoverOn: 'long', minLevel: 7, scalingPer: 'intmod' },
    ],
  },

  // ---------------------------------------------------------------------------
  // Final Fantasy XIV (FFXIV) classes — Chapter 2. Template vertical: Warrior
  // (martial non-caster, structurally a Barbarian analog).
  // ---------------------------------------------------------------------------
  {
    id: 'Warrior',
    hitDie: 12,
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    skillOptions: ['animalHandling', 'athletics', 'intimidation', 'insight', 'survival'],
    skillCount: 2,
    primaryAbility: 'str',
    isSpellcaster: false,
    asiLevels: [4, 8, 12, 16, 19],
    // Berserk: uses per long rest, scaling 2→6 by the Warrior class table.
    resources: [{
      name: 'Berserk', recoverOn: 'long',
      scalingTable: { 1:2, 2:2, 3:3, 4:3, 5:3, 6:4, 7:4, 8:4, 9:4, 10:4, 11:4, 12:5, 13:5, 14:5, 15:5, 16:5, 17:6, 18:6, 19:6, 20:6 },
    }],
  },
  {
    id: 'Scholar',
    hitDie: 6,
    savingThrows: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    skillOptions: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    skillCount: 2,
    primaryAbility: 'int',
    spellcastingAbility: 'int',
    isSpellcaster: true,
    prepareSpells: true,
    cantripsKnownTable: { 1:3, 4:4, 10:5 },
    // Spellbook caster like the Wizard: start with 6 spells at 1st level, add 2 each level.
    // Combined with prepareSpells, this is the "learn into spellbook, prepare a subset" model.
    spellsKnownTable: {
      1:6, 2:8, 3:10, 4:12, 5:14, 6:16, 7:18, 8:20, 9:22, 10:24,
      11:26, 12:28, 13:30, 14:32, 15:34, 16:36, 17:38, 18:40, 19:42, 20:44,
    },
    asiLevels: [4, 8, 12, 16, 19],
    // Tactics: uses equal to proficiency bonus, recover on short/long rest.
    resources: [{
      name: 'Tactics', recoverOn: 'short',
      scalingTable: { 1:2, 2:2, 3:2, 4:2, 5:3, 6:3, 7:3, 8:3, 9:4, 10:4, 11:4, 12:4, 13:5, 14:5, 15:5, 16:5, 17:6, 18:6, 19:6, 20:6 },
    }],
  },
]

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map(c => [c.id, c])) as Record<string, ClassDef>

export const CLASS_LABELS = CLASSES.map(c => c.id)

export const HIT_DIE_AVERAGE: Record<6 | 8 | 10 | 12, number> = { 6: 4, 8: 5, 10: 6, 12: 7 }
