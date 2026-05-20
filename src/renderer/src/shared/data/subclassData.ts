import type { ArmorProficiency } from './equipment/accessories'
import type { AbilityScore } from '@/entities/character/types'

export interface SubclassDef {
  id: string
  label: string
  classId: string
  unlocksAtLevel: number
  description?: string
  /** Domain-specific Channel Divinity ability (Cleric only) */
  channelDivinityDesc?: string
  /** Additional armor proficiencies granted by this subclass */
  extraArmorProficiencies?: ArmorProficiency[]
  /** Override unarmored AC formula: receives dex/con/wis mods, returns AC base (before shield) */
  unarmoredAC?: (dex: number, con: number, wis: number) => number
  /** Spellcasting ability for subclasses that add magic to non-casting classes */
  spellcastingAbility?: AbilityScore
  /** Spells-known progression table (keyed by class level) for subclass spellcasters */
  spellsKnownTable?: Partial<Record<number, number>>
  /** Which class spell list to offer in the spell picker (e.g. 'Wizard' for EK/AT) */
  spellListClassId?: string
  /** Cantrips-known progression table (keyed by class level) for subclass spellcasters */
  cantripsKnownTable?: Partial<Record<number, number>>
}

export const SUBCLASSES: SubclassDef[] = [
  // ── Barbarian (level 3) ──────────────────────────────────────────
  { id: 'Berserker',          label: 'Path of the Berserker',          classId: 'Barbarian', unlocksAtLevel: 3, description: 'Channel rage into frenzied melee attacks. Make an additional attack as a bonus action while raging.' },
  { id: 'TotemWarrior',       label: 'Path of the Totem Warrior',       classId: 'Barbarian', unlocksAtLevel: 3, description: 'Seek a spiritual connection with an animal totem — Bear, Eagle, Elk, Tiger, or Wolf — gaining its blessings.' },
  { id: 'AncestralGuardian',  label: 'Path of the Ancestral Guardian',  classId: 'Barbarian', unlocksAtLevel: 3, description: 'Call upon the spirits of your ancestors to protect your allies and hinder your enemies.' },
  { id: 'StormHerald',        label: 'Path of the Storm Herald',        classId: 'Barbarian', unlocksAtLevel: 3, description: 'Tap into a primordial force of nature — Desert, Sea, or Tundra — and emanate elemental power while raging.' },
  { id: 'Zealot',             label: 'Path of the Zealot',              classId: 'Barbarian', unlocksAtLevel: 3, description: 'Channel divine fury. Damage you deal while raging ignores death, and fallen allies are easier to resurrect.' },
  { id: 'Beast',              label: 'Path of the Beast',               classId: 'Barbarian', unlocksAtLevel: 3, description: 'Unleash a bestial alter ego while raging — claws, a bite, or a tail appear as natural weapons.' },
  { id: 'WildMagicBarbarian', label: 'Path of Wild Magic',              classId: 'Barbarian', unlocksAtLevel: 3, description: 'Wild magic surges through you as you rage, producing random arcane effects that grow stronger with time.' },
  { id: 'Battlerager',        label: 'Path of the Battlerager',         classId: 'Barbarian', unlocksAtLevel: 3, description: 'Wear spiked armor as a weapon. While raging, grapple and deal bonus piercing damage as a bonus action.' },

  // ── Bard (level 3) ──────────────────────────────────────────────
  { id: 'CollegeOfLore',       label: 'College of Lore',       classId: 'Bard', unlocksAtLevel: 3, description: 'Collect knowledge from every source. Gain 3 bonus proficiencies and the ability to cut enemies down with Cutting Words.' },
  { id: 'CollegeOfValor',      label: 'College of Valor',      classId: 'Bard', unlocksAtLevel: 3, description: 'Inspire warriors in battle. Gain armor/weapon proficiencies and let allies add Bardic Inspiration to attack rolls.' },
  { id: 'CollegeOfGlamour',    label: 'College of Glamour',    classId: 'Bard', unlocksAtLevel: 3, description: 'Draw on fey magic to charm and captivate. Inspire allies to move without triggering opportunity attacks.' },
  { id: 'CollegeOfSwords',     label: 'College of Swords',     classId: 'Bard', unlocksAtLevel: 3, description: 'Weave weapon attacks and spell casting into one. Use Bardic Inspiration to fuel flourishes with blades.' },
  { id: 'CollegeOfWhispers',   label: 'College of Whispers',   classId: 'Bard', unlocksAtLevel: 3, description: 'Use the power of words and secrets to psychically wound enemies and steal the identity of those you kill.' },
  { id: 'CollegeOfCreation',   label: 'College of Creation',   classId: 'Bard', unlocksAtLevel: 3, description: 'Tap into the Song of Creation to animate objects and create items from thin air.' },
  { id: 'CollegeOfEloquence',  label: 'College of Eloquence',  classId: 'Bard', unlocksAtLevel: 3, description: 'Master the art of oratory. Your words never fail — Bardic Inspiration dice never roll below a minimum value.' },

  // ── Cleric (level 1) ────────────────────────────────────────────
  {
    id: 'LifeDomain', label: 'Life Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'Devoted to the forces that sustain life. Heavy armor proficiency and powerful healing spells.',
    channelDivinityDesc: 'Preserve Life: Choose any creatures within 30 ft. Restore HP equal to 5× your cleric level, divided as you choose. Cannot bring any creature above half its max HP.',
  },
  {
    id: 'LightDomain', label: 'Light Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Wield the power of light and truth to banish darkness and illuminate the path.',
    channelDivinityDesc: 'Radiance of the Dawn: Dispel magical darkness within 30 ft. Each hostile creature must make a CON save (DC 8 + Prof + WIS) or take 2d10 + cleric level radiant damage (half on success).',
  },
  {
    id: 'TrickeryDomain', label: 'Trickery Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Embrace deception and mischief. Your deity blesses lies, thieves, and rogues.',
    channelDivinityDesc: 'Invoke Duplicity: Create an illusory duplicate of yourself within 30 ft. The duplicate lasts 1 minute (concentration). While active, allies have advantage when attacking a creature if you or the duplicate are within 5 ft of it.',
  },
  {
    id: 'KnowledgeDomain', label: 'Knowledge Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Seek and preserve knowledge. Gain proficiency in two skills and two languages of your choice.',
    channelDivinityDesc: 'Knowledge of the Ages: Gain proficiency in one skill or one tool of your choice for 10 minutes.',
  },
  {
    id: 'NatureDomain', label: 'Nature Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Protect and harness the wild world. Heavy armor proficiency and druid cantrip.',
    channelDivinityDesc: 'Charm Animals and Plants: Each beast and plant creature within 30 ft must make a WIS save (DC 8 + Prof + WIS) or be charmed by you for 1 minute.',
  },
  {
    id: 'TempestDomain', label: 'Tempest Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'Call upon the fury of storms. Heavy armor + martial weapon proficiency and devastating lightning powers.',
    channelDivinityDesc: 'Destructive Wrath: Instead of rolling for lightning or thunder damage, deal the maximum possible amount.',
  },
  {
    id: 'WarDomain', label: 'War Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'A god of war grants you power in battle. Heavy armor + martial weapon proficiency and the War Priest feature.',
    channelDivinityDesc: 'Guided Strike: Add +10 to one attack roll you make.',
  },
  {
    id: 'DeathDomain', label: 'Death Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'Draw on the power of death itself. Heavy armor, martial weapons, and deadly necrotic touch.',
    channelDivinityDesc: 'Touch of Death: When you hit a creature with a melee attack, deal extra necrotic damage equal to 5 + twice your cleric level.',
  },
  {
    id: 'ArcanaDomain', label: 'Arcana Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Bridge divine and arcane magic. Arcane Initiate grants two Wizard cantrips.',
    channelDivinityDesc: 'Arcane Abjuration: One celestial, elemental, fey, or fiend within 30 ft must make a WIS save (DC 8 + Prof + WIS) or be turned for 1 minute (as Turn Undead but for these creature types).',
  },
  { id: 'ForgeDomain',   label: 'Forge Domain',   classId: 'Cleric', unlocksAtLevel: 1, extraArmorProficiencies: ['heavy'], description: 'Shape metal and stone by the will of your deity. Bless weapons and armor with magical properties.' },
  { id: 'GraveDomain',   label: 'Grave Domain',   classId: 'Cleric', unlocksAtLevel: 1, description: 'Stand on the boundary of life and death, marking the line between the two.' },
  { id: 'OrderDomain',   label: 'Order Domain',   classId: 'Cleric', unlocksAtLevel: 1, extraArmorProficiencies: ['heavy'], description: 'Impose order and discipline. Command allies to make extra attacks or force enemies to bow.' },
  { id: 'PeaceDomain',   label: 'Peace Domain',   classId: 'Cleric', unlocksAtLevel: 1, description: 'Cultivate harmony and protect companions. Bond allies together so they share the pain of injury.' },
  { id: 'TwilightDomain',label: 'Twilight Domain', classId: 'Cleric', unlocksAtLevel: 1, extraArmorProficiencies: ['heavy'], description: 'Guard against the terrors of night. Twilight Sanctuary protects allies in a sphere of dim light.' },

  // ── Druid (level 2) ─────────────────────────────────────────────
  { id: 'CircleOfTheLand',     label: 'Circle of the Land',     classId: 'Druid', unlocksAtLevel: 2, description: 'Draw power from a chosen natural environment — arctic, coast, desert, forest, grassland, mountain, swamp, or underdark.' },
  { id: 'CircleOfTheMoon',     label: 'Circle of the Moon',     classId: 'Druid', unlocksAtLevel: 2, description: 'Wild Shape into more powerful beasts with much higher CR limits. Combat Wild Shape as a bonus action.' },
  { id: 'CircleOfDreams',      label: 'Circle of Dreams',       classId: 'Druid', unlocksAtLevel: 2, description: 'Connected to the Feywild and the power of dream. Heal allies as a bonus action using Balm of the Summer Court.' },
  { id: 'CircleOfTheShepherd', label: 'Circle of the Shepherd', classId: 'Druid', unlocksAtLevel: 2, description: 'Speak the language of beasts and summon Spirit Totems to empower summoned creatures.' },
  { id: 'CircleOfSpores',      label: 'Circle of Spores',       classId: 'Druid', unlocksAtLevel: 2, description: 'Harness the power of decomposition and growth. Animate dead with fungal spores and deal necrotic damage.' },
  { id: 'CircleOfStars',       label: 'Circle of Stars',        classId: 'Druid', unlocksAtLevel: 2, description: 'Draw power from constellations. Star Map grants bonus spells and three star forms for Wild Shape.' },
  { id: 'CircleOfWildfire',    label: 'Circle of Wildfire',     classId: 'Druid', unlocksAtLevel: 2, description: 'Summon a Wildfire Spirit that aids in healing and destruction. Embrace the cycle of destruction and regrowth.' },

  // ── Fighter (level 3) ───────────────────────────────────────────
  { id: 'Champion',       label: 'Champion',       classId: 'Fighter', unlocksAtLevel: 3, description: 'Master of martial perfection. Critical hits on 19–20, and later 18–20. Exceptional Athletics at higher levels.' },
  { id: 'BattleMaster',   label: 'Battle Master',  classId: 'Fighter', unlocksAtLevel: 3, description: 'Learn combat maneuvers that use Superiority Dice. Control the battlefield with trips, disarms, and feints.' },
  { id: 'EldritchKnight', label: 'Eldritch Knight', classId: 'Fighter', unlocksAtLevel: 3, spellcastingAbility: 'int', spellListClassId: 'Wizard', spellsKnownTable: { 3:3, 4:4, 7:5, 8:6, 10:7, 11:8, 13:9, 14:10, 16:11, 19:12, 20:13 }, cantripsKnownTable: { 3:2, 10:3 }, description: 'Blend martial prowess with arcane magic. Cast wizard spells and bind a weapon to your soul.' },
  { id: 'ArcaneArcher',   label: 'Arcane Archer',  classId: 'Fighter', unlocksAtLevel: 3, spellcastingAbility: 'int', description: 'Infuse arrows with magic effects — banishing, curving shots, grasping vines, and more.' },
  { id: 'Cavalier',       label: 'Cavalier',        classId: 'Fighter', unlocksAtLevel: 3, description: 'Excel at mounted combat. Protect your mount, make opportunity attacks without a reaction, and mark enemies.' },
  { id: 'Samurai',        label: 'Samurai',         classId: 'Fighter', unlocksAtLevel: 3, description: 'Draw on an indomitable fighting spirit. Fighting Spirit grants advantage and temp HP, persisting through Relentless.' },
  { id: 'PsiWarrior',     label: 'Psi Warrior',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Augment attacks and defenses with psionic energy. Telekinetically move creatures and protect allies.' },
  { id: 'RuneKnight',     label: 'Rune Knight',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Carve magical runes onto your equipment, granting powerful benefits and the ability to grow Giant-sized.' },
  { id: 'EchoKnight',     label: 'Echo Knight',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Manifest an echo of yourself from an unknown past. Swap positions with your echo or attack through it.' },

  // ── Monk (level 3) ──────────────────────────────────────────────
  { id: 'OpenHand',      label: 'Way of the Open Hand',      classId: 'Monk', unlocksAtLevel: 3, description: 'Master unarmed combat. After a Flurry of Blows, knock prone, push, or deny reactions.' },
  { id: 'Shadow',        label: 'Way of Shadow',             classId: 'Monk', unlocksAtLevel: 3, description: 'Embrace the shadows. Cast shadow magic, teleport between dim areas, and silence a zone around you.' },
  { id: 'FourElements',  label: 'Way of the Four Elements',  classId: 'Monk', unlocksAtLevel: 3, description: 'Harness elemental disciplines — fire, water, earth, or air — spending Ki to cast elemental spells.' },
  { id: 'SunSoul',       label: 'Way of the Sun Soul',       classId: 'Monk', unlocksAtLevel: 3, description: 'Channel inner light into searing bolts. Radiant Sun Bolt and Searing Arc Strike allow ranged Ki attacks.' },
  { id: 'DrunkenMaster', label: 'Way of the Drunken Master', classId: 'Monk', unlocksAtLevel: 3, description: 'Fight with the unpredictable style of a drunkard. Redirect attacks and move freely through enemies.' },
  { id: 'Kensei',        label: 'Way of the Kensei',         classId: 'Monk', unlocksAtLevel: 3, description: 'Treat chosen weapons as monk weapons. Use Ki to boost accuracy and add d4 damage or deflect ranged attacks.' },
  { id: 'Mercy',         label: 'Way of Mercy',              classId: 'Monk', unlocksAtLevel: 3, description: 'Heal with touch or deal necrotic damage with the same hands. Implements of Mercy allow removing conditions.' },
  { id: 'AstralSelf',    label: 'Way of the Astral Self',    classId: 'Monk', unlocksAtLevel: 3, description: 'Manifest your astral form to gain extra arms, a visage of terror, and a body of spirit.' },

  // ── Paladin (level 3) ───────────────────────────────────────────
  { id: 'OathOfDevotion',    label: 'Oath of Devotion',    classId: 'Paladin', unlocksAtLevel: 3, description: 'Uphold justice and virtue. Sacred Weapon and Turn the Unholy on your Sacred Oath.' },
  { id: 'OathOfTheAncients', label: 'Oath of the Ancients', classId: 'Paladin', unlocksAtLevel: 3, description: 'Defend the light and life of the natural world. Nature\'s Wrath and Turn the Faithless.' },
  { id: 'OathOfVengeance',   label: 'Oath of Vengeance',   classId: 'Paladin', unlocksAtLevel: 3, description: 'Pursue evil relentlessly. Vow of Enmity grants advantage; Abjure Enemy incapacitates a target.' },
  { id: 'OathOfConquest',    label: 'Oath of Conquest',    classId: 'Paladin', unlocksAtLevel: 3, description: 'Strike fear into enemies and hold ground at all costs. Conquering Presence frightens multiple foes.' },
  { id: 'OathOfRedemption',  label: 'Oath of Redemption',  classId: 'Paladin', unlocksAtLevel: 3, description: 'Seek redemption for the lost. Emissary of Peace and Rebuke the Violent use words before violence.' },
  { id: 'OathOfGlory',       label: 'Oath of Glory',       classId: 'Paladin', unlocksAtLevel: 3, description: 'Inspire others to great deeds. Peerless Athlete and Inspiring Smite enhance yourself and your allies.' },
  { id: 'OathOfTheWatchers', label: 'Oath of the Watchers', classId: 'Paladin', unlocksAtLevel: 3, description: 'Guard mortals from extraplanar threats. Abjure the Extraplanar turns aberrations, celestials, elementals, fey, and fiends.' },
  { id: 'Oathbreaker',       label: 'Oathbreaker',         classId: 'Paladin', unlocksAtLevel: 3, description: 'Fell to darkness and broke your sacred oath. Command the undead and use dark spells of corruption.' },

  // ── Ranger (level 3) ────────────────────────────────────────────
  { id: 'Hunter',        label: 'Hunter',        classId: 'Ranger', unlocksAtLevel: 3, description: 'Specialize in hunting specific prey. Choose Hunter\'s Prey (Colossus Slayer, Giant Killer, Horde Breaker) at level 3.' },
  { id: 'BeastMaster',   label: 'Beast Master',  classId: 'Ranger', unlocksAtLevel: 3, description: 'Bond with a beast companion that fights alongside you, following your commands in combat.' },
  { id: 'GloomStalker',  label: 'Gloom Stalker', classId: 'Ranger', unlocksAtLevel: 3, description: 'Ambush predator of the dark. Invisible to darkvision, extra attack on first round, bonus initiative.' },
  { id: 'HorizonWalker', label: 'Horizon Walker', classId: 'Ranger', unlocksAtLevel: 3, description: 'Guard the borders between planes. Deal radiant damage and teleport as a bonus action.' },
  { id: 'MonsterSlayer', label: 'Monster Slayer', classId: 'Ranger', unlocksAtLevel: 3, description: 'Specialist at hunting powerful monsters. Hunter\'s Sense reveals vulnerabilities; counter spells and condition effects.' },
  { id: 'FeyWanderer',   label: 'Fey Wanderer',  classId: 'Ranger', unlocksAtLevel: 3, description: 'Touched by the Feywild. Add CHA to INT/WIS/CHA checks, and deal bonus psychic damage with weapon attacks.' },
  { id: 'Swarmkeeper',   label: 'Swarmkeeper',   classId: 'Ranger', unlocksAtLevel: 3, description: 'Gather a swarm of spirits. They move with you, deal damage, and can push or pull enemies.' },
  { id: 'Drakewarden',   label: 'Drakewarden',   classId: 'Ranger', unlocksAtLevel: 3, description: 'Bond with a drake companion. It grows stronger over levels, eventually becoming a mount.' },

  // ── Rogue (level 3) ─────────────────────────────────────────────
  { id: 'Thief',           label: 'Thief',           classId: 'Rogue', unlocksAtLevel: 3, description: 'Fast Hands for bonus action item use and climbing. Use Magic Device lets you use magic items freely.' },
  { id: 'Assassin',        label: 'Assassin',        classId: 'Rogue', unlocksAtLevel: 3, description: 'Strike first and devastate. Assassinate grants auto-crit on surprised targets.' },
  { id: 'ArcaneTrickster', label: 'Arcane Trickster', classId: 'Rogue', unlocksAtLevel: 3, spellcastingAbility: 'int', spellListClassId: 'Wizard', spellsKnownTable: { 3:3, 4:4, 7:5, 8:6, 10:7, 11:8, 13:9, 14:10, 16:11, 19:12, 20:13 }, cantripsKnownTable: { 3:2, 10:3 }, description: 'Blend illusion and enchantment magic with roguish tricks. Mage Hand Legerdemain for cunning heists.' },
  { id: 'Inquisitive',     label: 'Inquisitive',     classId: 'Rogue', unlocksAtLevel: 3, description: 'Expert at uncovering secrets. Ear for Deceit and Eye for Detail help ferret out lies and hidden foes.' },
  { id: 'Mastermind',      label: 'Mastermind',      classId: 'Rogue', unlocksAtLevel: 3, description: 'The consummate planner. Help allies at range and read social situations in an instant.' },
  { id: 'Scout',           label: 'Scout',           classId: 'Rogue', unlocksAtLevel: 3, description: 'Expert skirmisher in the wild. Skirmisher lets you dash away when enemies close in.' },
  { id: 'Swashbuckler',    label: 'Swashbuckler',   classId: 'Rogue', unlocksAtLevel: 3, description: 'Elegant and dangerous in a duel. Sneak Attack with a single adjacent enemy, no ally required.' },
  { id: 'Phantom',         label: 'Phantom',         classId: 'Rogue', unlocksAtLevel: 3, description: 'Tap into the power of death. Steal memories from the dead and gain proficiency from their spirits.' },
  { id: 'Soulknife',       label: 'Soulknife',       classId: 'Rogue', unlocksAtLevel: 3, description: 'Focus your psychic energy into blades of psionic power. Telepathy, teleportation, and mental strikes.' },

  // ── Sorcerer (level 1) ──────────────────────────────────────────
  { id: 'DraconicBloodline', label: 'Draconic Bloodline', classId: 'Sorcerer', unlocksAtLevel: 1, unarmoredAC: (dex) => 13 + dex, description: 'Dragon blood flows in your veins. AC 13 + DEX without armor; extra HP per level; elemental affinity.' },
  { id: 'WildMagicSorcerer', label: 'Wild Magic',         classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Your magic is volatile and unpredictable. Wild Magic Surges trigger random arcane effects.' },
  { id: 'DivineSoul',        label: 'Divine Soul',        classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Blessed by a divine being. Access to the Cleric spell list in addition to the Sorcerer list.' },
  { id: 'ShadowMagic',       label: 'Shadow Magic',       classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Born from the Shadowfell. See in darkness, summon a Hound of Ill Omen, and survive death.' },
  { id: 'StormSorcery',      label: 'Storm Sorcery',      classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Your power is rooted in wind and thunder. Fly short distances when casting lightning or thunder spells.' },
  { id: 'AberrantMind',      label: 'Aberrant Mind',      classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Your mind was warped by a psionic entity. Telepathy and expanded spells from the Far Realm.' },
  { id: 'ClockworkSoul',     label: 'Clockwork Soul',     classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Infused with the orderly magic of Mechanus. Restore balance by cancelling advantage and disadvantage.' },

  // ── Warlock (level 1) ───────────────────────────────────────────
  { id: 'Archfey',     label: 'The Archfey',      classId: 'Warlock', unlocksAtLevel: 1, description: 'Bound to a lord of the Feywild. Fey Presence charms or frightens; Misty Escape teleports when damaged.' },
  { id: 'Fiend',       label: 'The Fiend',        classId: 'Warlock', unlocksAtLevel: 1, description: 'Pact with a powerful fiend. Dark One\'s Blessing grants temp HP on kills; expanded spell list.' },
  { id: 'GreatOldOne', label: 'The Great Old One', classId: 'Warlock', unlocksAtLevel: 1, description: 'Bound to an incomprehensible ancient being. Telepathy, Awakened Mind for silent communication.' },
  { id: 'Celestial',   label: 'The Celestial',    classId: 'Warlock', unlocksAtLevel: 1, description: 'Patron from the Upper Planes. Healing Light lets you expend dice to restore HP.' },
  { id: 'Hexblade',    label: 'The Hexblade',     classId: 'Warlock', unlocksAtLevel: 1, description: 'Pact with a shadowy entity of the Shadowfell. Use CHA for weapon attacks and curse enemies.' },
  { id: 'Fathomless',  label: 'The Fathomless',   classId: 'Warlock', unlocksAtLevel: 1, description: 'An entity from the ocean\'s depths answers your call. Summon tentacles and breathe underwater.' },
  { id: 'Genie',       label: 'The Genie',        classId: 'Warlock', unlocksAtLevel: 1, description: 'Bound to a noble genie. Carry a Genie\'s Vessel — a magical vessel you can retreat into for rest.' },
  { id: 'Undead',      label: 'The Undead',       classId: 'Warlock', unlocksAtLevel: 1, description: 'Pact with an undead entity. Form of Dread frightens enemies; you gain immunity to fright yourself.' },

  // ── Wizard (level 2) ────────────────────────────────────────────
  { id: 'Abjuration',     label: 'School of Abjuration',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Specialize in protective magic. Arcane Ward absorbs damage for you.' },
  { id: 'Conjuration',    label: 'School of Conjuration',    classId: 'Wizard', unlocksAtLevel: 2, description: 'Master summoning creatures and teleporting. Minor Conjuration creates small objects from thin air.' },
  { id: 'Divination',     label: 'School of Divination',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Peer into the future with Portent — roll two d20s each day and substitute them for any roll.' },
  { id: 'Enchantment',    label: 'School of Enchantment',    classId: 'Wizard', unlocksAtLevel: 2, description: 'Bend minds to your will. Hypnotic Gaze incapacitates an adjacent creature.' },
  { id: 'Evocation',      label: 'School of Evocation',      classId: 'Wizard', unlocksAtLevel: 2, description: 'Focus on violent magical energy. Sculpt Spells protects allies inside your area spells.' },
  { id: 'Illusion',       label: 'School of Illusion',       classId: 'Wizard', unlocksAtLevel: 2, description: 'Weave deceptive illusions. Improved Minor Illusion creates both image and sound simultaneously.' },
  { id: 'Necromancy',     label: 'School of Necromancy',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Manipulate life and death. Grim Harvest restores HP when you kill creatures with spells.' },
  { id: 'Transmutation',  label: 'School of Transmutation',  classId: 'Wizard', unlocksAtLevel: 2, description: 'Transform matter and energy. Minor Alchemy converts materials; Transmuter\'s Stone stores transformation magic.' },
  { id: 'Bladesinging',   label: 'Bladesinging',             classId: 'Wizard', unlocksAtLevel: 2, description: 'Elven tradition blending sword and spell. Bladesong grants AC and speed bonuses while active.' },
  { id: 'OrderOfScribes', label: 'Order of Scribes',         classId: 'Wizard', unlocksAtLevel: 2, description: 'The ultimate bookworm. Your spellbook is alive; copy spells instantly and change their damage type.' },
  { id: 'Chronurgy',      label: 'Chronurgy Magic',          classId: 'Wizard', unlocksAtLevel: 2, description: 'Manipulate the flow of time. Chronal Shift lets you force rerolls of any d20.' },
  { id: 'Graviturgy',     label: 'Graviturgy Magic',         classId: 'Wizard', unlocksAtLevel: 2, description: 'Control gravitational forces. Adjust the weight of creatures and launch them through the air.' },
  { id: 'WarMagic',       label: 'War Magic',                classId: 'Wizard', unlocksAtLevel: 2, description: 'Blend offense and defense for battlefield wizardry. Arcane Deflection adds to AC and saves as a reaction.' },

  // ── Artificer (level 3) ─────────────────────────────────────────
  { id: 'Alchemist',   label: 'Alchemist',   classId: 'Artificer', unlocksAtLevel: 3, description: 'Create experimental elixirs that grant random beneficial effects when consumed.' },
  { id: 'Armorer',     label: 'Armorer',     classId: 'Artificer', unlocksAtLevel: 3, description: 'Use armor as a weapon platform. Choose Guardian or Infiltrator mode for your magical suit.' },
  { id: 'Artillerist', label: 'Artillerist', classId: 'Artificer', unlocksAtLevel: 3, description: 'Create a magical cannon that fires force, fire, or necrotic projectiles.' },
  { id: 'BattleSmith', label: 'Battle Smith', classId: 'Artificer', unlocksAtLevel: 3, description: 'A master of weapons and constructs. Use INT for weapon attacks and summon a Steel Defender.' },
]

export const SUBCLASS_BY_ID = Object.fromEntries(SUBCLASSES.map(s => [s.id, s])) as Record<string, SubclassDef>

export const SUBCLASSES_BY_CLASS = SUBCLASSES.reduce<Record<string, SubclassDef[]>>((acc, s) => {
  if (!acc[s.classId]) acc[s.classId] = []
  acc[s.classId].push(s)
  return acc
}, {})
