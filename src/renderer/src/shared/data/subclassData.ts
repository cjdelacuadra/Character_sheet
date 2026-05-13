export interface SubclassDef {
  id: string
  label: string
  classId: string
  unlocksAtLevel: number
}

export const SUBCLASSES: SubclassDef[] = [
  // ── Barbarian (level 3) ──────────────────────────────────────────
  { id: 'Berserker',          label: 'Path of the Berserker',          classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'TotemWarrior',       label: 'Path of the Totem Warrior',       classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'AncestralGuardian',  label: 'Path of the Ancestral Guardian',  classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'StormHerald',        label: 'Path of the Storm Herald',        classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'Zealot',             label: 'Path of the Zealot',              classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'Beast',              label: 'Path of the Beast',               classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'WildMagicBarbarian', label: 'Path of Wild Magic',              classId: 'Barbarian', unlocksAtLevel: 3 },
  { id: 'Battlerager',        label: 'Path of the Battlerager',         classId: 'Barbarian', unlocksAtLevel: 3 },

  // ── Bard (level 3) ──────────────────────────────────────────────
  { id: 'CollegeOfLore',       label: 'College of Lore',       classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfValor',      label: 'College of Valor',      classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfGlamour',    label: 'College of Glamour',    classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfSwords',     label: 'College of Swords',     classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfWhispers',   label: 'College of Whispers',   classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfCreation',   label: 'College of Creation',   classId: 'Bard', unlocksAtLevel: 3 },
  { id: 'CollegeOfEloquence',  label: 'College of Eloquence',  classId: 'Bard', unlocksAtLevel: 3 },

  // ── Cleric (level 1) ────────────────────────────────────────────
  { id: 'LifeDomain',      label: 'Life Domain',      classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'LightDomain',     label: 'Light Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'TrickeryDomain',  label: 'Trickery Domain',  classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'KnowledgeDomain', label: 'Knowledge Domain', classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'NatureDomain',    label: 'Nature Domain',    classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'TempestDomain',   label: 'Tempest Domain',   classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'WarDomain',       label: 'War Domain',       classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'DeathDomain',     label: 'Death Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'ArcanaDomain',    label: 'Arcana Domain',    classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'ForgeDomain',     label: 'Forge Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'GraveDomain',     label: 'Grave Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'OrderDomain',     label: 'Order Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'PeaceDomain',     label: 'Peace Domain',     classId: 'Cleric', unlocksAtLevel: 1 },
  { id: 'TwilightDomain',  label: 'Twilight Domain',  classId: 'Cleric', unlocksAtLevel: 1 },

  // ── Druid (level 2) ─────────────────────────────────────────────
  { id: 'CircleOfTheLand',     label: 'Circle of the Land',     classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfTheMoon',     label: 'Circle of the Moon',     classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfDreams',      label: 'Circle of Dreams',       classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfTheShepherd', label: 'Circle of the Shepherd', classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfSpores',      label: 'Circle of Spores',       classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfStars',       label: 'Circle of Stars',        classId: 'Druid', unlocksAtLevel: 2 },
  { id: 'CircleOfWildfire',    label: 'Circle of Wildfire',     classId: 'Druid', unlocksAtLevel: 2 },

  // ── Fighter (level 3) ───────────────────────────────────────────
  { id: 'Champion',      label: 'Champion',      classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'BattleMaster',  label: 'Battle Master', classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'EldritchKnight',label: 'Eldritch Knight',classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'ArcaneArcher',  label: 'Arcane Archer', classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'Cavalier',      label: 'Cavalier',       classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'Samurai',       label: 'Samurai',        classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'PsiWarrior',    label: 'Psi Warrior',    classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'RuneKnight',    label: 'Rune Knight',    classId: 'Fighter', unlocksAtLevel: 3 },
  { id: 'EchoKnight',    label: 'Echo Knight',    classId: 'Fighter', unlocksAtLevel: 3 },

  // ── Monk (level 3) ──────────────────────────────────────────────
  { id: 'OpenHand',      label: 'Way of the Open Hand',      classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'Shadow',        label: 'Way of Shadow',             classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'FourElements',  label: 'Way of the Four Elements',  classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'SunSoul',       label: 'Way of the Sun Soul',       classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'DrunkenMaster', label: 'Way of the Drunken Master', classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'Kensei',        label: 'Way of the Kensei',         classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'Mercy',         label: 'Way of Mercy',              classId: 'Monk', unlocksAtLevel: 3 },
  { id: 'AstralSelf',    label: 'Way of the Astral Self',    classId: 'Monk', unlocksAtLevel: 3 },

  // ── Paladin (level 3) ───────────────────────────────────────────
  { id: 'OathOfDevotion',   label: 'Oath of Devotion',   classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfTheAncients',label: 'Oath of the Ancients',classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfVengeance',  label: 'Oath of Vengeance',  classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfConquest',   label: 'Oath of Conquest',   classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfRedemption', label: 'Oath of Redemption', classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfGlory',      label: 'Oath of Glory',      classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'OathOfTheWatchers',label: 'Oath of the Watchers',classId: 'Paladin', unlocksAtLevel: 3 },
  { id: 'Oathbreaker',      label: 'Oathbreaker',        classId: 'Paladin', unlocksAtLevel: 3 },

  // ── Ranger (level 3) ────────────────────────────────────────────
  { id: 'Hunter',          label: 'Hunter',          classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'BeastMaster',     label: 'Beast Master',    classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'GloomStalker',    label: 'Gloom Stalker',   classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'HorizonWalker',   label: 'Horizon Walker',  classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'MonsterSlayer',   label: 'Monster Slayer',  classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'FeyWanderer',     label: 'Fey Wanderer',    classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'Swarmkeeper',     label: 'Swarmkeeper',     classId: 'Ranger', unlocksAtLevel: 3 },
  { id: 'Drakewarden',     label: 'Drakewarden',     classId: 'Ranger', unlocksAtLevel: 3 },

  // ── Rogue (level 3) ─────────────────────────────────────────────
  { id: 'Thief',          label: 'Thief',          classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Assassin',       label: 'Assassin',       classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'ArcaneTrickster',label: 'Arcane Trickster',classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Inquisitive',    label: 'Inquisitive',    classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Mastermind',     label: 'Mastermind',     classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Scout',          label: 'Scout',          classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Swashbuckler',   label: 'Swashbuckler',   classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Phantom',        label: 'Phantom',        classId: 'Rogue', unlocksAtLevel: 3 },
  { id: 'Soulknife',      label: 'Soulknife',      classId: 'Rogue', unlocksAtLevel: 3 },

  // ── Sorcerer (level 1) ──────────────────────────────────────────
  { id: 'DraconicBloodline', label: 'Draconic Bloodline', classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'WildMagicSorcerer', label: 'Wild Magic',         classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'DivineSoul',        label: 'Divine Soul',        classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'ShadowMagic',       label: 'Shadow Magic',       classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'StormSorcery',      label: 'Storm Sorcery',      classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'AberrantMind',      label: 'Aberrant Mind',      classId: 'Sorcerer', unlocksAtLevel: 1 },
  { id: 'ClockworkSoul',     label: 'Clockwork Soul',     classId: 'Sorcerer', unlocksAtLevel: 1 },

  // ── Warlock (level 1) ───────────────────────────────────────────
  { id: 'Archfey',    label: 'The Archfey',      classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Fiend',      label: 'The Fiend',        classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'GreatOldOne',label: 'The Great Old One',classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Celestial',  label: 'The Celestial',    classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Hexblade',   label: 'The Hexblade',     classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Fathomless', label: 'The Fathomless',   classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Genie',      label: 'The Genie',        classId: 'Warlock', unlocksAtLevel: 1 },
  { id: 'Undead',     label: 'The Undead',       classId: 'Warlock', unlocksAtLevel: 1 },

  // ── Wizard (level 2) ────────────────────────────────────────────
  { id: 'Abjuration',     label: 'School of Abjuration',     classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Conjuration',    label: 'School of Conjuration',    classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Divination',     label: 'School of Divination',     classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Enchantment',    label: 'School of Enchantment',    classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Evocation',      label: 'School of Evocation',      classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Illusion',       label: 'School of Illusion',       classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Necromancy',     label: 'School of Necromancy',     classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Transmutation',  label: 'School of Transmutation',  classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Bladesinging',   label: 'Bladesinging',             classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'OrderOfScribes', label: 'Order of Scribes',         classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Chronurgy',      label: 'Chronurgy Magic',          classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'Graviturgy',     label: 'Graviturgy Magic',         classId: 'Wizard', unlocksAtLevel: 2 },
  { id: 'WarMagic',       label: 'War Magic',                classId: 'Wizard', unlocksAtLevel: 2 },

  // ── Artificer (level 3) ─────────────────────────────────────────
  { id: 'Alchemist',   label: 'Alchemist',   classId: 'Artificer', unlocksAtLevel: 3 },
  { id: 'Armorer',     label: 'Armorer',     classId: 'Artificer', unlocksAtLevel: 3 },
  { id: 'Artillerist', label: 'Artillerist', classId: 'Artificer', unlocksAtLevel: 3 },
  { id: 'BattleSmith', label: 'Battle Smith',classId: 'Artificer', unlocksAtLevel: 3 },
]

export const SUBCLASS_BY_ID = Object.fromEntries(SUBCLASSES.map(s => [s.id, s])) as Record<string, SubclassDef>

export const SUBCLASSES_BY_CLASS = SUBCLASSES.reduce<Record<string, SubclassDef[]>>((acc, s) => {
  if (!acc[s.classId]) acc[s.classId] = []
  acc[s.classId].push(s)
  return acc
}, {})
