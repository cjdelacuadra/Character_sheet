import type { ArmorProficiency } from './equipment/gear'
import type { AbilityScore } from '@/entities/character/types'
import type { FeatureEntry } from './classFeaturesData'
import type { Skill } from './skills'

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
  /** Additional weapon proficiencies granted by this subclass.
   *  Use strings matching `Class.weaponProficiencies` convention: 'simple weapons', 'martial weapons', or specific names (e.g. 'longbow'). */
  extraWeaponProficiencies?: string[]
  /** Fixed skill proficiencies granted by the subclass (no player choice). */
  extraSkillProficiencies?: Skill[]
  /** Choose-N-of-M skill proficiency grant. The pick is captured during creation
   *  and folded into `Character.skillProficiencies` as 'proficient'. */
  extraSkillChoice?: { count: number; options: Skill[] }
  /** Tool proficiencies granted (free-text names like "smith's tools"). Informational v1 — no rules consumer yet. */
  extraToolProficiencies?: string[]
  /** Override unarmored AC formula: receives dex/con/wis mods, returns AC base (before shield) */
  unarmoredAC?: (dex: number, con: number, wis: number) => number
  /** Spellcasting ability for subclasses that add magic to non-casting classes */
  spellcastingAbility?: AbilityScore
  /** Ability used to compute Arcane Shot DC (Arcane Archer, XGtE). Not a spellcaster — kept separate from `spellcastingAbility` so the action list and spell-DC display don't treat AA as a caster. */
  arcaneShotAbility?: AbilityScore
  /** Spells-known progression table (keyed by class level) for subclass spellcasters */
  spellsKnownTable?: Partial<Record<number, number>>
  /** Which class spell list to offer in the spell picker (e.g. 'Wizard' for EK/AT) */
  spellListClassId?: string
  /** Cantrips-known progression table (keyed by class level) for subclass spellcasters */
  cantripsKnownTable?: Partial<Record<number, number>>
  /** Subclass-specific features unlocked at given levels (merged into FeaturesPanel) */
  subclassFeatures?: FeatureEntry[]
  /** Subclass-granted spells, keyed by class level (always known/prepared, don't count against limits) */
  subclassSpells?: Partial<Record<number, string[]>>
  /** Races allowed to take this subclass (e.g. Battlerager is Dwarf-only per SCAG).
   *  An empty/undefined list means no restriction. Enforced in CharacterSelectScreen with a lineage-override toggle. */
  restrictedRaces?: string[]
  /** Darkvision range in feet granted by this subclass (e.g. 300 for Twilight Domain) */
  darkvisionRange?: number
}

export const SUBCLASSES: SubclassDef[] = [
  // ── Barbarian (level 3) ──────────────────────────────────────────
  { id: 'Berserker',          label: 'Path of the Berserker',          classId: 'Barbarian', unlocksAtLevel: 3, description: 'Channel rage into frenzied melee attacks. Make an additional attack as a bonus action while raging.',
    subclassFeatures: [
      { level: 3, name: 'Frenzy', desc: 'While raging, you can make a single melee weapon attack as a bonus action on each of your turns. When your rage ends, you suffer one level of exhaustion.' },
      { level: 6, name: 'Mindless Rage', desc: 'You can\'t be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect is suspended for the duration.' },
      { level: 10, name: 'Intimidating Presence', desc: 'As an action, choose one creature you can see within 30 ft. It must succeed on a WIS save (DC = 8 + Prof + STR mod) or be frightened of you until the end of your next turn. You can extend by repeating the action.' },
      { level: 14, name: 'Retaliation', desc: 'When you take damage from a creature within 5 ft, you can use your reaction to make a melee weapon attack against that creature.' },
    ] },
  { id: 'TotemWarrior',       label: 'Path of the Totem Warrior',       classId: 'Barbarian', unlocksAtLevel: 3, description: 'Seek a spiritual connection with an animal totem — Bear, Eagle, Elk, Tiger, or Wolf — gaining its blessings.',
    subclassFeatures: [
      { level: 3, name: 'Spirit Seeker', desc: 'Gain the ability to cast Beast Sense and Speak with Animals as rituals.' },
      { level: 3, name: 'Totem Spirit', desc: 'Choose Bear (resistance to all damage but psychic while raging), Eagle (Dash as bonus action, OAs vs you have disadvantage), Wolf (allies have advantage on melee attacks vs enemies within 5 ft of you), Elk, or Tiger (long jump +10ft). // TODO: mechanical wiring — Bear damage resistance, Eagle OA-disadvantage, Wolf advantage-grant.' },
      { level: 6, name: 'Aspect of the Beast', desc: 'Gain a magical benefit based on your totem (Bear: carry 2× weight; Eagle: see clearly at 1 mile; Wolf: track at fast pace; etc.).' },
      { level: 10, name: 'Spirit Walker', desc: 'Cast the Commune with Nature spell as a ritual.' },
      { level: 14, name: 'Totemic Attunement', desc: 'Choose a totem benefit: Bear (creatures within 5 ft have disadvantage on attacks against targets other than you while raging); Eagle (fly speed equal to walking while raging — short hops); Wolf (knock Large or smaller targets prone on melee hit while raging).' },
    ] },
  { id: 'AncestralGuardian',  label: 'Path of the Ancestral Guardian',  classId: 'Barbarian', unlocksAtLevel: 3, description: 'Call upon the spirits of your ancestors to protect your allies and hinder your enemies.',
    subclassFeatures: [
      { level: 3, name: 'Ancestral Protectors', desc: 'While raging, the first creature you hit with an attack is hindered: it has disadvantage on attacks against anyone but you, and any damage it deals to others is halved until the start of your next turn.' },
      { level: 6, name: 'Spirit Shield', desc: 'While raging, you can use your reaction when another creature you can see within 30 ft takes damage to reduce that damage by 2d6 (3d6 at lv 10, 4d6 at lv 14).' },
      { level: 10, name: 'Consult the Spirits', desc: 'Cast Augury or Clairvoyance once per short or long rest without a spell slot, using WIS for spellcasting.' },
      { level: 14, name: 'Vengeful Ancestors', desc: 'When you use Spirit Shield, the attacker takes force damage equal to the amount of damage prevented.' },
    ] },
  { id: 'StormHerald',        label: 'Path of the Storm Herald',        classId: 'Barbarian', unlocksAtLevel: 3, description: 'Tap into a primordial force of nature — Desert, Sea, or Tundra — and emanate elemental power while raging.',
    subclassFeatures: [
      { level: 3, name: 'Storm Aura', desc: 'While raging, you emit a 10-ft aura. Choose Desert (fire damage to creatures within), Sea (lightning damage to one creature, DEX save half), or Tundra (allies in aura get temp HP).' },
      { level: 6, name: 'Storm Soul', desc: 'Gain resistance to your storm\'s damage type and a benefit (Desert: resist fire, walk on lava; Sea: swim speed, resist lightning; Tundra: ignore cold-difficult terrain, resist cold).' },
      { level: 10, name: 'Shielding Storm', desc: 'Allies in your aura also gain the Storm Soul resistance benefit while you rage.' },
      { level: 14, name: 'Raging Storm', desc: 'Each storm gains a powerful additional rider (Desert: enemies within aura must STR save or take 1d6 fire when hitting you; Sea: knock prone with reaction; Tundra: restrain at start of turn).' },
    ] },
  { id: 'Zealot',             label: 'Path of the Zealot',              classId: 'Barbarian', unlocksAtLevel: 3, description: 'Channel divine fury. Damage you deal while raging ignores death, and fallen allies are easier to resurrect.',
    subclassFeatures: [
      { level: 3, name: 'Divine Fury', desc: 'While raging, the first creature you hit with a melee weapon attack on each of your turns takes extra damage = 1d6 + half your barbarian level (necrotic or radiant, your choice when you take the subclass).' },
      { level: 3, name: 'Warrior of the Gods', desc: 'Spells used to revive you don\'t require material components.' },
      { level: 6, name: 'Fanatical Focus', desc: 'While raging, if you fail a saving throw, you can reroll it; you must use the new roll. Once per rage.' },
      { level: 10, name: 'Zealous Presence', desc: 'As a bonus action, give up to 10 creatures within 60 ft advantage on attack rolls and saving throws until the start of your next turn. Once per long rest.' },
      { level: 14, name: 'Rage Beyond Death', desc: "While raging, having 0 HP doesn't knock you unconscious. You can continue to act and only die if your rage ends." },
    ] },
  { id: 'Beast',              label: 'Path of the Beast',               classId: 'Barbarian', unlocksAtLevel: 3, description: 'Unleash a bestial alter ego while raging — claws, a bite, or a tail appear as natural weapons.',
    subclassFeatures: [
      { level: 3, name: 'Form of the Beast', desc: 'When you rage, choose a natural weapon: Bite (1d8 piercing + heal yourself), Claws (1d6 slashing + extra attack), or Tail (1d8 piercing with reach + reaction +1d8 AC).' },
      { level: 6, name: 'Bestial Soul', desc: 'Your natural weapons count as magical. Choose a benefit when you finish a long rest: swim + breathe water, climb without checks, or +Long-jump = STR mod × 10ft.' },
      { level: 10, name: 'Infectious Fury', desc: 'When you hit a creature with your natural weapons while raging, you can force it to make a WIS save. Failure: use reaction to attack one of its allies, or take 2d12 psychic damage. Uses = PB per long rest.' },
      { level: 14, name: 'Call the Hunt', desc: 'When you enter your rage, choose up to PB creatures within 30 ft. They gain 5 + barbarian level temp HP and advantage on one attack roll. You gain temp HP × 2.' },
    ] },
  { id: 'WildMagicBarbarian', label: 'Path of Wild Magic',              classId: 'Barbarian', unlocksAtLevel: 3, description: 'Wild magic surges through you as you rage, producing random arcane effects that grow stronger with time.',
    subclassFeatures: [
      { level: 3, name: 'Magic Awareness', desc: 'As an action, describe the location of magical influences within 1 mile. Uses = PB per long rest.' },
      { level: 3, name: 'Wild Surge', desc: 'When you enter your rage, roll on the Wild Magic table (d8) — effects include force-shielding allies, teleport-on-hit, summoning a flumph (kidding — actually random arcane effects per TCoE). // TODO: mechanical wiring — random-table roll feature.' },
      { level: 6, name: 'Bolstering Magic', desc: 'Touch a creature as an action and confer either: a d3 bonus to attack rolls and ability checks for 10 minutes, or roll a d6 — the creature recovers an expended spell slot of that level or lower. Uses = PB per long rest.' },
      { level: 10, name: 'Unstable Backlash', desc: 'When you take damage or fail a saving throw while raging, use your reaction to roll on the Wild Magic table again and immediately produce the new effect (replaces the current effect).' },
      { level: 14, name: 'Controlled Surge', desc: 'Roll on the Wild Magic table twice and choose which effect to use. If you roll doubles, pick any effect.' },
    ] },
  { id: 'Battlerager',        label: 'Path of the Battlerager',         classId: 'Barbarian', unlocksAtLevel: 3, description: 'Wear spiked armor as a weapon. While raging, grapple and deal bonus piercing damage as a bonus action.',
    restrictedRaces: ['Dwarf'],
    subclassFeatures: [
      { level: 3, name: 'Battlerager Armor', desc: 'While wearing spiked armor and raging, use a bonus action to make one melee weapon attack with your armor spikes (1d4 piercing, STR mod for atk/dmg). A successful grapple while raging deals 3 piercing.' },
      { level: 6, name: 'Reckless Abandon', desc: 'When you use Reckless Attack while raging, you also gain temp HP = your CON mod (minimum 1).' },
      { level: 10, name: 'Battlerager Charge', desc: 'While raging, take the Dash action as a bonus action on your turn.' },
      { level: 14, name: 'Spiked Retribution', desc: 'While raging, wearing spiked armor, and not incapacitated, any creature within 5 ft that hits you with a melee attack takes 3 piercing damage.' },
    ] },

  // ── Bard (level 3) ──────────────────────────────────────────────
  { id: 'CollegeOfLore',       label: 'College of Lore',       classId: 'Bard', unlocksAtLevel: 3,
    extraSkillChoice: { count: 3, options: ['acrobatics','animalHandling','arcana','athletics','deception','history','insight','intimidation','investigation','medicine','nature','perception','performance','persuasion','religion','sleightOfHand','stealth','survival'] },
    description: 'Collect knowledge from every source. Gain 3 bonus proficiencies and the ability to cut enemies down with Cutting Words.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: 'Gain proficiency with three skills of your choice.' },
      { level: 3, name: 'Cutting Words', desc: 'When a creature you can see within 60 ft makes an attack roll, ability check, or damage roll, use your reaction to expend one Bardic Inspiration die — subtract the rolled number from the creature\'s roll (it can\'t be reduced if the creature is immune to charm).' },
      { level: 6, name: 'Additional Magical Secrets', desc: 'Learn two spells of your choice from any class. They count as bard spells for you but don\'t count against your spells known.' },
      { level: 14, name: 'Peerless Skill', desc: 'When you make an ability check, expend one Bardic Inspiration die and add it to your roll. You can do so after the d20 roll but before the outcome is determined.' },
    ] },
  { id: 'CollegeOfValor',      label: 'College of Valor',      classId: 'Bard', unlocksAtLevel: 3, description: 'Inspire warriors in battle. Gain armor/weapon proficiencies and let allies add Bardic Inspiration to attack rolls.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: 'Gain proficiency with medium armor, shields, and martial weapons.' },
      { level: 3, name: 'Combat Inspiration', desc: 'A creature holding one of your Bardic Inspiration dice can spend it: as a reaction when hit by an attack to add the die to their AC, or to add the die to a damage roll just made.' },
      { level: 6, name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
      { level: 14, name: 'Battle Magic', desc: 'When you take the Attack action on your turn, you can use a bonus action to cast a bard cantrip or 1st-level+ bard spell.' },
    ] },
  { id: 'CollegeOfGlamour',    label: 'College of Glamour',    classId: 'Bard', unlocksAtLevel: 3, description: 'Draw on fey magic to charm and captivate. Inspire allies to move without triggering opportunity attacks.',
    subclassFeatures: [
      { level: 3, name: 'Mantle of Inspiration', desc: 'As a bonus action, expend one Bardic Inspiration die to give CHA mod (min 1) creatures temp HP = inspiration die + your level, and let each move up to its speed without provoking OAs.' },
      { level: 3, name: 'Enthralling Performance', desc: 'After a 1-minute performance, up to CHA mod humanoids within 60 ft must WIS save or be charmed for 1 hour. 1/short rest.' },
      { level: 6, name: 'Mantle of Majesty', desc: 'As a bonus action, cast Command without a slot. As a bonus action on each subsequent turn, command another target for 1 minute (concentration). Charmed creatures auto-fail saves. 1/long rest.' },
      { level: 14, name: 'Unbreakable Majesty', desc: 'As a bonus action, assume a majestic presence for 1 minute. Creatures must succeed on a CHA save to target you. If a target attempts and fails, it can\'t attack anyone else for that turn. 1/short rest.' },
    ] },
  { id: 'CollegeOfSwords',     label: 'College of Swords',     classId: 'Bard', unlocksAtLevel: 3, description: 'Weave weapon attacks and spell casting into one. Use Bardic Inspiration to fuel flourishes with blades.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: 'Gain proficiency with medium armor and scimitars.' },
      { level: 3, name: 'Fighting Style', desc: 'Choose Dueling or Two-Weapon Fighting.' },
      { level: 3, name: 'Blade Flourish', desc: 'Once per turn, +10 ft speed when you take the Attack action. Spend one Bardic Inspiration die on a flourish: Defensive (+die to AC), Slashing (+die damage to ALL adjacent foes hit), or Mobile (push target 5 ft, swap places, +die damage).' },
      { level: 6, name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
      { level: 14, name: 'Master\'s Flourish', desc: 'When you use a Blade Flourish, you can roll a d6 instead of expending a Bardic Inspiration die.' },
    ] },
  { id: 'CollegeOfWhispers',   label: 'College of Whispers',   classId: 'Bard', unlocksAtLevel: 3, description: 'Use the power of words and secrets to psychically wound enemies and steal the identity of those you kill.',
    subclassFeatures: [
      { level: 3, name: 'Psychic Blades', desc: 'When you hit with a weapon attack, expend one Bardic Inspiration die to deal extra psychic damage = die + 1d6 per 4 bard levels above 3rd. 1/turn.' },
      { level: 3, name: 'Words of Terror', desc: 'After 1 minute of conversation with one humanoid, force a WIS save or it is frightened of you/another for 1 hour. 1/short rest.' },
      { level: 6, name: 'Mantle of Whispers', desc: 'When a humanoid dies within 30 ft, capture its shadow as a reaction. As an action, become an impostor of that creature for 1 hour. 1/short rest.' },
      { level: 14, name: 'Shadow Lore', desc: 'Whisper a magical secret as an action. Target makes a WIS save (advantage if not understanding you) or is charmed for 8 hours and follows your verbal commands. 1/long rest.' },
    ] },
  { id: 'CollegeOfCreation',   label: 'College of Creation',   classId: 'Bard', unlocksAtLevel: 3, description: 'Tap into the Song of Creation to animate objects and create items from thin air.',
    subclassFeatures: [
      { level: 3, name: 'Mote of Potential', desc: 'When you give a Bardic Inspiration die, also create a mote of dancing light next to the recipient. Adds a small bonus effect when the die is used (extra dice, AoE).' },
      { level: 3, name: 'Performance of Creation', desc: 'As an action, conjure a non-magical item of your choice. Size up to medium; max value 20gp × bard level; lasts up to bard level hours. 1/long rest (or expend a 2nd-level slot).' },
      { level: 6, name: 'Animating Performance', desc: 'After 1 minute of performance, animate a Large or smaller non-magical object as an action. It acts on your initiative count using your bonus action. 1/long rest.' },
      { level: 14, name: 'Creative Crescendo', desc: 'Performance of Creation lets you make up to PB items at once; one item can be Large or smaller; the item value cap is removed.' },
    ] },
  { id: 'CollegeOfEloquence',  label: 'College of Eloquence',  classId: 'Bard', unlocksAtLevel: 3, description: 'Master the art of oratory. Your words never fail — Bardic Inspiration dice never roll below a minimum value.',
    subclassFeatures: [
      { level: 3, name: 'Silver Tongue', desc: 'When you make a CHA (Persuasion or Deception) check, treat any d20 roll of 9 or lower as a 10.' },
      { level: 3, name: 'Unsettling Words', desc: 'As a bonus action, expend one Bardic Inspiration die. Choose a creature within 60 ft; it subtracts the die from its next save before the start of your next turn.' },
      { level: 6, name: 'Unfailing Inspiration', desc: 'When a creature adds your Bardic Inspiration die to a roll that fails, the creature keeps the die.' },
      { level: 6, name: 'Universal Speech', desc: 'As an action, any number of creatures within 60 ft can understand your speech for 1 hour. CHA mod uses per long rest.' },
      { level: 14, name: 'Infectious Inspiration', desc: 'When a creature within 60 ft adds your Bardic Inspiration die to its roll and it succeeds, use your reaction to grant another inspiration die (free, doesn\'t consume your pool). CHA mod uses per long rest.' },
    ] },

  // ── Cleric (level 1) ────────────────────────────────────────────
  {
    id: 'LifeDomain', label: 'Life Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'Devoted to the forces that sustain life. Heavy armor proficiency and powerful healing spells.',
    channelDivinityDesc: 'Preserve Life: Choose any creatures within 30 ft. Restore HP equal to 5× your cleric level, divided as you choose. Cannot bring any creature above half its max HP.',
    subclassSpells: { 1: ['bless', 'cure-wounds'], 3: ['lesser-restoration', 'spiritual-weapon'], 5: ['revivify'], 7: ['death-ward'], 9: ['mass-cure-wounds', 'raise-dead'] },
    subclassFeatures: [
      { level: 1, name: 'Disciple of Life', desc: 'Whenever you use a 1st-level+ spell to restore HP, the creature regains additional HP = 2 + the spell\'s level.' },
      { level: 6, name: 'Blessed Healer', desc: 'When you cast a 1st-level+ spell that restores HP to a creature other than you, you regain HP = 2 + the spell\'s level.' },
      { level: 8, name: 'Divine Strike', desc: 'Once on each of your turns, when you hit a creature with a weapon attack, deal extra 1d8 radiant damage (2d8 at lv 14).' },
      { level: 17, name: 'Supreme Healing', desc: 'Whenever you would roll dice to restore HP with a spell, treat each die as if it rolled its maximum value.' },
    ],
  },
  {
    id: 'LightDomain', label: 'Light Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Wield the power of light and truth to banish darkness and illuminate the path.',
    channelDivinityDesc: 'Radiance of the Dawn: Dispel magical darkness within 30 ft. Each hostile creature must make a CON save (DC 8 + Prof + WIS) or take 2d10 + cleric level radiant damage (half on success).',
    subclassSpells: { 1: ['burning-hands', 'faerie-fire'], 3: ['flaming-sphere', 'scorching-ray'], 5: ['daylight', 'fireball'], 7: ['wall-of-fire'], 9: ['flame-strike'] },
    subclassFeatures: [
      { level: 1, name: 'Bonus Cantrip + Warding Flare', desc: 'Learn the Light cantrip. Warding Flare: as a reaction when a creature within 30 ft attacks you, impose disadvantage on the attack. Uses = WIS mod per long rest.' },
      { level: 6, name: 'Improved Flare', desc: 'Use Warding Flare when a creature you can see within 30 ft attacks an ally.' },
      { level: 8, name: 'Potent Spellcasting', desc: 'Add your WIS mod to the damage of cleric cantrips you cast.' },
      { level: 17, name: 'Corona of Light', desc: 'As an action, emanate a 60-ft sun-aura for 1 minute. Each enemy in the aura has disadvantage on saves vs fire/radiant spells.' },
    ],
  },
  {
    id: 'TrickeryDomain', label: 'Trickery Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Embrace deception and mischief. Your deity blesses lies, thieves, and rogues.',
    channelDivinityDesc: 'Invoke Duplicity: Create an illusory duplicate of yourself within 30 ft. The duplicate lasts 1 minute (concentration). While active, allies have advantage when attacking a creature if you or the duplicate are within 5 ft of it.',
    subclassSpells: { 1: ['charm-person', 'disguise-self'], 3: ['mirror-image', 'pass-without-trace'], 5: ['blink', 'dispel-magic'], 7: ['dimension-door', 'polymorph'], 9: ['dominate-person'] },
    subclassFeatures: [
      { level: 1, name: 'Blessing of the Trickster', desc: 'As an action, touch one willing creature (not yourself); it has advantage on Stealth checks for 1 hour.' },
      { level: 6, name: 'Cloak of Shadows', desc: 'Use Channel Divinity to become invisible until the end of your next turn. Ends early if you attack or cast a spell.' },
      { level: 8, name: 'Divine Strike', desc: 'Once on each of your turns, when you hit with a weapon, deal extra 1d8 poison damage (2d8 at lv 14).' },
      { level: 17, name: 'Improved Duplicity', desc: 'Create up to 4 illusory duplicates with Invoke Duplicity. As a bonus action, you can move any number of them up to 30 ft (max range 120 ft).' },
    ],
  },
  {
    id: 'KnowledgeDomain', label: 'Knowledge Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Seek and preserve knowledge. Gain proficiency in two skills and two languages of your choice.',
    channelDivinityDesc: 'Knowledge of the Ages: Gain proficiency in one skill or one tool of your choice for 10 minutes.',
    extraSkillChoice: { count: 2, options: ['arcana', 'history', 'nature', 'religion'] },
    subclassSpells: { 1: ['command', 'identify'], 3: ['suggestion'], 5: ['speak-with-dead'], 7: ['arcane-eye', 'confusion'] },
    subclassFeatures: [
      { level: 1, name: 'Blessings of Knowledge', desc: 'Learn two languages and gain proficiency in two skills from Arcana/History/Nature/Religion. Your proficiency bonus is doubled for any ability check using either of those skills.' },
      { level: 6, name: 'Read Thoughts', desc: 'Use Channel Divinity to read a creature\'s thoughts (WIS save negates) and cast Suggestion against the target without expending a slot.' },
      { level: 8, name: 'Potent Spellcasting', desc: 'Add your WIS mod to cleric cantrip damage.' },
      { level: 17, name: 'Visions of the Past', desc: 'After 1 minute of meditation, learn the recent history of an object or location.' },
    ],
  },
  {
    id: 'NatureDomain', label: 'Nature Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    description: 'Protect and harness the wild world. Heavy armor proficiency and druid cantrip.',
    channelDivinityDesc: 'Charm Animals and Plants: Each beast and plant creature within 30 ft must make a WIS save (DC 8 + Prof + WIS) or be charmed by you for 1 minute.',
    subclassSpells: { 1: ['animal-friendship'], 3: ['spike-growth'], 5: ['plant-growth', 'wind-wall'] },
    subclassFeatures: [
      { level: 1, name: 'Acolyte of Nature', desc: 'Learn one druid cantrip and gain proficiency in one skill of your choice from Animal Handling, Nature, or Survival.' },
      { level: 6, name: 'Dampen Elements', desc: 'When you or a creature within 30 ft takes acid, cold, fire, lightning, or thunder damage, use your reaction to grant resistance to that instance.' },
      { level: 8, name: 'Divine Strike', desc: 'Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of your choice: cold, fire, or lightning.' },
      { level: 17, name: 'Master of Nature', desc: 'You can use your action to verbally command any creature you charmed with Charm Animals and Plants (Channel Divinity).' },
    ],
  },
  {
    id: 'TempestDomain', label: 'Tempest Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraWeaponProficiencies: ['martial weapons'],
    description: 'Call upon the fury of storms. Heavy armor + martial weapon proficiency and devastating lightning powers.',
    channelDivinityDesc: 'Destructive Wrath: Instead of rolling for lightning or thunder damage, deal the maximum possible amount.',
    subclassSpells: { 1: ['fog-cloud', 'thunderwave'], 3: ['shatter'], 7: ['ice-storm'] },
    subclassFeatures: [
      { level: 1, name: 'Wrath of the Storm', desc: 'When a creature within 5 ft hits you with an attack, use your reaction to force a DEX save (DC = 8 + Prof + WIS) or take 2d8 lightning or thunder (half on success). Uses = WIS mod (min 1) per long rest.' },
      { level: 6, name: 'Thunderbolt Strike', desc: 'When you deal lightning damage to a Large or smaller creature, push it up to 10 ft.' },
      { level: 8, name: 'Divine Strike', desc: 'Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) thunder damage.' },
      { level: 17, name: 'Stormborn', desc: 'You have a flying speed = your walking speed whenever you aren\'t underground or indoors.' },
    ],
  },
  {
    id: 'WarDomain', label: 'War Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraWeaponProficiencies: ['martial weapons'],
    description: 'A god of war grants you power in battle. Heavy armor + martial weapon proficiency and the War Priest feature.',
    channelDivinityDesc: 'Guided Strike: Add +10 to one attack roll you make.',
    subclassSpells: { 1: ['divine-favor', 'shield-of-faith'], 3: ['magic-weapon', 'spiritual-weapon'], 5: ['spirit-guardians'], 7: ['stoneskin', 'freedom-of-movement'], 9: ['flame-strike', 'hold-monster'] },
    subclassFeatures: [
      // TODO: mechanical wiring — War Priest is a subclass-resource bonus-action attack. Could be modeled as a resource entry "War Priest" with WIS mod uses per long rest, refreshed via short rest. For now: text only.
      { level: 1, name: 'War Priest', desc: 'When you use the Attack action, make one weapon attack as a bonus action. Uses = WIS mod (min 1) per long rest; recover all on a short or long rest.' },
      { level: 6, name: 'War God\'s Blessing', desc: 'When a creature within 30 ft makes an attack roll, use your reaction to grant a +10 bonus to the roll (using Channel Divinity).' },
      { level: 8, name: 'Divine Strike', desc: 'Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of the weapon\'s type.' },
      { level: 17, name: 'Avatar of Battle', desc: 'Gain resistance to bludgeoning, piercing, and slashing damage from non-magical attacks.' },
    ],
  },
  {
    id: 'DeathDomain', label: 'Death Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraWeaponProficiencies: ['martial weapons'],
    description: 'Draw on the power of death itself. Heavy armor, martial weapons, and deadly necrotic touch.',
    channelDivinityDesc: 'Touch of Death: When you hit a creature with a melee attack, deal extra necrotic damage equal to 5 + twice your cleric level.',
    subclassSpells: { 1: ['false-life', 'ray-of-sickness'], 3: ['blindness-deafness'], 5: ['animate-dead', 'vampiric-touch'], 7: ['blight', 'death-ward'], 9: ['cloudkill'] },
    subclassFeatures: [
      { level: 1, name: 'Reaper', desc: 'Learn one necromancy cantrip from any class\'s spell list. Necromancy cantrips that target a single creature can target two creatures within 5 ft of each other.' },
      { level: 6, name: 'Inescapable Destruction', desc: 'Your necrotic spell/Channel Divinity damage ignores resistance to necrotic damage.' },
      { level: 8, name: 'Divine Strike', desc: 'Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) necrotic damage.' },
      { level: 17, name: 'Improved Reaper', desc: 'When you cast a 1st-5th level necromancy spell that targets one creature, you can target two creatures within 5 ft of each other.' },
    ],
  },
  {
    id: 'ArcanaDomain', label: 'Arcana Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Bridge divine and arcane magic. Arcane Initiate grants two Wizard cantrips.',
    channelDivinityDesc: 'Arcane Abjuration: One celestial, elemental, fey, or fiend within 30 ft must make a WIS save (DC 8 + Prof + WIS) or be turned for 1 minute (as Turn Undead but for these creature types).',
    subclassSpells: { 1: ['detect-magic', 'magic-missile'], 3: ['magic-weapon'], 5: ['dispel-magic'], 7: ['arcane-eye'], 9: ['planar-binding'] },
    subclassFeatures: [
      { level: 1, name: 'Arcane Initiate', desc: 'Gain proficiency in the Arcana skill and learn two wizard cantrips.' },
      { level: 6, name: 'Spell Breaker', desc: 'When you restore HP with a 1st-level+ spell, you can also end one spell on the creature whose level is ≤ the slot used.' },
      { level: 8, name: 'Potent Spellcasting', desc: 'Add your WIS mod to cleric cantrip damage.' },
      { level: 17, name: 'Arcane Mastery', desc: 'Choose four spells (one each from 6th/7th/8th/9th level) from the wizard list. They become cleric spells for you, prepared without counting against your cap.' },
    ],
  },
  {
    id: 'ForgeDomain', label: 'Forge Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraToolProficiencies: ["smith's tools"],
    description: 'Shape metal and stone by the will of your deity. Bless weapons and armor with magical properties.',
    channelDivinityDesc: "Artisan's Blessing: Conduct a 1-hour ritual to create a single nonmagical item containing metal (tool, weapon, armor, etc.) worth no more than 100 gp. Metal of equal value must be present (coins, ingots, scrap).",
    subclassSpells: { 1: ['identify', 'searing-smite'], 3: ['magic-weapon'], 5: ['protection-from-energy'], 7: ['wall-of-fire'] },
    subclassFeatures: [
      { level: 1, name: 'Blessing of the Forge', desc: 'After a long rest, touch one nonmagical weapon or suit of armor; it becomes a magic item (+1) until you use this feature again or it leaves your possession.' },
      { level: 6, name: 'Soul of the Forge', desc: 'Resistance to fire damage. While wearing heavy armor, +1 AC.' },
      { level: 8, name: 'Divine Strike', desc: 'Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) fire damage.' },
      { level: 17, name: 'Saint of Forge and Fire', desc: 'Immunity to fire damage. While wearing heavy armor, resistance to bludgeoning, piercing, and slashing from nonmagical attacks.' },
    ],
  },
  {
    id: 'GraveDomain', label: 'Grave Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Stand on the boundary of life and death, marking the line between the two.',
    channelDivinityDesc: "Path to the Grave: As an action, curse one creature within 30 ft until the end of your next turn. The next time you or an ally hits the cursed creature with an attack, that target has vulnerability to all of the attack's damage; the curse then ends.",
    subclassSpells: { 1: ['bane', 'false-life'], 3: ['gentle-repose'], 5: ['revivify', 'vampiric-touch'], 7: ['blight', 'death-ward'], 9: ['raise-dead'] },
    subclassFeatures: [
      { level: 1, name: 'Circle of Mortality', desc: 'Healing spells you cast on a creature at 0 HP use the maximum dice roll. Also learn the Spare the Dying cantrip and cast it as a bonus action at 60 ft.' },
      { level: 1, name: 'Eyes of the Grave', desc: 'As an action, detect undead within 60 ft (knows the location and type but not exact identity). Uses = PB per long rest.' },
      { level: 6, name: 'Sentinel at Death\'s Door', desc: 'When a creature within 30 ft would suffer a critical hit, use your reaction to make it a normal hit instead. Uses = WIS mod (min 1) per long rest.' },
      { level: 8, name: 'Potent Spellcasting', desc: 'Add your WIS mod to cleric cantrip damage.' },
      { level: 17, name: 'Keeper of Souls', desc: 'When a hostile creature dies within 60 ft, one creature you can see (not a construct or undead) regains HP = the dead creature\'s HD value.' },
    ],
  },
  {
    id: 'OrderDomain', label: 'Order Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraWeaponProficiencies: ['martial weapons'],
    extraSkillChoice: { count: 1, options: ['intimidation', 'persuasion'] },
    description: 'Impose order and discipline. Command allies to make extra attacks or force enemies to bow.',
    channelDivinityDesc: "Order's Demand: As an action, each creature of your choice within 30 ft that can see or hear you must make a WIS save (DC 8 + Prof + WIS) or be charmed until the end of your next turn or until damaged. You can also force any number of the charmed creatures to drop what they're holding.",
    subclassSpells: { 1: ['command', 'heroism'], 3: ['hold-person', 'zone-of-truth'], 5: ['mass-healing-word', 'slow'], 9: ['dominate-person'] },
    subclassFeatures: [
      { level: 1, name: "Voice of Authority", desc: "When you cast a 1st-level+ spell targeting an ally, that ally can use their reaction to make one weapon attack against a creature of your choice that you can see." },
      { level: 6, name: "Embodiment of the Law", desc: "If you cast an Enchantment spell of 1st level+, you can use a bonus action (instead of the spell's normal casting time) WIS mod uses per long rest." },
      { level: 8, name: "Divine Strike", desc: "Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) psychic damage." },
      { level: 17, name: "Order's Wrath", desc: "When you use Divine Strike, mark the target. Until the start of your next turn, the next ally who hits it adds 2d8 psychic damage and removes the mark." },
    ],
  },
  {
    id: 'PeaceDomain', label: 'Peace Domain', classId: 'Cleric', unlocksAtLevel: 1,
    description: 'Cultivate harmony and protect companions. Bond allies together so they share the pain of injury.',
    channelDivinityDesc: 'Balm of Peace: As an action, move up to your speed without provoking opportunity attacks. When you move within 5 ft of another creature during this action, you can restore HP to it equal to 2d6 + WIS (minimum 1). Each creature can benefit only once per use.',
    subclassSpells: { 1: ['heroism', 'sanctuary'], 3: ['aid', 'warding-bond'], 7: ['aura-of-purity'], 9: ['greater-restoration'] },
    subclassFeatures: [
      { level: 1, name: "Implement of Peace", desc: "Gain proficiency in the Insight, Performance, or Persuasion skill (your choice)." },
      { level: 1, name: "Emboldening Bond", desc: "After a 1-minute rite, bond up to PB willing creatures (you can be one) for 10 minutes. While bonded creatures are within 30 ft of each other, they can roll 1d4 and add it to one attack, save, or check. Uses = PB per long rest." },
      { level: 6, name: "Protective Bond", desc: "When a bonded creature is about to take damage, another bonded creature within 30 ft can use its reaction to teleport to its space and take the damage instead." },
      { level: 8, name: "Potent Spellcasting", desc: "Add your WIS mod to cleric cantrip damage." },
      { level: 17, name: "Expansive Bond", desc: "Emboldening Bond range increases to 60 ft. Bonded creatures also have resistance to damage taken via Protective Bond." },
    ],
  },
  {
    id: 'TwilightDomain', label: 'Twilight Domain', classId: 'Cleric', unlocksAtLevel: 1,
    extraArmorProficiencies: ['heavy'],
    extraWeaponProficiencies: ['martial weapons'],
    description: 'Guard against the terrors of night. Twilight Sanctuary protects allies in a sphere of dim light.',
    channelDivinityDesc: 'Twilight Sanctuary: As an action, present your holy symbol; a 30-ft-radius sphere of dim light emanates from you for 1 minute (moves with you; ends if you are incapacitated or die). Each creature ending its turn in the sphere gains either 1d6 + cleric level temp HP, or ends one charm/frightened effect on it.',
    darkvisionRange: 300,
    subclassSpells: { 1: ['faerie-fire', 'sleep'], 3: ['moonbeam', 'see-invisibility'], 5: ['aura-of-vitality'], 7: ['greater-invisibility'] },
    subclassFeatures: [
      // TODO: mechanical wiring — Eyes of Night could be modeled as a race-mod-style darkvision override.
      { level: 1, name: "Eyes of Night", desc: "300-ft darkvision (sees through magical darkness). As an action, share this darkvision with up to PB willing creatures for 1 hour (must be within 10 ft). 1/long rest." },
      { level: 1, name: "Vigilant Blessing", desc: "Touch a creature (including yourself) and grant advantage on the next initiative roll, until you use this feature again." },
      { level: 6, name: "Steps of Night", desc: "Magically gain a flying speed = walking speed for 1 minute. Uses = PB per long rest." },
      { level: 8, name: "Divine Strike", desc: "Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) radiant damage." },
      { level: 17, name: "Twilight Shroud", desc: "Creatures of your choice in your Twilight Sanctuary have half cover." },
    ],
  },

  // ── Druid (level 2) ─────────────────────────────────────────────
  { id: 'CircleOfTheLand',     label: 'Circle of the Land',     classId: 'Druid', unlocksAtLevel: 2, description: 'Draw power from a chosen natural environment — arctic, coast, desert, forest, grassland, mountain, swamp, or underdark.',
    subclassFeatures: [
      { level: 2, name: 'Bonus Cantrip', desc: 'Learn one additional druid cantrip.' },
      { level: 2, name: 'Natural Recovery', desc: 'During a short rest, recover spell slots whose total level ≤ half your druid level (round up). No slot can be 6th level or higher. 1/long rest.' },
      { level: 6, name: "Land's Stride", desc: 'Move through non-magical difficult terrain without extra movement. You can pass through non-magical plants without taking damage. Advantage on saves vs magical plants impeding movement.' },
      { level: 10, name: "Nature's Ward", desc: "Can't be charmed or frightened by elementals or fey. Immune to poison and disease." },
      { level: 14, name: "Nature's Sanctuary", desc: 'When a beast or plant creature attacks you, it must succeed on a WIS save (DC 8 + Prof + WIS) or choose a different target.' },
    ] },
  { id: 'CircleOfTheMoon',     label: 'Circle of the Moon',     classId: 'Druid', unlocksAtLevel: 2, description: 'Wild Shape into more powerful beasts with much higher CR limits. Combat Wild Shape as a bonus action.',
    subclassFeatures: [
      { level: 2, name: 'Combat Wild Shape', desc: 'Wild Shape as a bonus action. Spend a bonus action while transformed to regain HP = 1d8 per spell slot expended.' },
      { level: 2, name: 'Circle Forms', desc: 'Wild Shape into beasts with CR up to your druid level / 3 (round down), minimum 1. At level 6, CR limit becomes your druid level / 3.' },
      { level: 6, name: 'Primal Strike', desc: 'Your attacks in beast form count as magical for overcoming resistance and immunity.' },
      { level: 10, name: 'Elemental Wild Shape', desc: 'Expend 2 uses of Wild Shape (instead of 1) to transform into an Air, Earth, Fire, or Water elemental.' },
      { level: 14, name: "Thousand Forms", desc: 'Cast Alter Self at will.' },
    ] },
  { id: 'CircleOfDreams',      label: 'Circle of Dreams',       classId: 'Druid', unlocksAtLevel: 2, description: 'Connected to the Feywild and the power of dream. Heal allies as a bonus action using Balm of the Summer Court.',
    subclassFeatures: [
      { level: 2, name: 'Balm of the Summer Court', desc: 'Have a pool of d6s = your druid level. As a bonus action, choose one creature within 120 ft; spend up to PB dice to restore HP (each die) and grant 1 temp HP (each die). Pool refills on long rest.' },
      { level: 6, name: "Hearth of Moonlight and Shadow", desc: 'During a short or long rest, surround your campsite with a 30-ft sphere of magical concealment (heavy obscurity, +5 to Stealth/Perception checks within).' },
      { level: 10, name: 'Hidden Paths', desc: 'Teleport up to 60 ft to a space you can see as a bonus action, or teleport one willing creature within 30 ft up to 60 ft. Uses = PB per long rest.' },
      { level: 14, name: 'Walker in Dreams', desc: 'After a short rest, cast Dream (targeting yourself), Scrying, or Teleportation Circle without a slot — but Teleportation Circle targets only Feywild locations. 1/long rest.' },
    ] },
  { id: 'CircleOfTheShepherd', label: 'Circle of the Shepherd', classId: 'Druid', unlocksAtLevel: 2, description: 'Speak the language of beasts and summon Spirit Totems to empower summoned creatures.',
    subclassFeatures: [
      { level: 2, name: 'Speech of the Woods', desc: 'Speak Sylvan and converse with beasts (limited intelligence but they can convey meanings).' },
      { level: 2, name: 'Spirit Totem', desc: 'As a bonus action, create a 30-ft aura totem (Bear: temp HP and advantage on STR; Hawk: use reaction to grant advantage on attacks within; Unicorn: detect celestials/fiends and add WIS mod to healing). Lasts 1 minute. Uses = PB per short rest.' },
      { level: 6, name: 'Mighty Summoner', desc: 'Beasts and fey you summon gain +2 HP per HD, and their attacks count as magical.' },
      { level: 10, name: 'Guardian Spirit', desc: 'Beasts/fey summoned by your spells that end their turn in your Spirit Totem aura regain HP = half your druid level.' },
      { level: 14, name: 'Faithful Summons', desc: 'When you are reduced to 0 HP or incapacitated against your will, four spirit beasts (CR 2 or lower) appear within 20 ft to defend you. They obey your commands and remain for 1 hour. 1/long rest.' },
    ] },
  { id: 'CircleOfSpores',      label: 'Circle of Spores',       classId: 'Druid', unlocksAtLevel: 2, description: 'Harness the power of decomposition and growth. Animate dead with fungal spores and deal necrotic damage.',
    subclassFeatures: [
      { level: 2, name: 'Halo of Spores', desc: 'A 10-ft aura of spores surrounds you. When a creature you can see moves into or starts its turn within 10 ft, use your reaction to deal 1d4 (3d4 at lv 6, 5d4 at lv 10, 7d4 at lv 14) necrotic damage (CON save halves).' },
      { level: 2, name: 'Symbiotic Entity', desc: 'Activate symbiotic spores (1/long rest, expend a use of Wild Shape): gain 4× druid level temp HP, melee weapon attacks deal +1d6 necrotic damage, and Halo of Spores damage is doubled. Lasts 10 minutes, ends if HP drops to 0 or you incapacitate it.' },
      { level: 6, name: 'Fungal Infestation', desc: 'When a Small or Medium beast or humanoid dies within 10 ft, use your reaction to animate it as a zombie (CR 1/4). It acts on your initiative and obeys your commands for 1 hour.' },
      { level: 10, name: 'Spreading Spores', desc: 'As a bonus action, throw spores up to 30 ft. They create a 10-ft cube halo effect for 1 minute (deals damage as Halo of Spores at end of each turn while within).' },
      { level: 14, name: 'Fungal Body', desc: 'Immune to being blinded, deafened, frightened, and poisoned. Critical hits against you don\'t deal extra damage.' },
    ] },
  { id: 'CircleOfStars',       label: 'Circle of Stars',        classId: 'Druid', unlocksAtLevel: 2, description: 'Draw power from constellations. Star Map grants bonus spells and three star forms for Wild Shape.',
    subclassFeatures: [
      { level: 2, name: 'Star Map', desc: 'Create a star chart. Learn Guidance cantrip (counts as a druid cantrip), and cast Guiding Bolt without a slot PB times per long rest.' },
      { level: 2, name: 'Starry Form', desc: 'Use Wild Shape (no transformation) to assume a starry form for 10 min. Choose Archer (bonus action ranged spell attack, 1d8+WIS radiant), Chalice (when you cast a healing spell, one ally within 30 ft regains 1d8+WIS HP), or Dragon (treat any d20 of 9 or lower as a 10 for concentration saves and INT/WIS checks).' },
      { level: 6, name: 'Cosmic Omen', desc: 'After a long rest, roll a d6 (or omen die). On even: Weal — use reaction to add 1d6 to nearby ally\'s rolls. On odd: Woe — subtract 1d6 from enemy rolls. PB uses per long rest.' },
      { level: 10, name: 'Twinkling Constellations', desc: 'Archer/Chalice/Dragon improve. You can change starry form choice at the start of each turn. Also gain a flying speed of 20 ft while in starry form.' },
      { level: 14, name: 'Full of Stars', desc: 'While in starry form, gain resistance to bludgeoning, piercing, and slashing damage.' },
    ] },
  { id: 'CircleOfWildfire',    label: 'Circle of Wildfire',     classId: 'Druid', unlocksAtLevel: 2, description: 'Summon a Wildfire Spirit that aids in healing and destruction. Embrace the cycle of destruction and regrowth.',
    subclassFeatures: [
      { level: 2, name: 'Summon Wildfire Spirit', desc: 'Expend a Wild Shape use to summon a Wildfire Spirit (small elemental, scales with druid level). 1-hour duration. Wildfire Teleport: spirit can teleport using its action.' },
      { level: 6, name: 'Enhanced Bond', desc: 'When you cast a fire or healing spell, you can target through your Wildfire Spirit (within 30 ft). Spell damage rolls add +1d8.' },
      { level: 10, name: 'Cauterizing Flames', desc: 'When a Small+ creature dies within 30 ft of you or your spirit, a harmless flame appears for 1 minute. Use a bonus action to channel it: deal 2d10+druid level fire to a creature, or restore HP equally to one creature.' },
      { level: 14, name: 'Blazing Revival', desc: 'When you drop to 0 HP while your Wildfire Spirit is present, the spirit perishes and you regain HP equal to half your max. 1/long rest.' },
    ] },

  // ── Fighter (level 3) ───────────────────────────────────────────
  { id: 'Champion',       label: 'Champion',       classId: 'Fighter', unlocksAtLevel: 3, description: 'Master of martial perfection. Critical hits on 19–20, and later 18–20. Exceptional Athletics at higher levels.',
    subclassFeatures: [
      // TODO: mechanical wiring — Improved/Superior Critical extends crit threshold; consumers in computeAttackBonus / damage computation should treat crits on 19-20 (lv 3) and 18-20 (lv 15).
      { level: 3, name: 'Improved Critical', desc: 'Your weapon attacks score a critical hit on a roll of 19 or 20.' },
      { level: 7, name: 'Remarkable Athlete', desc: "Add half your proficiency bonus (round up) to any STR, DEX, or CON check that doesn't already include your proficiency bonus. Long jump distance increases by your STR mod (feet) when you move at least 10 ft on foot." },
      { level: 10, name: 'Additional Fighting Style', desc: 'Choose a second option from the Fighting Style class feature.' },
      { level: 15, name: 'Superior Critical', desc: 'Your weapon attacks score a critical hit on a roll of 18, 19, or 20.' },
      { level: 18, name: 'Survivor', desc: 'At the start of each of your turns, regain HP = 5 + your CON mod if you have no more than half your HP left. No effect if you have 0 HP.' },
    ] },
  { id: 'BattleMaster',   label: 'Battle Master',  classId: 'Fighter', unlocksAtLevel: 3, description: 'Learn combat maneuvers that use Superiority Dice. Control the battlefield with trips, disarms, and feints.',
    subclassFeatures: [
      // Maneuvers are selected here; Superiority Dice are tracked as a short-rest resource.
      { level: 3, name: 'Combat Superiority', desc: 'Gain 4 Superiority Dice (d8) and learn 3 maneuvers. Maneuver save DC = 8 + Prof + STR or DEX (your choice).' },
      { level: 3, name: 'Student of War', desc: "Gain proficiency with one type of artisan's tools of your choice." },
      { level: 7, name: 'Know Your Enemy', desc: 'Study a creature for 1 minute outside combat: learn how its STR, DEX, CON, AC, current HP, total class levels (if any), and fighter class levels compare to yours (2 of these).' },
      { level: 10, name: 'Improved Combat Superiority', desc: 'Superiority Dice become d10s (d12s at level 18). Learn 2 more maneuvers and gain 1 additional die (5 total).' },
      { level: 15, name: 'Relentless', desc: 'When you roll initiative and have no superiority dice, regain 1.' },
      { level: 18, name: 'Improved Combat Superiority', desc: 'Superiority Dice become d12s.' },
    ] },
  { id: 'EldritchKnight', label: 'Eldritch Knight', classId: 'Fighter', unlocksAtLevel: 3, spellcastingAbility: 'int', spellListClassId: 'Wizard', spellsKnownTable: { 3:3, 4:4, 7:5, 8:6, 10:7, 11:8, 13:9, 14:10, 16:11, 19:12, 20:13 }, cantripsKnownTable: { 3:2, 10:3 }, description: 'Blend martial prowess with arcane magic. Cast wizard spells and bind a weapon to your soul.',
    subclassFeatures: [
      { level: 3, name: 'Spellcasting', desc: 'Cast wizard spells (Abjuration and Evocation; other schools at levels 8/14/20). Use INT as your spellcasting ability.' },
      { level: 3, name: 'Weapon Bond', desc: 'After a 1-hour ritual, bond up to 2 weapons. You can summon a bonded weapon as a bonus action; can\'t be disarmed of it unless incapacitated.' },
      // TODO: mechanical wiring — War Magic and Improved War Magic add a bonus-action weapon attack when you cast a cantrip/spell.
      { level: 7, name: 'War Magic', desc: 'When you take the Attack action and cast a cantrip, you can make one weapon attack as a bonus action.' },
      { level: 10, name: 'Eldritch Strike', desc: 'When you hit a creature with a weapon attack, it has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.' },
      { level: 15, name: 'Arcane Charge', desc: 'When you use Action Surge, you can also teleport up to 30 ft to an unoccupied space you can see.' },
      { level: 18, name: 'Improved War Magic', desc: 'When you take the Attack action and cast a 1st-level+ spell, you can make one weapon attack as a bonus action.' },
    ] },
  { id: 'ArcaneArcher',   label: 'Arcane Archer',  classId: 'Fighter', unlocksAtLevel: 3, arcaneShotAbility: 'int', description: 'Infuse arrows with magic effects — banishing, curving shots, grasping vines, and more.',
    subclassFeatures: [
      { level: 3, name: 'Arcane Archer Lore', desc: 'Gain proficiency in Arcana or Nature, and learn the Prestidigitation or Druidcraft cantrip.' },
      { level: 3, name: 'Arcane Shot', desc: 'Learn 2 Arcane Shot options. Once per turn when you fire an arrow from a shortbow or longbow as part of the Attack action, apply one Arcane Shot effect. Uses = 2 per short rest. Save DC = 8 + Prof + INT.' },
      { level: 7, name: 'Curving Shot', desc: 'When you make a magic arrow attack roll that misses, use a bonus action to reroll the attack against a different target within 60 ft of the original.' },
      { level: 7, name: 'Magic Arrow', desc: 'Whenever you fire a non-magical arrow from a shortbow or longbow, you can make it magical for the purpose of overcoming resistance and immunity.' },
      { level: 10, name: 'Arcane Shot Options', desc: 'Learn 2 more Arcane Shot options. Damage of each option increases.' },
      { level: 15, name: 'Ever-Ready Shot', desc: 'If you roll initiative with no Arcane Shot uses remaining, you regain 1.' },
      { level: 18, name: 'Arcane Shot Mastery', desc: 'Learn 2 final Arcane Shot options; damage of each option increases further.' },
    ] },
  { id: 'Cavalier',       label: 'Cavalier',        classId: 'Fighter', unlocksAtLevel: 3, description: 'Excel at mounted combat. Protect your mount, make opportunity attacks without a reaction, and mark enemies.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiency', desc: 'Gain proficiency in one of: Animal Handling, History, Insight, Performance, Persuasion — or one language of your choice.' },
      // TODO: mechanical wiring — Unwavering Mark grants OA bonuses and a free attack as a bonus action.
      { level: 3, name: 'Born to the Saddle', desc: 'Advantage on saves to avoid falling off your mount. Mounting/dismounting costs 5 ft of movement (instead of half your speed). Land safely from a fall if you can land on your feet.' },
      { level: 3, name: 'Unwavering Mark', desc: 'When you hit a creature with a melee weapon attack, mark it until the end of your next turn. The marked creature has disadvantage on attacks against anyone but you, and you can make a special bonus-action attack against it on your next turn (PB times per long rest).' },
      { level: 7, name: 'Warding Maneuver', desc: 'When a creature you can see attacks an ally within 5 ft of you, use your reaction to add 1d8 to the target\'s AC against that attack. Uses = CON mod per long rest.' },
      { level: 10, name: 'Hold the Line', desc: 'Creatures provoke an OA from you when they move 5 ft or more while within your reach. Hitting a creature with an OA reduces its speed to 0 for the rest of the turn.' },
      { level: 15, name: 'Ferocious Charger', desc: 'If you move at least 10 ft straight toward a target and hit it with a melee attack on the same turn, the target makes a STR save or is knocked prone. Once per turn.' },
      { level: 18, name: 'Vigilant Defender', desc: 'You can make an OA on every creature\'s turn (except yours) when an opportunity is triggered, instead of being limited to your reaction.' },
    ] },
  { id: 'Samurai',        label: 'Samurai',         classId: 'Fighter', unlocksAtLevel: 3, description: 'Draw on an indomitable fighting spirit. Fighting Spirit grants advantage and temp HP, persisting through Relentless.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiency', desc: 'Gain proficiency in one of: History, Insight, Performance, Persuasion — or one language of your choice.' },
      { level: 3, name: 'Fighting Spirit', desc: 'As a bonus action, gain advantage on weapon attack rolls until the end of your current turn, plus 5 temp HP (10 at lv 10, 15 at lv 15). Uses = 3 per long rest.' },
      { level: 7, name: 'Elegant Courtier', desc: 'Add your WIS mod to CHA (Persuasion) checks. Also gain proficiency in WIS saving throws (or one of INT/CHA if you already have WIS).' },
      { level: 10, name: 'Tireless Spirit', desc: 'When you roll initiative with no Fighting Spirit uses remaining, regain 1.' },
      { level: 15, name: 'Rapid Strike', desc: 'If you have advantage on a weapon attack against a creature on your turn, forgo the advantage to make one additional weapon attack against that creature.' },
      { level: 18, name: 'Strength Before Death', desc: 'When you take damage that would reduce you to 0 HP, use your reaction to delay falling unconscious and take an extra turn immediately. 1/long rest.' },
    ] },
  { id: 'PsiWarrior',     label: 'Psi Warrior',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Augment attacks and defenses with psionic energy. Telekinetically move creatures and protect allies.',
    subclassFeatures: [
      { level: 3, name: 'Psionic Power', desc: 'Gain a pool of Psionic Energy Dice (PB+2 dice, starting d6). Regain all on a long rest, or one on a short rest.' },
      { level: 3, name: 'Protective Field', desc: 'When you or a creature you can see within 30 ft takes damage, use your reaction to spend one die to reduce the damage by 1d6 + INT mod.' },
      { level: 3, name: 'Psionic Strike', desc: 'When you hit a creature within 30 ft with a weapon attack, spend one die to deal extra force damage = 1d6 + INT mod. 1/turn.' },
      { level: 3, name: 'Telekinetic Movement', desc: 'As an action, telekinetically move a Large or smaller object or willing creature within 30 ft up to 30 ft. Recharges after a short or long rest.' },
      { level: 7, name: 'Telekinetic Adept', desc: 'Psionic Strike die becomes d8. Learn Psi-Powered Leap (bonus action, flying speed twice walking until end of turn) and Telekinetic Thrust (force STR save on Psionic Strike target — prone or push 10 ft).' },
      { level: 10, name: 'Guarded Mind', desc: 'Resistance to psychic damage. If you start your turn charmed or frightened, spend one die to end all such effects on yourself.' },
      { level: 15, name: 'Bulwark of Force', desc: 'As a bonus action, choose up to PB creatures within 30 ft (including you). Each gains half cover for 1 minute (concentration). 1/long rest, or spend one die.' },
      { level: 18, name: 'Telekinetic Master', desc: 'Cast Telekinesis without expending a slot, concentrating on it for up to 10 minutes. Psionic Strike die becomes d12.' },
    ] },
  { id: 'RuneKnight',     label: 'Rune Knight',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Carve magical runes onto your equipment, granting powerful benefits and the ability to grow Giant-sized.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: "Gain proficiency with smith's tools and learn Giant language." },
      { level: 3, name: 'Rune Carver', desc: 'Learn 2 runes (Cloud, Fire, Frost, Stone, Hill, or Storm). Inscribe runes on weapons/armor/jewelry; each grants a passive bonus and a once-per-rest invocation.' },
      { level: 3, name: "Giant's Might", desc: 'As a bonus action, grow Large for 1 minute: advantage on STR checks/saves, +1d6 to weapon damage, your weapons grow with you. Uses = PB per long rest.' },
      { level: 7, name: 'Runic Shield', desc: 'When another creature you can see within 60 ft is hit by an attack, use a reaction to force the attacker to reroll the d20. Uses = PB per long rest.' },
      { level: 10, name: 'Great Stature', desc: "Giant's Might damage bonus increases to 1d8. Permanently grow by 3d4 inches." },
      { level: 15, name: 'Master of Runes', desc: 'Invoke each rune twice between rests.' },
      { level: 18, name: 'Runic Juggernaut', desc: "Giant's Might damage bonus is 1d10 and you grow to Huge size. Reach increases by 5 ft." },
    ] },
  { id: 'EchoKnight',     label: 'Echo Knight',    classId: 'Fighter', unlocksAtLevel: 3, description: 'Manifest an echo of yourself from an unknown past. Swap positions with your echo or attack through it.',
    subclassFeatures: [
      { level: 3, name: 'Manifest Echo', desc: 'As a bonus action, manifest a translucent duplicate within 15 ft (AC 14 + Prof, 1 HP). You can swap places, attack through it as if you were in its space, or take other actions via it. Lasts until destroyed or dismissed.' },
      { level: 3, name: 'Unleash Incarnation', desc: 'Once per turn, when you take the Attack action, make an additional melee attack from your echo\'s space. Uses = CON mod per long rest.' },
      { level: 7, name: 'Echo Avatar', desc: 'As an action, see through your echo\'s senses for up to 10 minutes. The echo can travel up to 1,000 ft from you during this time.' },
      { level: 10, name: 'Shadow Martyr', desc: 'Before an attack roll is made against a target within 5 ft of your echo, use a reaction to make the echo intercept — your echo is targeted instead and immediately destroyed if hit. 1/short rest.' },
      { level: 15, name: 'Reclaim Potential', desc: 'When your echo is destroyed by taking damage, gain 2d6 + CON mod temp HP. PB times per long rest.' },
      { level: 18, name: 'Legion of One', desc: 'Manifest two echoes at a time (each as the standard echo). Also, if you start your turn with no remaining Unleash Incarnation uses, regain 1.' },
    ] },

  // ── Monk (level 3) ──────────────────────────────────────────────
  { id: 'OpenHand',      label: 'Way of the Open Hand',      classId: 'Monk', unlocksAtLevel: 3, description: 'Master unarmed combat. After a Flurry of Blows, knock prone, push, or deny reactions.',
    subclassFeatures: [
      { level: 3, name: 'Open Hand Technique', desc: 'When you hit with a Flurry of Blows attack, impose one effect: target makes DEX save or knocked prone; STR save or pushed 15 ft; or can\'t take reactions until end of your next turn.' },
      { level: 6, name: 'Wholeness of Body', desc: 'As an action, regain HP = 3× your monk level. 1/long rest.' },
      { level: 11, name: 'Tranquility', desc: 'At the end of a long rest, gain a Sanctuary-like effect (hostile creatures must WIS save to target you). Lasts until you make an attack or cast a damaging spell, or until your next long rest.' },
      { level: 17, name: 'Quivering Palm', desc: 'When you hit with an unarmed strike, spend 3 ki to start vibrations. Use an action later to end them: target makes CON save or drops to 0 HP. On success, takes 10d10 necrotic damage.' },
    ] },
  { id: 'Shadow',        label: 'Way of Shadow',             classId: 'Monk', unlocksAtLevel: 3, description: 'Embrace the shadows. Cast shadow magic, teleport between dim areas, and silence a zone around you.',
    subclassFeatures: [
      { level: 3, name: 'Shadow Arts', desc: 'Spend 2 ki to cast: Darkness, Darkvision, Pass Without Trace, or Silence (no material components). Also learn the Minor Illusion cantrip.' },
      { level: 6, name: 'Shadow Step', desc: 'When in dim light or darkness, use a bonus action to teleport up to 60 ft to another dim/dark space. Advantage on the first melee attack you make before the end of the turn.' },
      { level: 11, name: 'Cloak of Shadows', desc: 'In dim light or darkness, use an action to become invisible until you attack, cast a spell, or are in bright light.' },
      { level: 17, name: 'Opportunist', desc: 'When a creature within 5 ft is hit by an attack from another creature, use your reaction to make a melee attack against that creature.' },
    ] },
  { id: 'FourElements',  label: 'Way of the Four Elements',  classId: 'Monk', unlocksAtLevel: 3, description: 'Harness elemental disciplines — fire, water, earth, or air — spending Ki to cast elemental spells.',
    subclassFeatures: [
      { level: 3, name: 'Disciple of the Elements', desc: 'Learn Elemental Attunement cantrip-equivalent and one elemental discipline. Spend ki to cast elemental spells. Learn additional disciplines at levels 6, 11, 17.' },
      { level: 6, name: 'Additional Discipline', desc: 'Learn one more elemental discipline.' },
      { level: 11, name: 'Additional Discipline', desc: 'Learn one more elemental discipline.' },
      { level: 17, name: 'Additional Discipline', desc: 'Learn one more elemental discipline. Ki cost cap reaches the slot level of an effective 5th-level spell.' },
    ] },
  { id: 'SunSoul',       label: 'Way of the Sun Soul',       classId: 'Monk', unlocksAtLevel: 3, description: 'Channel inner light into searing bolts. Radiant Sun Bolt and Searing Arc Strike allow ranged Ki attacks.',
    subclassFeatures: [
      { level: 3, name: 'Radiant Sun Bolt', desc: 'Make a ranged spell attack (30 ft) as your action — deals 1d4 + DEX radiant damage (uses martial-arts die). Counts as monk weapon attacks; use bonus action / ki for Flurry of Bolts.' },
      { level: 6, name: 'Searing Arc Strike', desc: 'Immediately after Attack action, spend 2+ ki to cast Burning Hands as a bonus action (increases by 1 die per additional ki spent, max monk level / 2).' },
      { level: 11, name: 'Searing Sunburst', desc: 'As an action, create a 20-ft radius sphere of radiant light within 150 ft. CON save or 2d6 radiant damage. Spend up to 3 ki for +2d6 each.' },
      { level: 17, name: 'Sun Shield', desc: 'Glow with sunlight (10 ft bright, 10 ft dim). Add WIS mod (min 1) radiant damage to melee weapon attacks. When a creature within 5 ft hits you with melee, use a reaction to deal 5 + WIS radiant damage to it.' },
    ] },
  { id: 'DrunkenMaster', label: 'Way of the Drunken Master', classId: 'Monk', unlocksAtLevel: 3, description: 'Fight with the unpredictable style of a drunkard. Redirect attacks and move freely through enemies.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: "Gain proficiency in Performance and brewer's supplies." },
      { level: 3, name: 'Drunken Technique', desc: 'When you use Flurry of Blows, gain Disengage benefits and +10 ft to walking speed until end of turn.' },
      { level: 6, name: 'Tipsy Sway', desc: 'Leap to Your Feet (stand from prone with 5 ft of movement). Redirect Attack: when a creature misses you with a melee attack, spend 1 ki to redirect it as a reaction to another creature within 5 ft.' },
      { level: 11, name: 'Drunkard\'s Luck', desc: 'Spend 2 ki to cancel disadvantage on an ability check, attack roll, or save you\'re about to make.' },
      { level: 17, name: 'Intoxicated Frenzy', desc: 'When you Flurry of Blows, make 3 additional attacks (5 total) if each hits a different creature.' },
    ] },
  { id: 'Kensei',        label: 'Way of the Kensei',         classId: 'Monk', unlocksAtLevel: 3, description: 'Treat chosen weapons as monk weapons. Use Ki to boost accuracy and add d4 damage or deflect ranged attacks.',
    subclassFeatures: [
      { level: 3, name: 'Path of the Kensei', desc: 'Choose 2 weapons (martial melee or ranged) as kensei weapons. They count as monk weapons. Gain Agile Parry (+2 AC vs melee until next turn after unarmed strike), Kensei\'s Shot (bonus action +1d4 damage on ranged), and Way of the Brush (calligrapher\'s/painter\'s supplies).' },
      { level: 6, name: 'One with the Blade', desc: 'Kensei weapons count as magical. Spend 1 ki when you hit with a melee kensei weapon to deal extra damage = your martial arts die.' },
      { level: 11, name: 'Sharpen the Blade', desc: 'As a bonus action, spend up to 3 ki to grant a kensei weapon a magical bonus to attack and damage rolls = ki spent. Lasts 1 minute.' },
      { level: 17, name: 'Unerring Accuracy', desc: 'If you miss with a monk weapon attack on your turn, reroll the attack once. 1/turn.' },
    ] },
  { id: 'Mercy',         label: 'Way of Mercy',              classId: 'Monk', unlocksAtLevel: 3, description: 'Heal with touch or deal necrotic damage with the same hands. Implements of Mercy allow removing conditions.',
    subclassFeatures: [
      { level: 3, name: 'Implements of Mercy', desc: "Gain proficiency in Insight, Medicine, and the herbalism kit." },
      { level: 3, name: 'Hand of Healing', desc: 'As an action, spend 1 ki to restore HP = your martial arts die + WIS mod. As part of Flurry of Blows, replace one attack with this healing (no extra ki).' },
      { level: 3, name: 'Hand of Harm', desc: 'When you hit with an unarmed strike, spend 1 ki to deal extra necrotic damage = your martial arts die + WIS mod. 1/turn.' },
      { level: 6, name: 'Physician\'s Touch', desc: 'When using Hand of Healing, also end one disease or condition (blinded, deafened, paralyzed, poisoned, stunned). When using Hand of Harm, target makes CON save or is poisoned until end of your next turn.' },
      { level: 11, name: 'Flurry of Healing and Harm', desc: 'During Flurry of Blows, replace each attack with Hand of Healing without spending ki for the Healing component.' },
      { level: 17, name: 'Hand of Mercy', desc: 'As an action, spend 5 ki to touch a creature (CON save) and reduce it to 0 HP (or 1 HP on success). Doesn\'t work on constructs/undead.' },
    ] },
  { id: 'AstralSelf',    label: 'Way of the Astral Self',    classId: 'Monk', unlocksAtLevel: 3, description: 'Manifest your astral form to gain extra arms, a visage of terror, and a body of spirit.',
    subclassFeatures: [
      { level: 3, name: 'Arms of the Astral Self', desc: 'As a bonus action, spend 1 ki to manifest spectral arms for 10 minutes. They reach 5 ft beyond your normal reach, use WIS for STR/DEX checks (your choice), and unarmed strikes through them use WIS for atk/dmg and deal force damage = your martial arts die. Bonus-action unarmed strike with both arms when you take Attack.' },
      { level: 6, name: 'Visage of the Astral Self', desc: 'As a bonus action, spend 1 ki to manifest your astral visage for 10 min (or part of Astral Self manifestation). Astral Sight (120 ft darkvision through magical darkness), Awakened Mind (telepathy 600 ft), and Word of Power (intimidation/persuasion advantage with WIS).' },
      { level: 11, name: 'Body of the Astral Self', desc: 'Spend 1 ki to manifest your astral body. Deflective Power (reduce attack damage), Empowered Arms (extra force damage 1/turn).' },
      { level: 17, name: 'Awakened Astral Self', desc: 'Spend 5 ki as bonus action to manifest full Astral Self for 10 min: +2 AC, extra arm attacks count as one additional Attack, gain magical resistance.' },
    ] },

  // ── Paladin (level 3) ───────────────────────────────────────────
  { id: 'OathOfDevotion',    label: 'Oath of Devotion',    classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['sanctuary'], 5: ['lesser-restoration', 'zone-of-truth'], 9: ['dispel-magic'], 13: ['freedom-of-movement'], 17: ['flame-strike'] },
    description: 'Uphold justice and virtue. Sacred Weapon and Turn the Unholy on your Sacred Oath.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Sacred Weapon', desc: 'As an action, imbue one weapon you hold with positive energy for 1 minute: add CHA mod (min +1) to attack rolls, weapon sheds bright light in 20 ft + dim 20 ft.' },
      { level: 3, name: 'Channel Divinity: Turn the Unholy', desc: 'As an action, force each fiend or undead within 30 ft to make a WIS save (DC = your spell save) or be turned for 1 minute.' },
      { level: 7, name: 'Aura of Devotion', desc: 'You and friendly creatures within 10 ft can\'t be charmed while you\'re conscious (30 ft at level 18).' },
      { level: 15, name: 'Purity of Spirit', desc: 'Always under the effects of a Protection from Evil and Good spell.' },
      { level: 20, name: 'Holy Nimbus', desc: 'As an action, emanate aura of sunlight (30 ft, bright) for 1 minute. Enemies in the aura take 10 radiant damage at the end of each of their turns. You have advantage on saves vs spells cast by fiends and undead. 1/long rest.' },
    ] },
  { id: 'OathOfTheAncients', label: 'Oath of the Ancients', classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 5: ['misty-step', 'moonbeam'], 9: ['plant-growth', 'protection-from-energy'], 13: ['ice-storm', 'stoneskin'] },
    description: 'Defend the light and life of the natural world. Nature\'s Wrath and Turn the Faithless.',
    subclassFeatures: [
      { level: 3, name: "Channel Divinity: Nature's Wrath", desc: 'As an action, spectral vines erupt around one creature within 10 ft (STR or DEX save) — the target is restrained until it succeeds on a save at the end of its turn.' },
      { level: 3, name: 'Channel Divinity: Turn the Faithless', desc: 'As an action, force each fey and fiend within 30 ft to make a WIS save or be turned for 1 minute.' },
      { level: 7, name: 'Aura of Warding', desc: 'You and friendly creatures within 10 ft have resistance to spell damage (30 ft at level 18).' },
      { level: 15, name: 'Undying Sentinel', desc: 'When reduced to 0 HP (and not killed outright), drop to 1 HP instead. 1/long rest. Also: you no longer age.' },
      { level: 20, name: 'Elder Champion', desc: 'As an action, assume a primal form for 1 minute: regenerate 10 HP/turn, cast paladin spells as bonus actions, and enemies within 10 ft have disadvantage on saves vs your spells and Channel Divinity. 1/long rest.' },
    ] },
  { id: 'OathOfVengeance',   label: 'Oath of Vengeance',   classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['bane', 'hunter-s-mark'], 5: ['hold-person', 'misty-step'], 9: ['haste', 'protection-from-energy'], 13: ['banishment', 'dimension-door'], 17: ['hold-monster'] },
    description: 'Pursue evil relentlessly. Vow of Enmity grants advantage; Abjure Enemy incapacitates a target.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Abjure Enemy', desc: 'As an action, choose a creature within 60 ft. WIS save or frightened for 1 minute, speed 0. On success: speed halved (no fear).' },
      { level: 3, name: 'Channel Divinity: Vow of Enmity', desc: 'As a bonus action, target a creature within 10 ft. You have advantage on attack rolls against it for 1 minute (or until it drops to 0 HP / falls unconscious).' },
      { level: 7, name: 'Relentless Avenger', desc: 'When you hit with an opportunity attack, move up to half your speed (doesn\'t provoke OAs) as part of the same reaction.' },
      { level: 15, name: 'Soul of Vengeance', desc: 'When a creature affected by your Vow of Enmity makes an attack, use your reaction to make one melee attack against that creature.' },
      { level: 20, name: 'Avenging Angel', desc: 'As an action, sprout 10-ft glowing wings; gain a flying speed of 60 ft, an aura of menace (30 ft, WIS save vs frightened — failure: 1 minute, takes 4d10 psychic on hit). 1/long rest.' },
    ] },
  { id: 'OathOfConquest',    label: 'Oath of Conquest',    classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['armor-of-agathys', 'command'], 5: ['hold-person', 'spiritual-weapon'], 9: ['fear'], 13: ['stoneskin'], 17: ['cloudkill', 'dominate-person'] },
    description: 'Strike fear into enemies and hold ground at all costs. Conquering Presence frightens multiple foes.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Conquering Presence', desc: 'As an action, each creature of your choice within 30 ft makes a WIS save or is frightened for 1 minute.' },
      { level: 3, name: 'Channel Divinity: Guided Strike', desc: 'When you make an attack roll, use Channel Divinity to gain +10 to the roll (before or after roll, but before outcome).' },
      { level: 7, name: 'Aura of Conquest', desc: 'Frightened creatures within 10 ft (30 ft at level 18) have speed 0 and take psychic damage = half paladin level when they start their turn in the aura.' },
      { level: 15, name: 'Scornful Rebuke', desc: 'Creatures take psychic damage = your CHA mod (min 1) whenever they hit you with an attack.' },
      { level: 20, name: 'Invincible Conqueror', desc: 'As an action for 1 minute: resistance to all damage, one additional attack on Attack action, and crits on 19-20. 1/long rest.' },
    ] },
  { id: 'OathOfRedemption',  label: 'Oath of Redemption',  classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['sanctuary', 'sleep'], 5: ['hold-person'], 9: ['counterspell', 'hypnotic-pattern'], 13: ['stoneskin'], 17: ['hold-monster', 'wall-of-force'] },
    description: 'Seek redemption for the lost. Emissary of Peace and Rebuke the Violent use words before violence.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Emissary of Peace', desc: 'As a bonus action, grant yourself +5 to CHA (Persuasion) checks for 10 minutes.' },
      { level: 3, name: 'Channel Divinity: Rebuke the Violent', desc: 'When an attacker within 30 ft deals damage to a creature other than you, use your reaction to force CON save: damage rebounded on attacker (half on success).' },
      { level: 7, name: 'Aura of the Guardian', desc: 'When a creature within 10 ft (30 ft at level 18) takes damage, use your reaction to take the damage instead.' },
      { level: 15, name: 'Protective Spirit', desc: 'Regain HP = 1d6 + half paladin level at the start of your turn if below half HP and not incapacitated.' },
      { level: 20, name: 'Emissary of Redemption', desc: 'Permanent resistance to damage from creatures and immunity to charm. When a creature damages you, it takes equal radiant damage (you don\'t take retaliation damage if you don\'t fight back).' },
    ] },
  { id: 'OathOfGlory',       label: 'Oath of Glory',       classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['guiding-bolt', 'heroism'], 5: ['magic-weapon'], 9: ['haste', 'protection-from-energy'], 13: ['freedom-of-movement'], 17: ['flame-strike'] },
    description: 'Inspire others to great deeds. Peerless Athlete and Inspiring Smite enhance yourself and your allies.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Peerless Athlete', desc: 'As a bonus action, advantage on STR (Athletics) and DEX (Acrobatics) checks for 10 minutes. Carry/push/drag double weight, +10 ft jumps.' },
      { level: 3, name: 'Channel Divinity: Inspiring Smite', desc: 'After you deal damage with Divine Smite, distribute 2d8 + half paladin level temp HP among creatures of your choice within 30 ft.' },
      { level: 7, name: 'Aura of Alacrity', desc: 'Your speed +10 ft. When an ally enters your 5-ft aura (10-ft at level 18), their speed +10 ft until end of their next turn.' },
      { level: 15, name: 'Glorious Defense', desc: 'When you or an ally within 10 ft is hit by an attack, use your reaction to add CHA mod (min +1) to AC vs that attack; if it misses, the attacker takes weapon damage.' },
      { level: 20, name: 'Living Legend', desc: 'For 1 minute: charisma (Persuasion/Deception/etc.) become your strongest features (advantage). Smite as automatic (reroll once if 1). Once per turn, ignore one missed attack and treat as a hit. 1/long rest.' },
    ] },
  { id: 'OathOfTheWatchers', label: 'Oath of the Watchers', classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['detect-magic'], 5: ['moonbeam', 'see-invisibility'], 9: ['counterspell'], 13: ['aura-of-purity', 'banishment'], 17: ['hold-monster'] },
    description: 'Guard mortals from extraplanar threats. Abjure the Extraplanar turns aberrations, celestials, elementals, fey, and fiends.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Watcher\'s Will', desc: 'As an action, choose up to CHA mod (min 1) creatures within 30 ft. Each has advantage on INT/WIS/CHA saves for 1 minute.' },
      { level: 3, name: 'Channel Divinity: Abjure the Extraplanar', desc: 'As an action, force each aberration, celestial, elemental, fey, or fiend within 30 ft to make a WIS save or be turned for 1 minute.' },
      { level: 7, name: 'Aura of the Sentinel', desc: 'You and allies within 10 ft (30 ft at level 18) gain a bonus to initiative equal to your PB.' },
      { level: 15, name: 'Vigilant Rebuke', desc: 'When you or a creature within 30 ft succeeds on an INT/WIS/CHA save, use your reaction to deal 2d8 + CHA force damage to the offender.' },
      { level: 20, name: 'Mortal Bulwark', desc: 'As a bonus action for 1 minute: truesight 120 ft, advantage on attack vs aberrations/celestials/elementals/fey/fiends, attacks force CHA save or banishment on hit. 1/long rest.' },
    ] },
  { id: 'Oathbreaker',       label: 'Oathbreaker',         classId: 'Paladin', unlocksAtLevel: 3,
    subclassSpells: { 3: ['hellish-rebuke', 'inflict-wounds'], 5: ['darkness'], 9: ['animate-dead'], 13: ['blight', 'confusion'], 17: ['dominate-person'] },
    description: 'Fell to darkness and broke your sacred oath. Command the undead and use dark spells of corruption.',
    subclassFeatures: [
      { level: 3, name: 'Channel Divinity: Control Undead', desc: 'As an action, target an undead creature within 30 ft (CHA or CR ≤ your paladin level / 3, rounds down). WIS save or charmed for 24 hours. Issues mental commands.' },
      { level: 3, name: 'Channel Divinity: Dreadful Aspect', desc: 'As an action, each creature of your choice within 30 ft makes a WIS save or is frightened for 1 minute.' },
      { level: 7, name: 'Aura of Hate', desc: 'You, fiends, and undead within 10 ft (30 ft at level 18) add your CHA mod to the damage of melee weapon attacks.' },
      { level: 15, name: 'Supernatural Resistance', desc: 'Resistance to bludgeoning, piercing, and slashing damage from non-magical attacks.' },
      { level: 20, name: 'Dread Lord', desc: 'As an action, become a beacon of hatred for 1 minute. 30-ft shadow aura: enemies in dim light, take 4d10 psychic on hit, must save vs your spells with disadvantage. 1/long rest.' },
    ] },

  // ── Ranger (level 3) ────────────────────────────────────────────
  { id: 'Hunter',        label: 'Hunter',        classId: 'Ranger', unlocksAtLevel: 3, description: 'Specialize in hunting specific prey. Choose Hunter\'s Prey (Colossus Slayer, Giant Killer, Horde Breaker) at level 3.',
    subclassFeatures: [
      { level: 3, name: "Hunter's Prey", desc: 'Choose: Colossus Slayer (1/turn +1d8 to damage on a creature below max HP), Giant Killer (reaction attack on Large+ creature that misses you), or Horde Breaker (1/turn, additional weapon attack against a different creature within 5 ft of the first target).' },
      { level: 7, name: 'Defensive Tactics', desc: 'Choose: Escape the Horde (OAs against you have disadvantage), Multiattack Defense (when a creature hits you, +4 AC vs its further attacks this turn), or Steel Will (advantage on saves vs frightened).' },
      { level: 11, name: 'Multiattack', desc: 'Choose: Volley (ranged attack against any number of creatures in a 10-ft cube within range) or Whirlwind Attack (melee attack vs any number of creatures within 5 ft).' },
      { level: 15, name: "Superior Hunter's Defense", desc: 'Choose: Evasion (DEX save for half damage becomes no damage on success), Stand Against the Tide (when a creature within reach misses, redirect attack to another), or Uncanny Dodge (reaction halves damage from one attack).' },
    ] },
  { id: 'BeastMaster',   label: 'Beast Master',  classId: 'Ranger', unlocksAtLevel: 3, description: 'Bond with a beast companion that fights alongside you, following your commands in combat.',
    subclassFeatures: [
      { level: 3, name: "Ranger's Companion", desc: 'Bond with a beast (CR 1/4 or lower, no flying speed >30 ft). It acts on your initiative, adds your PB to its AC/attacks/damage/saves/skills. Use your action to command it (Attack/Dash/Disengage/Dodge/Help).' },
      { level: 7, name: 'Exceptional Training', desc: 'On any turn your beast doesn\'t attack, command it to take Dash/Disengage/Dodge/Help as a bonus action. Its attacks count as magical.' },
      { level: 11, name: "Bestial Fury", desc: 'When you command your beast to take the Attack action, it can make 2 attacks.' },
      { level: 15, name: 'Share Spells', desc: 'When you cast a spell targeting yourself, you can also affect your beast if within 30 ft.' },
    ] },
  { id: 'GloomStalker',  label: 'Gloom Stalker', classId: 'Ranger', unlocksAtLevel: 3, description: 'Ambush predator of the dark. Invisible to darkvision, extra attack on first round, bonus initiative.',
    subclassFeatures: [
      { level: 3, name: 'Dread Ambusher', desc: '+10 ft speed on first turn of combat, and an additional attack on the first round dealing +1d8 weapon damage. +WIS mod to initiative.' },
      { level: 3, name: 'Umbral Sight', desc: 'Darkvision 60 ft (or +30 ft if you already have it). While in darkness, invisible to creatures relying on darkvision to see you.' },
      { level: 7, name: 'Iron Mind', desc: 'Gain proficiency in WIS saves (or INT/CHA if you already have it).' },
      { level: 11, name: 'Stalker\'s Flurry', desc: 'Once per turn when you miss with a weapon attack, you can make another weapon attack as part of the same action.' },
      { level: 15, name: 'Shadowy Dodge', desc: 'When a creature you can see attacks you, use your reaction to impose disadvantage on the attack.' },
    ] },
  { id: 'HorizonWalker', label: 'Horizon Walker', classId: 'Ranger', unlocksAtLevel: 3, description: 'Guard the borders between planes. Deal radiant damage and teleport as a bonus action.',
    subclassFeatures: [
      { level: 3, name: 'Detect Portal', desc: 'As an action, detect the location and direction of the nearest planar portal within 1 mile. 1/short rest.' },
      { level: 3, name: 'Planar Warrior', desc: 'As a bonus action, mark one creature within 30 ft. Until end of turn, next weapon hit against it deals +1d8 force damage (and converts weapon damage to force). At lv 11, increases to 2d8.' },
      { level: 7, name: 'Ethereal Step', desc: 'Cast Etherealness as a bonus action, but only for the end of your current turn. 1/short rest.' },
      { level: 11, name: 'Distant Strike', desc: 'When you take the Attack action, teleport up to 10 ft before each attack to an unoccupied space you can see. If you attack at least two different creatures, make one additional attack against a third.' },
      { level: 15, name: 'Spectral Defense', desc: 'When you take damage from an attack, use your reaction to gain resistance to that attack\'s damage.' },
    ] },
  { id: 'MonsterSlayer', label: 'Monster Slayer', classId: 'Ranger', unlocksAtLevel: 3, description: 'Specialist at hunting powerful monsters. Hunter\'s Sense reveals vulnerabilities; counter spells and condition effects.',
    subclassFeatures: [
      { level: 3, name: "Hunter's Sense", desc: 'As an action, choose a creature within 60 ft and learn its damage immunities, resistances, and vulnerabilities. Uses = WIS mod per long rest.' },
      { level: 3, name: "Slayer's Prey", desc: 'As a bonus action, designate a creature within 60 ft. First weapon hit per turn against it deals +1d6 damage until you use this feature again or rest.' },
      { level: 7, name: 'Supernatural Defense', desc: 'When the target of your Slayer\'s Prey forces you to make a save or you make a check to escape from it, add 1d6 to your roll.' },
      { level: 11, name: 'Magic-User\'s Nemesis', desc: 'When a creature within 60 ft casts a spell or teleports, use your reaction to force a WIS save or the casting/teleport fails (no slot/charge wasted). PB times per long rest.' },
      { level: 15, name: "Slayer's Counter", desc: 'When the target of your Slayer\'s Prey forces you to make a save, use your reaction to attack it (before the save). If you hit, you auto-succeed on the save.' },
    ] },
  { id: 'FeyWanderer',   label: 'Fey Wanderer',  classId: 'Ranger', unlocksAtLevel: 3,
    subclassSpells: { 3: ['charm-person'], 5: ['misty-step'], 9: ['dispel-magic'], 13: ['dimension-door'] },
    description: 'Touched by the Feywild. Add CHA to INT/WIS/CHA checks, and deal bonus psychic damage with weapon attacks.',
    subclassFeatures: [
      { level: 3, name: 'Dreadful Strikes', desc: 'Once per turn when you hit a creature with a weapon attack, deal extra 1d4 psychic damage (1d6 at lv 11).' },
      { level: 3, name: 'Otherworldly Glamour', desc: 'Add your WIS mod (min +1) to any CHA check you make. Gain proficiency in one of: Deception, Performance, or Persuasion.' },
      { level: 7, name: 'Beguiling Twist', desc: 'Advantage on saves vs being charmed/frightened. When a creature within 120 ft fails such a save, use reaction to redirect: target makes a WIS save or is charmed/frightened for 1 minute.' },
      { level: 11, name: 'Fey Reinforcements', desc: 'Always have Summon Fey prepared (it doesn\'t count against your prepared spells). Cast it once per long rest without a slot.' },
      { level: 15, name: 'Misty Wanderer', desc: 'Cast Misty Step without a slot WIS mod times per long rest. Bring an additional willing creature within 5 ft along.' },
    ] },
  { id: 'Swarmkeeper',   label: 'Swarmkeeper',   classId: 'Ranger', unlocksAtLevel: 3,
    subclassSpells: { 3: ['faerie-fire'], 9: ['gaseous-form'], 13: ['arcane-eye'] },
    description: 'Gather a swarm of spirits. They move with you, deal damage, and can push or pull enemies.',
    subclassFeatures: [
      { level: 3, name: 'Gathered Swarm', desc: 'A swarm of spirits assists you. Once per turn when you hit a creature with a weapon attack, choose: +1d6 piercing damage, move the target up to 15 ft horizontally, or move yourself 5 ft (no OAs).' },
      { level: 3, name: 'Bonus Cantrip', desc: 'Learn the Mage Hand cantrip. You can make it invisible (and an action to deal 1d6 damage at range or push prone — your call).' },
      { level: 7, name: 'Writhing Tide', desc: 'As a bonus action, gain a flying speed of 10 ft and the ability to hover for 1 minute. Uses = PB per long rest.' },
      { level: 11, name: "Mighty Swarm", desc: 'Gathered Swarm damage die becomes d8. Movement options now also knock prone or grant cover.' },
      { level: 15, name: "Swarming Dispersal", desc: 'When you take damage, use your reaction to gain resistance and teleport up to 30 ft to a space you can see. Uses = PB per long rest.' },
    ] },
  { id: 'Drakewarden',   label: 'Drakewarden',   classId: 'Ranger', unlocksAtLevel: 3,
    subclassSpells: { 3: ['thunderwave'], 9: ['fear'], 13: ['arcane-eye'] },
    description: 'Bond with a drake companion. It grows stronger over levels, eventually becoming a mount.',
    subclassFeatures: [
      { level: 3, name: 'Draconic Gift', desc: 'Learn Druidcraft cantrip and Draconic language. Speak with dragons and dragon-related creatures (limited understanding).' },
      { level: 3, name: 'Drake Companion', desc: 'Summon a Tiny drake companion (chromatic-flavored, your damage type choice). It acts on your initiative, adds your PB to its rolls and damage. Use bonus action to command Attack.' },
      { level: 7, name: 'Bond of Fang and Scale', desc: 'Drake grows to Medium and gains additional features (flying speed 80 ft, +damage type matching your choice).' },
      { level: 11, name: "Drake's Breath", desc: 'Spend a spell slot during the drake\'s turn to expel a 30-ft cone of breath (DEX save, damage = slot level + 2d6 of your chosen damage type).' },
      { level: 15, name: 'Perfected Bond', desc: 'Drake becomes Large and gains: +PB temp HP, attacks deal +1d6 of your chosen type, and you can ride it (it can carry one Medium or smaller passenger).' },
    ] },

  // ── Rogue (level 3) ─────────────────────────────────────────────
  { id: 'Thief',           label: 'Thief',           classId: 'Rogue', unlocksAtLevel: 3, description: 'Fast Hands for bonus action item use and climbing. Use Magic Device lets you use magic items freely.',
    subclassFeatures: [
      { level: 3, name: 'Fast Hands', desc: 'Use your bonus action (Cunning Action) to make a DEX (Sleight of Hand) check, use thieves\' tools to disarm a trap or open a lock, or take the Use an Object action.' },
      { level: 3, name: 'Second-Story Work', desc: 'Climbing no longer costs extra movement. When you make a running jump, the distance increases by DEX mod (feet).' },
      { level: 9, name: 'Supreme Sneak', desc: 'Advantage on Stealth checks if you move no more than half your speed on the same turn.' },
      { level: 13, name: 'Use Magic Device', desc: 'Ignore all class, race, and level requirements on magic items.' },
      { level: 17, name: 'Thief\'s Reflexes', desc: 'Take two turns in the first round of combat (first at your normal initiative, second at your initiative - 10). Only on first round, and only if not surprised.' },
    ] },
  { id: 'Assassin',        label: 'Assassin',        classId: 'Rogue', unlocksAtLevel: 3, description: 'Strike first and devastate. Assassinate grants auto-crit on surprised targets.',
    subclassFeatures: [
      { level: 3, name: 'Bonus Proficiencies', desc: "Gain proficiency with the disguise kit and the poisoner's kit." },
      { level: 3, name: 'Assassinate', desc: 'Advantage on attacks against creatures that haven\'t taken a turn in combat yet. Any hit you score against a surprised creature is a critical hit.' },
      { level: 9, name: 'Infiltration Expertise', desc: 'Spend 7 days and 25 gp to establish a false identity. The identity is supported by paperwork, contacts, and reputation.' },
      { level: 13, name: 'Impostor', desc: 'Mimic another creature\'s speech, writing, and behavior (after spending at least 3 hours studying). DC = 8 + their PB on the Insight check vs your Deception (you have advantage).' },
      { level: 17, name: 'Death Strike', desc: 'When you hit a surprised creature, double the damage dealt. Target makes CON save (DC = 8 + PB + DEX) or takes double damage.' },
    ] },
  { id: 'ArcaneTrickster', label: 'Arcane Trickster', classId: 'Rogue', unlocksAtLevel: 3, spellcastingAbility: 'int', spellListClassId: 'Wizard', spellsKnownTable: { 3:3, 4:4, 7:5, 8:6, 10:7, 11:8, 13:9, 14:10, 16:11, 19:12, 20:13 }, cantripsKnownTable: { 3:2, 10:3 }, description: 'Blend illusion and enchantment magic with roguish tricks. Mage Hand Legerdemain for cunning heists.',
    subclassFeatures: [
      { level: 3, name: 'Spellcasting', desc: 'Cast wizard spells (Illusion and Enchantment; other schools at levels 8/14/20). Use INT as your spellcasting ability.' },
      { level: 3, name: 'Mage Hand Legerdemain', desc: 'You always know Mage Hand and can make the hand invisible. Use it to stow/retrieve from another creature\'s container, use thieves\' tools at a distance.' },
      { level: 9, name: 'Magical Ambush', desc: 'If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any save against the spell.' },
      { level: 13, name: 'Versatile Trickster', desc: 'As a bonus action, use Mage Hand to distract a creature within 5 ft of the hand. You have advantage on attack rolls against that creature until end of turn.' },
      { level: 17, name: 'Spell Thief', desc: 'When a creature casts a spell that targets you, use your reaction to force a save vs your spell DC. On failure, you steal the spell (it can\'t cast it for 8 hours) and can cast it within 8 hours using your slots.' },
    ] },
  { id: 'Inquisitive',     label: 'Inquisitive',     classId: 'Rogue', unlocksAtLevel: 3, description: 'Expert at uncovering secrets. Ear for Deceit and Eye for Detail help ferret out lies and hidden foes.',
    subclassFeatures: [
      { level: 3, name: 'Ear for Deceit', desc: 'When you make a WIS (Insight) check to determine if a creature is lying, treat any d20 roll of 7 or lower as an 8.' },
      { level: 3, name: 'Eye for Detail', desc: 'Use a bonus action to make a WIS (Perception) check to spot a hidden creature or object, or an INT (Investigation) check to uncover or decipher clues.' },
      { level: 3, name: 'Insightful Fighting', desc: 'As a bonus action, make a WIS (Insight) check vs target\'s CHA (Deception) — if you win, you can deal Sneak Attack damage against the target this turn even without advantage (as long as you have a melee finesse weapon or ranged weapon and aren\'t at disadvantage). Lasts 1 min or until you use it again.' },
      { level: 9, name: 'Steady Eye', desc: 'Advantage on Perception and Investigation checks if you move no more than half your speed on the same turn.' },
      { level: 13, name: 'Unerring Eye', desc: 'As an action, sense magical and supernatural deception within 30 ft (illusions, transmutations, disguises). Uses = WIS mod (min 1) per long rest.' },
      { level: 17, name: 'Eye for Weakness', desc: 'While Insightful Fighting is active against a target, your Sneak Attack against it deals +3d6 damage.' },
    ] },
  { id: 'Mastermind',      label: 'Mastermind',      classId: 'Rogue', unlocksAtLevel: 3, description: 'The consummate planner. Help allies at range and read social situations in an instant.',
    subclassFeatures: [
      { level: 3, name: 'Master of Intrigue', desc: "Gain proficiency with disguise kit, forgery kit, and one gaming set. Learn two languages. Can mimic speech of others." },
      { level: 3, name: 'Master of Tactics', desc: 'Use Help action as a bonus action; can target a creature up to 30 ft away.' },
      { level: 9, name: 'Insightful Manipulator', desc: 'After 1 minute of observing or interacting with a humanoid, learn 2 of the following about it: INT, WIS, CHA, class levels.' },
      { level: 13, name: 'Misdirection', desc: 'When you are targeted by an attack while a creature within 5 ft is providing you cover, use a reaction to have the attack target that creature instead.' },
      { level: 17, name: 'Soul of Deceit', desc: 'Thoughts can\'t be read by telepathy or magical means without your consent. Magical truth-detection treats your lies as truth.' },
    ] },
  { id: 'Scout',           label: 'Scout',           classId: 'Rogue', unlocksAtLevel: 3, description: 'Expert skirmisher in the wild. Skirmisher lets you dash away when enemies close in.',
    subclassFeatures: [
      { level: 3, name: 'Skirmisher', desc: 'When a creature ends its turn within 5 ft of you, use your reaction to move up to half your speed (no OAs).' },
      { level: 3, name: 'Survivalist', desc: 'Gain proficiency in Nature and Survival (or expertise if already proficient).' },
      { level: 9, name: "Superior Mobility", desc: 'Walking speed +10 ft. If you have a climb or swim speed, it also increases by 10 ft.' },
      { level: 13, name: 'Ambush Master', desc: 'Advantage on initiative. On the first turn of combat, you treat any creature you hit as if you have advantage on the attack (helping with Sneak Attack); allies attacking the same target also have advantage until start of your next turn.' },
      { level: 17, name: 'Sudden Strike', desc: 'Once per turn, take an additional attack action as a bonus action. Can apply Sneak Attack to one of those attacks.' },
    ] },
  { id: 'Swashbuckler',    label: 'Swashbuckler',   classId: 'Rogue', unlocksAtLevel: 3, description: 'Elegant and dangerous in a duel. Sneak Attack with a single adjacent enemy, no ally required.',
    subclassFeatures: [
      // TODO: mechanical wiring — Rakish Audacity extends Sneak Attack to allow no-ally-required when alone with target. Could be wired in getSpecialAttacks().
      { level: 3, name: 'Fancy Footwork', desc: 'When you make a melee attack against a creature, it can\'t make OAs against you for the rest of the turn.' },
      { level: 3, name: 'Rakish Audacity', desc: '+CHA mod to initiative. You can use Sneak Attack without an ally next to the target as long as no other enemy is within 5 ft of you.' },
      { level: 9, name: 'Panache', desc: 'Make CHA (Persuasion) vs WIS (Insight). On win: hostile creatures have disadvantage on attacks vs anyone but you (and have OA disadvantage vs you); non-hostile become charmed for 1 minute.' },
      { level: 13, name: 'Elegant Maneuver', desc: 'Use a bonus action to gain advantage on the next DEX (Acrobatics) or STR (Athletics) check you make this turn.' },
      { level: 17, name: 'Master Duelist', desc: 'When you miss with an attack, give yourself advantage on a reroll. 1/short rest.' },
    ] },
  { id: 'Phantom',         label: 'Phantom',         classId: 'Rogue', unlocksAtLevel: 3, description: 'Tap into the power of death. Steal memories from the dead and gain proficiency from their spirits.',
    subclassFeatures: [
      { level: 3, name: 'Whispers of the Dead', desc: 'Each time you finish a short or long rest, gain proficiency in one skill or tool of your choice (replaces the previous one).' },
      { level: 3, name: 'Wails from the Grave', desc: 'Right after dealing Sneak Attack damage, deal half that damage as necrotic to a second creature within 30 ft of the first. Uses = PB per long rest.' },
      { level: 9, name: 'Tokens of the Departed', desc: 'When a creature dies within 30 ft, create a Soul Trinket (carry up to PB). Use one to roll a d6 to add to a save, or to ask a dead spirit one question (use Speak with Dead-like).' },
      { level: 13, name: 'Ghost Walk', desc: 'As a bonus action, assume a spectral form for 10 min (or expend a Soul Trinket): flying speed of 10 ft, hover, attacks against you have disadvantage. 1/long rest, or spend a Soul Trinket.' },
      { level: 17, name: 'Death\'s Friend', desc: 'Use Wails from the Grave both before AND after the Sneak Attack damage. At the end of a long rest, if you have fewer than 4 Soul Trinkets, gain enough to have 4. When you die, the souls in your Trinkets are released.' },
    ] },
  { id: 'Soulknife',       label: 'Soulknife',       classId: 'Rogue', unlocksAtLevel: 3, description: 'Focus your psychic energy into blades of psionic power. Telepathy, teleportation, and mental strikes.',
    subclassFeatures: [
      { level: 3, name: 'Psionic Power', desc: 'Gain a pool of Psionic Energy Dice (PB+2 starting at d6). Spend dice on options below. Recover all on a long rest, or one on a short rest.' },
      { level: 3, name: 'Psychic Blades', desc: 'Manifest a psychic blade in each hand (martial finesse, 1d6 psychic, thrown 60/120). Can be off-hand without consuming bonus action damage rules — second blade deals 1d4.' },
      { level: 9, name: 'Soul Blades: Homing Strikes & Psychic Teleportation', desc: 'Spend one Energy Die when you miss with a Psychic Blade to add the die to the attack roll. Spend one die as a bonus action to teleport 30 ft to an unoccupied space you can see.' },
      { level: 13, name: 'Psychic Veil', desc: 'As an action, become invisible for 1 hour (ends if you deal damage or force a save). Spend 1 die to do this without using the daily use. 1/long rest.' },
      { level: 17, name: 'Rend Mind', desc: 'When you deal Sneak Attack with a Psychic Blade, spend 3 dice to stun the target (WIS save) until end of your next long rest (target repeats every 24 hours).' },
    ] },

  // ── Sorcerer (level 1) ──────────────────────────────────────────
  { id: 'DraconicBloodline', label: 'Draconic Bloodline', classId: 'Sorcerer', unlocksAtLevel: 1, unarmoredAC: (dex) => 13 + dex, description: 'Dragon blood flows in your veins. AC 13 + DEX without armor; extra HP per level; elemental affinity.',
    subclassFeatures: [
      { level: 1, name: 'Draconic Ancestry', desc: 'Choose a dragon type (Black/Acid, Blue/Lightning, Brass/Fire, Bronze/Lightning, Copper/Acid, Gold/Fire, Green/Poison, Red/Fire, Silver/Cold, White/Cold). Learn Draconic; double PB on CHA checks against dragons.' },
      { level: 1, name: 'Draconic Resilience', desc: 'Max HP increases by 1 and increases by 1 again whenever you gain a sorcerer level. AC = 13 + DEX mod when not wearing armor.' },
      { level: 6, name: 'Elemental Affinity', desc: 'Add your CHA mod to one damage roll of a spell that matches your draconic ancestry damage type. Spend 1 sorcery point to gain resistance to that damage type for 1 hour.' },
      { level: 14, name: 'Dragon Wings', desc: 'As a bonus action, manifest dragon wings: gain a flying speed = walking speed for 1 hour or until you dismiss.' },
      { level: 18, name: 'Draconic Presence', desc: 'Spend 5 sorcery points to exude a 60-ft aura of awe or fear for 1 minute (concentration). Each hostile creature in the aura makes a WIS save or is charmed (awe) or frightened (fear) until incapacitated or out of the aura.' },
    ] },
  { id: 'WildMagicSorcerer', label: 'Wild Magic',         classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Your magic is volatile and unpredictable. Wild Magic Surges trigger random arcane effects.',
    subclassFeatures: [
      { level: 1, name: 'Wild Magic Surge', desc: 'When you cast a 1st-level+ sorcerer spell, the DM may have you roll a d20. On 1, roll on the Wild Magic Surge table (d100) to determine the effect.' },
      { level: 1, name: 'Tides of Chaos', desc: 'Once per long rest, give yourself advantage on one attack roll, ability check, or save. After use, the DM may trigger a Wild Magic Surge before your next rest; doing so refunds the use.' },
      { level: 6, name: 'Bend Luck', desc: 'When another creature you can see makes an attack, ability check, or save, spend 2 sorcery points (reaction) to roll a d4 and add or subtract from their roll.' },
      { level: 14, name: 'Controlled Chaos', desc: 'When you roll on the Wild Magic Surge table, roll twice and use either result.' },
      { level: 18, name: 'Spell Bombardment', desc: 'When you roll damage for a spell and roll the highest possible number on any of the dice, choose one die, roll it again, and add to the damage. 1/turn.' },
    ] },
  { id: 'DivineSoul',        label: 'Divine Soul',        classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Blessed by a divine being. Access to the Cleric spell list in addition to the Sorcerer list.',
    subclassFeatures: [
      { level: 1, name: 'Divine Magic', desc: 'Choose an alignment-themed affinity (Good/Evil/Lawful/Chaotic/Neutral). Learn a bonus spell at sorcerer level 1 (e.g., Cure Wounds, Inflict Wounds, Bless, Bane). Cleric spells are available for you to learn.' },
      { level: 1, name: 'Favored by the Gods', desc: 'When you fail a save or miss with an attack, roll 2d4 and add to the roll. Must use before knowing if you succeed. 1/short rest.' },
      { level: 6, name: 'Empowered Healing', desc: 'When you or an ally within 5 ft rolls dice to determine HP restored by a spell, spend 1 sorcery point to reroll any number of those dice (use the new rolls). 1/turn.' },
      { level: 14, name: 'Otherworldly Wings', desc: 'As a bonus action, manifest spectral wings of celestial or fiendish power. Flying speed of 30 ft, indefinitely until dismissed.' },
      { level: 18, name: 'Unearthly Recovery', desc: 'As a bonus action when you are below half HP, regain HP = half your max. 1/long rest.' },
    ] },
  { id: 'ShadowMagic',       label: 'Shadow Magic',       classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Born from the Shadowfell. See in darkness, summon a Hound of Ill Omen, and survive death.',
    subclassFeatures: [
      { level: 1, name: 'Eyes of the Dark', desc: 'Darkvision 120 ft. Also, when you cast the Darkness spell, see through magical darkness; spend 2 sorcery points to cast it without a slot.' },
      { level: 1, name: 'Strength of the Grave', desc: 'When damage reduces you to 0 HP, make a CHA save (DC = 5 + damage). On success, drop to 1 HP instead. 1/long rest.' },
      { level: 6, name: 'Hound of Ill Omen', desc: 'Spend 3 sorcery points to summon a shadowy hound (large dire wolf stat block) targeting a creature within 120 ft. Lasts 5 minutes; target has disadvantage on saves vs your spells while the hound is within 5 ft.' },
      { level: 14, name: 'Shadow Walk', desc: 'When in dim light or darkness, use a bonus action to teleport up to 120 ft to a space you can see in dim light/darkness.' },
      { level: 18, name: 'Umbral Form', desc: 'Spend 6 sorcery points to assume a shadow form for 1 minute. Resistance to all damage except force and radiant; can move through enemy spaces and objects; can\'t use Strength or interact with most physical objects.' },
    ] },
  { id: 'StormSorcery',      label: 'Storm Sorcery',      classId: 'Sorcerer', unlocksAtLevel: 1, description: 'Your power is rooted in wind and thunder. Fly short distances when casting lightning or thunder spells.',
    subclassFeatures: [
      { level: 1, name: 'Wind Speaker', desc: 'Speak, read, and write Primordial (and the four elemental dialects).' },
      { level: 1, name: 'Tempestuous Magic', desc: 'When you cast a 1st-level+ spell, fly up to 10 ft (no OAs) as part of the casting.' },
      { level: 6, name: 'Heart of the Storm', desc: 'Resistance to lightning and thunder damage. When you cast a 1st-level+ spell that deals lightning or thunder, creatures within 10 ft (your choice) take damage = half sorcerer level (lightning or thunder).' },
      { level: 6, name: 'Storm Guide', desc: 'Above-ground at-will: stop rain in 20 ft around you, or direct light winds to bring something to you.' },
      { level: 14, name: "Storm's Fury", desc: 'When you take damage from a melee attack, use your reaction to deal lightning damage to the attacker = sorcerer level. The attacker must make a STR save (DC = 8 + Prof + CHA) or be pushed 20 ft.' },
      { level: 18, name: 'Wind Soul', desc: 'Immune to lightning and thunder damage. Permanent flying speed of 60 ft. Reduce flying speed to 30 ft to grant 6 willing creatures within 30 ft flying speed of 30 ft for 1 hour.' },
    ] },
  { id: 'AberrantMind',      label: 'Aberrant Mind',      classId: 'Sorcerer', unlocksAtLevel: 1,
    // TODO: psionic-spell-replacement — TCoE allows these spells to be swapped on long rest with a
    // divination/enchantment spell of the same level. Not modeled in v1.
    subclassSpells: { 1: ['arms-of-hadar'], 3: ['calm-emotions', 'detect-thoughts'], 5: ['hunger-of-hadar'] },
    description: 'Your mind was warped by a psionic entity. Telepathy and expanded spells from the Far Realm.',
    subclassFeatures: [
      { level: 1, name: 'Telepathic Speech', desc: 'Telepathically communicate with one creature within 30 ft for 10 min × CHA mod (you both must share a language).' },
      { level: 1, name: 'Psionic Spells', desc: 'Learn additional spells. On long rest, replace one with a divination or enchantment spell of the same level. Cast these without verbal or material components by spending sorcery points equal to the spell level.' },
      { level: 6, name: 'Psionic Sorcery', desc: 'When you cast a Psionic Spell, you can spend sorcery points equal to the slot level instead of using a slot (and cast it without V/M components).' },
      { level: 6, name: 'Psychic Defenses', desc: 'Resistance to psychic damage. Advantage on saves against being charmed or frightened.' },
      { level: 14, name: 'Revelation in Flesh', desc: 'Spend 1+ sorcery points to manifest aberrant features for 10 min. Each point chooses a benefit (swim/climb, see invisible, telepathy 60 ft, fly tied to telepathic teleport).' },
      { level: 18, name: 'Warping Implosion', desc: 'Teleport up to 120 ft, then unleash a 30-ft aura. Each creature in the aura (other than you) takes 8d10 force damage and pulled toward your space (STR save halves and prevents pull). 1/long rest, or spend 5 sorcery points.' },
    ] },
  { id: 'ClockworkSoul',     label: 'Clockwork Soul',     classId: 'Sorcerer', unlocksAtLevel: 1,
    // TODO: clockwork-spell-replacement — TCoE allows these to be swapped with abjuration/transmutation of same level on long rest.
    subclassSpells: { 3: ['aid', 'lesser-restoration'], 5: ['dispel-magic', 'protection-from-energy'], 7: ['freedom-of-movement'], 9: ['greater-restoration', 'wall-of-force'] },
    description: 'Infused with the orderly magic of Mechanus. Restore balance by cancelling advantage and disadvantage.',
    subclassFeatures: [
      { level: 1, name: 'Clockwork Magic', desc: 'Learn additional spells from the Order list. On long rest, replace one with an abjuration or transmutation spell of the same level.' },
      { level: 1, name: 'Restore Balance', desc: 'When a creature within 60 ft is about to roll a d20 with advantage or disadvantage, use your reaction to cancel the advantage/disadvantage. PB times per long rest.' },
      { level: 6, name: 'Bastion of Law', desc: 'As an action, spend 1-5 sorcery points to create a magical ward on a creature you can see within 30 ft. The ward has 5 d8s (one per point spent) that it can use as a reaction to absorb damage (roll, subtract).' },
      { level: 14, name: 'Trance of Order', desc: 'As a bonus action, enter a trance for 1 minute. Treat any d20 of 9 or lower on attack rolls, ability checks, and saves as a 10. You can\'t be affected by critical hits during this. 1/long rest, or spend 5 sorcery points.' },
      { level: 18, name: 'Clockwork Cavalcade', desc: 'As an action, summon a manifestation of clockwork spirits in a 30-ft cube. Restores 100 HP distributed among creatures, ends one spell of 6th level or lower on each. Damages constructs/objects (you didn\'t create) for 10d10. 1/long rest, or spend 7 sorcery points.' },
    ] },

  // ── Warlock (level 1) ───────────────────────────────────────────
  { id: 'Archfey',     label: 'The Archfey',      classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['faerie-fire', 'sleep'], 3: ['calm-emotions'], 5: ['blink', 'plant-growth'], 7: ['greater-invisibility'], 9: ['dominate-person'] },
    description: 'Bound to a lord of the Feywild. Fey Presence charms or frightens; Misty Escape teleports when damaged.',
    subclassFeatures: [
      { level: 1, name: 'Fey Presence', desc: 'As an action, each creature in a 10-ft cube originating from you makes a WIS save or is charmed or frightened (your choice) by you until end of next turn. 1/short rest.' },
      { level: 6, name: 'Misty Escape', desc: 'When you take damage, use your reaction to teleport up to 60 ft and become invisible until end of next turn or until you attack/cast a spell. 1/short rest.' },
      { level: 10, name: 'Beguiling Defenses', desc: 'Immune to being charmed. When a creature tries to charm you, use your reaction to redirect the charm to them (WIS save or charmed by you for 1 minute).' },
      { level: 14, name: 'Dark Delirium', desc: 'As an action, charm or frighten one creature within 60 ft (WIS save) for 1 minute. Target perceives illusory landscape. 1/long rest.' },
    ] },
  { id: 'Fiend',       label: 'The Fiend',        classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['burning-hands', 'command'], 3: ['blindness-deafness', 'scorching-ray'], 5: ['fireball'], 7: ['fire-shield', 'wall-of-fire'], 9: ['flame-strike'] },
    description: 'Pact with a powerful fiend. Dark One\'s Blessing grants temp HP on kills; expanded spell list.',
    subclassFeatures: [
      { level: 1, name: "Dark One's Blessing", desc: 'When you reduce a hostile creature to 0 HP, gain temp HP = CHA mod + warlock level (min 1).' },
      { level: 6, name: "Dark One's Own Luck", desc: 'When you make an ability check or save, add 1d10 to the roll. Use after seeing the roll but before knowing the outcome. 1/short rest.' },
      { level: 10, name: 'Fiendish Resilience', desc: 'After a short or long rest, choose one damage type (B/P/S, fire, cold, etc.). Resistance to that damage type until you choose another or finish another rest. Magical weapons ignore.' },
      { level: 14, name: 'Hurl Through Hell', desc: 'When you hit a creature with an attack, instantly send it on a hellish journey. The creature disappears, returns at end of next turn taking 10d10 psychic damage. 1/long rest.' },
    ] },
  { id: 'GreatOldOne', label: 'The Great Old One', classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 3: ['detect-thoughts'], 9: ['dominate-person'] },
    description: 'Bound to an incomprehensible ancient being. Telepathy, Awakened Mind for silent communication.',
    subclassFeatures: [
      { level: 1, name: 'Awakened Mind', desc: 'Speak telepathically to any creature within 30 ft (you share a language).' },
      { level: 6, name: 'Entropic Ward', desc: 'When a creature makes an attack roll against you, use your reaction to impose disadvantage. If miss, your next attack against it has advantage (before end of next turn). 1/short rest.' },
      { level: 10, name: 'Thought Shield', desc: 'Thoughts can\'t be read by telepathy or other magic unless you allow. Resistance to psychic damage. When a creature deals psychic damage to you, it takes the same damage.' },
      { level: 14, name: 'Create Thrall', desc: 'After 1 minute touching an incapacitated humanoid, charm it indefinitely (no save). Telepathy 30 ft works on it. Ends if it takes damage from you/anyone you direct, or you charm another.' },
    ] },
  { id: 'Celestial',   label: 'The Celestial',    classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['cure-wounds', 'guiding-bolt'], 3: ['flaming-sphere', 'lesser-restoration'], 5: ['daylight', 'revivify'], 7: ['wall-of-fire'], 9: ['flame-strike', 'greater-restoration'] },
    description: 'Patron from the Upper Planes. Healing Light lets you expend dice to restore HP.',
    subclassFeatures: [
      { level: 1, name: 'Bonus Cantrips', desc: 'Learn Light and Sacred Flame cantrips.' },
      { level: 1, name: 'Healing Light', desc: 'Bonus action pool of d6s = 1 + warlock level. Spend up to CHA mod (min 1) dice to heal a creature within 60 ft. Pool refreshes on long rest.' },
      { level: 6, name: 'Radiant Soul', desc: "When you cast a spell or use a magical effect that deals radiant or fire damage, add CHA mod (min 1) to one damage roll." },
      { level: 10, name: 'Celestial Resilience', desc: 'After a short or long rest, gain temp HP = warlock level + CHA mod, and 5 + half level temp HP for up to 5 other creatures within 30 ft.' },
      { level: 14, name: 'Searing Vengeance', desc: 'When you or an ally within 60 ft is reduced to 0 HP, you can use your reaction to stand up (1 HP), regain HP = 2d8 + CHA. Each enemy of your choice within 30 ft must make a CON save (DC = 8 + Prof + CHA) — failure: 2d8 + CHA radiant damage and blinded until end of next turn. 1/long rest.' },
    ] },
  { id: 'Hexblade',    label: 'The Hexblade',     classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['shield', 'wrathful-smite'], 3: ['blur', 'branding-smite'], 5: ['blink'], 9: ['banishing-smite', 'cone-of-cold'] },
    description: 'Pact with a shadowy entity of the Shadowfell. Use CHA for weapon attacks and curse enemies.',
    subclassFeatures: [
      // TODO: mechanical wiring — Hex Warrior CHA-for-weapon-attacks; extend computeAttackBonus/computeWeaponDamage to allow CHA for a bonded weapon.
      { level: 1, name: 'Hex Warrior', desc: "After a long rest, touch one weapon you're proficient with (no two-handed). You can use CHA instead of STR/DEX for attack and damage with that weapon. Also gain proficiency with medium armor, shields, and martial weapons." },
      { level: 1, name: "Hexblade's Curse", desc: 'As a bonus action, curse one creature within 30 ft for 1 minute. Bonus to damage rolls vs the target = your PB; crit on 19-20; if it dies, regain HP = warlock level + CHA mod. 1/short rest.' },
      { level: 6, name: "Accursed Specter", desc: 'When you kill a humanoid, raise its spirit as a specter under your control for 1 hour (or short rest). 1/long rest.' },
      { level: 10, name: 'Armor of Hexes', desc: 'When a creature affected by your Hexblade\'s Curse hits you, roll a d6: on 4+, the hit misses you instead.' },
      { level: 14, name: 'Master of Hexes', desc: 'When the target of your Hexblade\'s Curse dies, transfer the curse to a different creature within 30 ft (no action needed). Doesn\'t restore the HP refund of the original.' },
    ] },
  { id: 'Fathomless',  label: 'The Fathomless',   classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['thunderwave'], 3: ['silence'], 5: ['lightning-bolt'], 9: ['cone-of-cold'] },
    description: 'An entity from the ocean\'s depths answers your call. Summon tentacles and breathe underwater.',
    subclassFeatures: [
      { level: 1, name: "Tentacle of the Deeps", desc: 'As a bonus action, create a 10-ft spectral tentacle at a point within 60 ft. It deals 1d8 cold damage (CON save halves) to one creature within 10 ft, and reduces speed by 10 ft. PB uses per long rest. Lasts 1 minute.' },
      { level: 1, name: "Gift of the Sea", desc: "Swim speed = walking speed. Breathe underwater." },
      { level: 6, name: "Oceanic Soul", desc: 'Resistance to cold damage. While underwater, you can communicate telepathically with any creature.' },
      { level: 6, name: "Guardian Coil", desc: "Tentacle of the Deeps' damage becomes 2d8. When you or an ally within 10 ft of the tentacle takes damage, use your reaction to reduce the damage by 1d8." },
      { level: 10, name: 'Grasping Tentacles', desc: 'Learn Evard\'s Black Tentacles spell (counts as warlock spell). Cast it once per long rest without a slot, or expend a slot as normal. Gain temp HP = CHA + warlock level when you cast it.' },
      { level: 14, name: 'Fathomless Plunge', desc: 'As an action, summon a wave and teleport you + up to 5 willing creatures within 30 ft up to 1 mile to a body of water you\'ve seen. 1/short rest.' },
    ] },
  { id: 'Genie',       label: 'The Genie',        classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['sanctuary'], 7: ['stoneskin'] },
    description: 'Bound to a noble genie. Carry a Genie\'s Vessel — a magical vessel you can retreat into for rest.',
    subclassFeatures: [
      { level: 1, name: 'Genie\'s Vessel', desc: 'You possess a magical vessel (tiny). Bonus action to channel: deal +PB damage of your genie type (dao=bludgeoning, djinni=thunder, efreeti=fire, marid=cold) on a weapon hit, PB times per long rest. Use action to enter the vessel for a brief rest space.' },
      { level: 1, name: "Genie's Wrath", desc: 'Once per turn when you hit with an attack, deal additional damage of your genie type equal to your PB.' },
      { level: 6, name: 'Elemental Gift', desc: 'Resistance to your genie\'s damage type. As a bonus action, gain flying speed of 30 ft for 10 min. Uses = PB per long rest.' },
      { level: 10, name: 'Sanctuary Vessel', desc: 'When you take a short rest inside your Genie\'s Vessel, you can take it as a long rest instead (1/long rest). Allies within can also benefit.' },
      { level: 14, name: 'Limited Wish', desc: 'Cast any 6th-level or lower spell as an action — once. 1d4 + 1 long rests must pass before you can use this again. 1/long rest cooldown does NOT apply.' },
    ] },
  { id: 'Undead',      label: 'The Undead',       classId: 'Warlock', unlocksAtLevel: 1,
    subclassSpells: { 1: ['bane', 'false-life'], 3: ['blindness-deafness'], 5: ['speak-with-dead'], 7: ['death-ward', 'greater-invisibility'], 9: ['cloudkill'] },
    description: 'Pact with an undead entity. Form of Dread frightens enemies; you gain immunity to fright yourself.',
    subclassFeatures: [
      { level: 1, name: 'Form of Dread', desc: 'As a bonus action, assume a dreadful form for 1 minute: temp HP = warlock level + CHA mod, immunity to frightened, and once per turn when you hit, force a WIS save or target is frightened until end of next turn. Uses = PB per long rest.' },
      { level: 6, name: 'Grave Touched', desc: 'No need to eat, drink, or breathe. When you hit with a weapon attack, deal extra necrotic damage = your CHA mod (min 1). 1/turn.' },
      { level: 10, name: 'Necrotic Husk', desc: 'Resistance to necrotic damage. When reduced to 0 HP (and not killed outright), each creature within 30 ft takes necrotic damage = 2d10 + warlock level. 1/long rest.' },
      { level: 14, name: 'Spirit Projection', desc: 'As an action, project your spirit from your body (which falls unconscious) for 1 hour. Spirit form: resistance to non-radiant damage, fly 40 ft, ignore difficult terrain, regain HP when you reduce a creature to 0 HP. 1/long rest.' },
    ] },

  // ── Wizard (level 2) ────────────────────────────────────────────
  { id: 'Abjuration',     label: 'School of Abjuration',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Specialize in protective magic. Arcane Ward absorbs damage for you.',
    subclassFeatures: [
      { level: 2, name: 'Abjuration Savant', desc: 'Halve the gold and time cost to copy abjuration spells into your spellbook.' },
      { level: 2, name: 'Arcane Ward', desc: 'When you cast an abjuration spell of 1st level+, create an Arcane Ward (HP = 2× wizard level + INT mod). It absorbs damage you take; restored when you cast another abjuration spell of 1st+.' },
      { level: 6, name: 'Projected Ward', desc: 'When a creature within 30 ft takes damage, use your reaction to have your Arcane Ward absorb that damage.' },
      { level: 10, name: 'Improved Abjuration', desc: 'When you cast an abjuration spell that requires an ability check (counterspell, dispel magic), add your PB to the check.' },
      { level: 14, name: 'Spell Resistance', desc: 'Advantage on saves against spells. Resistance to damage from spells.' },
    ] },
  { id: 'Conjuration',    label: 'School of Conjuration',    classId: 'Wizard', unlocksAtLevel: 2, description: 'Master summoning creatures and teleporting. Minor Conjuration creates small objects from thin air.',
    subclassFeatures: [
      { level: 2, name: 'Conjuration Savant', desc: 'Halve the gold and time cost to copy conjuration spells into your spellbook.' },
      { level: 2, name: 'Minor Conjuration', desc: 'As an action, conjure an inanimate object of your choice (≤ 3 ft each side, ≤ 10 lbs) in an unoccupied space you can see. Lasts 1 hour or until you dismiss / take damage.' },
      { level: 6, name: 'Benign Transposition', desc: 'As an action, teleport up to 30 ft to a space you can see. Or swap places with a willing creature of Medium or smaller within range. 1/long rest, or recharges when you cast a 1st-level+ conjuration spell.' },
      { level: 10, name: 'Focused Conjuration', desc: 'While concentrating on a conjuration spell, your concentration can\'t be broken by taking damage.' },
      { level: 14, name: 'Durable Summons', desc: 'Any creature you summon or create with a conjuration spell has 30 temp HP.' },
    ] },
  { id: 'Divination',     label: 'School of Divination',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Peer into the future with Portent — roll two d20s each day and substitute them for any roll.',
    subclassFeatures: [
      { level: 2, name: 'Divination Savant', desc: 'Halve the gold and time cost to copy divination spells.' },
      { level: 2, name: 'Portent', desc: 'After a long rest, roll 2 d20s and record them. You can replace any attack roll, save, or ability check (made by you or another) with one of these foretelling rolls. 3 dice at level 14.' },
      { level: 6, name: 'Expert Divination', desc: 'When you cast a divination spell of 2nd level+, regain one expended spell slot (level ≤ spell\'s level - 1, max 5th).' },
      { level: 10, name: 'The Third Eye', desc: 'As an action, magnify a sense for 24 hours: Darkvision (60 ft), Ethereal Sight (60 ft), Greater Comprehension (read any language), or See Invisibility (10 ft). 1/short rest.' },
      { level: 14, name: 'Greater Portent', desc: 'Roll 3 dice for Portent after each long rest.' },
    ] },
  { id: 'Enchantment',    label: 'School of Enchantment',    classId: 'Wizard', unlocksAtLevel: 2, description: 'Bend minds to your will. Hypnotic Gaze incapacitates an adjacent creature.',
    subclassFeatures: [
      { level: 2, name: 'Enchantment Savant', desc: 'Halve the gold and time cost to copy enchantment spells.' },
      { level: 2, name: 'Hypnotic Gaze', desc: 'As an action, target one creature within 5 ft. WIS save or charmed + incapacitated + speed 0 until end of next turn. Use again to continue (concentration). 1/long rest.' },
      { level: 6, name: 'Instinctive Charm', desc: 'When a creature within 30 ft makes an attack roll against you, use your reaction to force a WIS save or it must instead attack a randomly determined creature within range. 1/long rest, or expend a 1st-level+ slot.' },
      { level: 10, name: 'Split Enchantment', desc: 'When you cast an enchantment spell of 1st+ that targets only one creature, you can target a second creature.' },
      { level: 14, name: 'Alter Memories', desc: 'When you cast an enchantment spell that charms one or more creatures, you can make the target unaware of being charmed. While charmed, you can also cause the target to forget up to PB hours of recent events.' },
    ] },
  { id: 'Evocation',      label: 'School of Evocation',      classId: 'Wizard', unlocksAtLevel: 2, description: 'Focus on violent magical energy. Sculpt Spells protects allies inside your area spells.',
    subclassFeatures: [
      { level: 2, name: 'Evocation Savant', desc: 'Halve the gold and time cost to copy evocation spells.' },
      { level: 2, name: 'Sculpt Spells', desc: 'When you cast an evocation spell affecting other creatures, choose up to 1 + spell level creatures. The chosen creatures auto-succeed on their saves and take no damage (where they\'d take half on a successful save).' },
      { level: 6, name: 'Potent Cantrip', desc: 'When a creature succeeds on a save against your cantrip, it takes half damage (where it would normally take none).' },
      { level: 10, name: 'Empowered Evocation', desc: 'Add your INT mod to one damage roll of any wizard evocation spell.' },
      { level: 14, name: 'Overchannel', desc: 'When you cast a wizard spell of 1st-5th level that deals damage, you can deal max damage instead of rolling. First use after each long rest is free; subsequent uses deal 2d12 necrotic to you per spell level (increasing per use), no saves/resistance.' },
    ] },
  { id: 'Illusion',       label: 'School of Illusion',       classId: 'Wizard', unlocksAtLevel: 2, description: 'Weave deceptive illusions. Improved Minor Illusion creates both image and sound simultaneously.',
    subclassFeatures: [
      { level: 2, name: 'Illusion Savant', desc: 'Halve the gold and time cost to copy illusion spells.' },
      { level: 2, name: 'Improved Minor Illusion', desc: 'Learn Minor Illusion (if you don\'t already) and can create both sound and image with a single casting.' },
      { level: 6, name: 'Malleable Illusions', desc: 'When you cast an illusion spell with a duration of 1 minute+, use an action to change the nature of that illusion (within the spell\'s normal parameters) without recasting.' },
      { level: 10, name: 'Illusory Self', desc: 'When a creature makes an attack roll against you, use your reaction to interpose an illusory duplicate — the attack misses you automatically. 1/short rest.' },
      { level: 14, name: 'Illusory Reality', desc: 'When you cast a 1st-level+ illusion spell, choose one inanimate, non-magical object that is part of the illusion. Make it real for 1 minute.' },
    ] },
  { id: 'Necromancy',     label: 'School of Necromancy',     classId: 'Wizard', unlocksAtLevel: 2, description: 'Manipulate life and death. Grim Harvest restores HP when you kill creatures with spells.',
    subclassFeatures: [
      { level: 2, name: 'Necromancy Savant', desc: 'Halve the gold and time cost to copy necromancy spells.' },
      { level: 2, name: 'Grim Harvest', desc: 'When you kill a creature (not construct/undead) with a 1st-level+ spell, regain HP = 2× the spell\'s level (3× for necromancy spells).' },
      { level: 6, name: 'Undead Thralls', desc: 'Add Animate Dead to your spellbook for free. Animate Dead creates an additional zombie/skeleton, and they have extra HP and damage.' },
      { level: 10, name: 'Inured to Undeath', desc: 'Resistance to necrotic damage; your HP max can\'t be reduced.' },
      { level: 14, name: 'Command Undead', desc: 'As an action, control any undead within 60 ft (CHA save — disadvantage for intelligent undead; auto-fail for mindless undead).' },
    ] },
  { id: 'Transmutation',  label: 'School of Transmutation',  classId: 'Wizard', unlocksAtLevel: 2, description: 'Transform matter and energy. Minor Alchemy converts materials; Transmuter\'s Stone stores transformation magic.',
    subclassFeatures: [
      { level: 2, name: 'Transmutation Savant', desc: 'Halve the gold and time cost to copy transmutation spells.' },
      { level: 2, name: 'Minor Alchemy', desc: 'After 10 minutes, transmute a single non-magical object of one substance into another (wood→steel, stone→gold, etc.). Up to 1 cubic foot per 10 minutes. Lasts 1 hour or until disturbed.' },
      { level: 6, name: "Transmuter's Stone", desc: 'After 8 hours, create a stone holding transmutation magic. While carried, gain one benefit (darkvision 60 ft, +10 speed, prof in CON saves, or resistance to acid/cold/fire/lightning/thunder). Recreate to change benefit. New stone makes the old one inert.' },
      { level: 10, name: 'Shapechanger', desc: 'Add Polymorph to your spellbook for free. Cast Polymorph on yourself without a slot to become a beast (CR ≤ 1). 1/short rest.' },
      { level: 14, name: "Master Transmuter", desc: 'Destroy your Transmuter\'s Stone (action) and target one creature/object within 5 ft: major transmutation (Restore Youth, Panacea, Restore Life as Raise Dead, or Object→Creature/vice-versa).' },
    ] },
  { id: 'Bladesinging',   label: 'Bladesinging',             classId: 'Wizard', unlocksAtLevel: 2, description: 'Elven tradition blending sword and spell. Bladesong grants AC and speed bonuses while active.',
    subclassFeatures: [
      { level: 2, name: 'Training in War and Song', desc: 'Gain proficiency with light armor and one one-handed melee weapon.' },
      // TODO: mechanical wiring — Bladesong is an active toggle similar to Rage. Add a buff-active flag and AC/speed bonuses while active.
      { level: 2, name: 'Bladesong', desc: 'As a bonus action, enter Bladesong (1 min, ends if you wear medium/heavy armor, shield, or incapacitated). Gain +INT mod (min +1) AC, +10 ft speed, advantage on DEX (Acrobatics), +INT mod on CON concentration saves. Uses = PB per long rest.' },
      { level: 6, name: 'Extra Attack', desc: 'You can attack twice when you take the Attack action. One of these can be replaced with a cantrip (1 action casting time).' },
      { level: 10, name: 'Song of Defense', desc: 'While Bladesong is active, when you take damage, expend a slot as a reaction to reduce the damage by 5 × slot level.' },
      { level: 14, name: 'Song of Victory', desc: 'While Bladesong is active, add your INT mod (min +1) to melee weapon damage rolls.' },
    ] },
  { id: 'OrderOfScribes', label: 'Order of Scribes',         classId: 'Wizard', unlocksAtLevel: 2, description: 'The ultimate bookworm. Your spellbook is alive; copy spells instantly and change their damage type.',
    subclassFeatures: [
      { level: 2, name: 'Wizardly Quill', desc: 'Conjure a magical quill in your hand as a bonus action. Uses no ink; doubles your writing speed; can erase text with a swipe.' },
      { level: 2, name: 'Awakened Spellbook', desc: 'Your spellbook is sentient. When you cast a wizard spell with a slot, you can change the spell\'s damage type to match another damage type appearing in another wizard spell in your book. Replaces one casting per long rest.' },
      { level: 6, name: 'Manifest Mind', desc: 'As a bonus action, the spirit of your spellbook flies out (Tiny, fly 30 ft, AC 11, immune to most damage). Cast spells through it as if you were in its space. Lasts 1 hour or until you dismiss. PB times per long rest.' },
      { level: 10, name: 'Master Scrivener', desc: 'After a long rest, you can scribe a spell scroll of a 1st or 2nd level wizard spell from your spellbook for free.' },
      { level: 14, name: "One With the Word", desc: 'When you fail a save vs an attack/spell that would reduce you to 0 HP, sacrifice your spellbook (or your inner self if without it) to drop to 1 HP and lose 3d6 + half wizard level wizard levels for purposes of spell loss. The book is destroyed but you can rebuild it in 1d6 days.' },
    ] },
  { id: 'Chronurgy',      label: 'Chronurgy Magic',          classId: 'Wizard', unlocksAtLevel: 2, description: 'Manipulate the flow of time. Chronal Shift lets you force rerolls of any d20.',
    subclassFeatures: [
      { level: 2, name: 'Chronal Shift', desc: 'When a creature you can see within 30 ft (including you) makes an attack, ability check, or save, use your reaction to force a reroll. Use the new roll. 2/long rest.' },
      { level: 2, name: 'Temporal Awareness', desc: 'Add INT mod to your initiative rolls.' },
      { level: 6, name: 'Momentary Stasis', desc: 'As an action, force a Large or smaller creature within 60 ft to make a CON save or be incapacitated (and speed 0) until end of next turn or it takes damage. INT mod uses per long rest.' },
      { level: 10, name: 'Arcane Abeyance', desc: 'When you cast a 4th-level or lower spell with a slot, store it in a temporal mote (lasts 1 hour). Any creature can use an action to cast that spell without a slot.' },
      { level: 14, name: 'Convergent Future', desc: 'When a creature you can see within 60 ft makes a roll, choose to have it auto-succeed or auto-fail. After each use, gain one level of exhaustion until you long rest.' },
    ] },
  { id: 'Graviturgy',     label: 'Graviturgy Magic',         classId: 'Wizard', unlocksAtLevel: 2, description: 'Control gravitational forces. Adjust the weight of creatures and launch them through the air.',
    subclassFeatures: [
      { level: 2, name: 'Adjust Density', desc: 'As an action, choose one Large or smaller creature within 30 ft. For 1 minute (concentration), it has its weight doubled (speed -10 ft) or halved (speed +10 ft, advantage on STR checks/saves; STR-based attacks have disadvantage).' },
      { level: 6, name: 'Gravity Well', desc: 'When you hit a creature with a spell, you can move it 5 ft to an unoccupied space.' },
      { level: 10, name: 'Violent Attraction', desc: 'When a creature you can see within 60 ft hits with a weapon attack, use your reaction to add 1d10 to the damage. When such a creature falls, add 2d10 to falling damage. INT mod uses per long rest.' },
      { level: 14, name: 'Event Horizon', desc: 'As an action, become the center of a 30-ft pull. Creatures of your choice in range make STR saves: failure = 2d10 force + speed 0 + pulled 10 ft toward you each turn. Concentration up to 1 minute. 1/long rest, or expend a 5th-level+ slot.' },
    ] },
  { id: 'WarMagic',       label: 'War Magic',                classId: 'Wizard', unlocksAtLevel: 2, description: 'Blend offense and defense for battlefield wizardry. Arcane Deflection adds to AC and saves as a reaction.',
    subclassFeatures: [
      { level: 2, name: 'Arcane Deflection', desc: 'When you are hit by an attack OR fail a save, use your reaction to gain +2 AC against that attack OR +4 to that save. After use, you can only cast cantrips on your next turn.' },
      { level: 2, name: 'Tactical Wit', desc: 'Add INT mod to your initiative rolls.' },
      { level: 6, name: 'Power Surge', desc: 'When you successfully Counterspell or Dispel Magic, gain a Power Surge. Store up to INT mod / 2 (min 1). Spend one when casting a damage spell to add wizard level / 2 force damage to one target.' },
      { level: 10, name: 'Durable Magic', desc: 'While concentrating on a spell, +2 AC and +2 to all saves.' },
      { level: 14, name: 'Deflecting Shroud', desc: 'When you use Arcane Deflection, up to 3 creatures of your choice within 60 ft take force damage = half wizard level.' },
    ] },

  // ── Artificer (level 3) ─────────────────────────────────────────
  {
    id: 'Alchemist', label: 'Alchemist', classId: 'Artificer', unlocksAtLevel: 3,
    extraToolProficiencies: ["alchemist's supplies"],
    description: 'Create experimental elixirs that grant random beneficial effects when consumed.',
    subclassFeatures: [
      { level: 3, name: 'Tool Proficiency (Alchemist\'s Supplies)', desc: 'You gain proficiency with alchemist\'s supplies. If you already have it, you learn one other tool proficiency of your choice.' },
      { level: 3, name: 'Experimental Elixir', desc: 'After a long rest, magically create elixirs. Roll on the Experimental Elixir table (Healing, Swiftness, Resilience, Boldness, Flight, Transformation). Number of free elixirs = max(1, INT mod).' },
      { level: 5, name: 'Alchemical Savant', desc: 'When you cast a spell using alchemist\'s supplies as a focus, add INT mod (min +1) to one healing or acid/fire/necrotic/poison damage roll of the spell.' },
      { level: 9, name: 'Restorative Reagents', desc: 'When a creature drinks an experimental elixir, it gains temp HP equal to 2d6 + INT mod. You can also cast Lesser Restoration as an action without using a spell slot (uses = INT mod per long rest).' },
      { level: 15, name: 'Chemical Mastery', desc: 'Resistance to acid and poison damage; immunity to the poisoned condition. You can cast Greater Restoration and Heal once each per long rest without using a spell slot.' },
    ],
    subclassSpells: {
      3: ['healing-word', 'ray-of-sickness'],
      5: ['flaming-sphere', 'melfs-acid-arrow'],
      9: ['gaseous-form', 'mass-healing-word'],
      13: ['blight', 'death-ward'],
      17: ['cloudkill', 'raise-dead'],
    },
  },
  {
    id: 'Armorer', label: 'Armorer', classId: 'Artificer', unlocksAtLevel: 3,
    description: 'Use armor as a weapon platform. Choose Guardian or Infiltrator mode for your magical suit.',
    extraArmorProficiencies: ['heavy'],
    extraToolProficiencies: ["smith's tools"],
    subclassFeatures: [
      { level: 3, name: 'Tools of the Trade', desc: 'You gain proficiency with heavy armor and smith\'s tools. If you already have smith\'s tools, you gain one other tool proficiency.' },
      { level: 3, name: 'Arcane Armor', desc: 'Your armor becomes a magical suit. It includes integrated weapons (Thunder Gauntlets for Guardian; Lightning Launcher for Infiltrator), grants benefits per chosen Armor Model, and you can don/doff it in 1 action.' },
      { level: 3, name: 'Armor Model (Guardian / Infiltrator)', desc: 'Guardian: Thunder Gauntlets (1d8 thunder, disadvantage on attacks not targeting you), Defensive Field (bonus action: temp HP = Artificer level). Infiltrator: Lightning Launcher (1d6 lightning ranged, bonus 1d6 lightning once per turn), Powered Steps (+5 ft speed), Dampening Field (advantage on Stealth in this armor).' },
      { level: 3, name: 'Armor Modifications', desc: 'You can apply up to 2 infusions at once to your Arcane Armor (it counts as 2 separate items for infusion purposes).' },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
      { level: 9, name: 'Armor Modifications (improved)', desc: 'You can apply up to 4 infusions at once to your Arcane Armor (helmet, boots, breastplate, gauntlets — each treated separately).' },
      { level: 15, name: 'Perfected Armor', desc: 'Guardian: when a creature within 30 ft you can see hits a target other than you with an attack, use a reaction to magnetically pull the target up to 30 ft (Strength save to resist). Infiltrator: critical hit range becomes 19–20 against creatures it has already hit this turn.' },
    ],
    subclassSpells: {
      3: ['magic-missile', 'thunderwave'],
      5: ['mirror-image', 'shatter'],
      9: ['hypnotic-pattern', 'lightning-bolt'],
      13: ['fire-shield', 'greater-invisibility'],
      17: ['passwall', 'wall-of-force'],
    },
  },
  {
    id: 'Artillerist', label: 'Artillerist', classId: 'Artificer', unlocksAtLevel: 3,
    extraWeaponProficiencies: ['martial weapons'],
    extraToolProficiencies: ["woodcarver's tools"],
    description: 'Create a magical cannon that fires force, fire, or necrotic projectiles.',
    subclassFeatures: [
      { level: 3, name: 'Tools of the Trade', desc: 'You gain proficiency with martial weapons and woodcarver\'s tools.' },
      { level: 3, name: 'Eldritch Cannon', desc: 'As an action, magically conjure a Tiny or Small cannon (AC 18, HP = 5×Artificer level). Choose Flamethrower (15 ft cone, 2d8 fire, DEX save half), Force Ballista (120 ft ranged spell attack, 2d8 force, push 5 ft), or Protector (10 ft radius, 1d8+INT temp HP to allies). Move it 5 ft as a bonus action; activate or summon a new one as a bonus action thereafter.' },
      { level: 5, name: 'Arcane Firearm', desc: 'After a long rest, magically modify a wand/staff/rod into your Arcane Firearm. When you cast a spell through it, roll a d8 and add the result to one damage roll of that spell.' },
      { level: 9, name: 'Explosive Cannon', desc: 'Eldritch Cannon damage dice increase from d8 to d10. You can also command the cannon to detonate as an action (forfeiting it; each creature within 20 ft makes DEX save or takes 3d8 force damage, half on success).' },
      { level: 15, name: 'Fortified Position', desc: 'You and allies have half cover while within 10 ft of an Eldritch Cannon you can see. You can have two Eldritch Cannons at the same time and activate both with the same bonus action.' },
    ],
    subclassSpells: {
      3: ['shield', 'thunderwave'],
      5: ['scorching-ray', 'shatter'],
      9: ['fireball', 'wind-wall'],
      13: ['ice-storm', 'wall-of-fire'],
      17: ['cone-of-cold', 'wall-of-force'],
    },
  },
  {
    id: 'BattleSmith', label: 'Battle Smith', classId: 'Artificer', unlocksAtLevel: 3,
    extraWeaponProficiencies: ['martial weapons'],
    extraToolProficiencies: ["smith's tools"],
    description: 'A master of weapons and constructs. Use INT for weapon attacks and summon a Steel Defender.',
    subclassFeatures: [
      { level: 3, name: 'Tools of the Trade', desc: 'You gain proficiency with martial weapons and smith\'s tools.' },
      { level: 3, name: 'Battle Ready', desc: 'When you attack with a magic weapon you can use INT instead of STR or DEX for attack and damage rolls.' },
      { level: 3, name: 'Steel Defender', desc: 'Construct an iron defender (AC 15, HP = 2 + INT mod + 5×Artificer level, speed 40 ft). It obeys your commands. Use your bonus action to command it to take an action; otherwise it Dodges. Force-Empowered Rend (1d8 + PB force) and Deflect Attack reaction available.' },
      { level: 5, name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
      { level: 9, name: 'Arcane Jolt', desc: 'When you hit a target with a magic weapon attack or your Steel Defender hits, deal extra 2d6 force damage OR distribute 2d6 HP to creatures within 30 ft. Uses = INT mod (min 1) per long rest.' },
      { level: 15, name: 'Improved Defender', desc: 'Steel Defender gets +2 AC and Arcane Jolt extra is 4d6. Whenever the defender uses Deflect Attack, the attacker takes 1d4 + INT force damage.' },
    ],
    subclassSpells: {
      3: ['heroism', 'shield'],
      5: ['branding-smite', 'warding-bond'],
      9: ['aura-of-vitality', 'conjure-barrage'],
      13: ['aura-of-purity', 'fire-shield'],
      17: ['banishing-smite', 'mass-cure-wounds'],
    },
  },
]

/**
 * Circle of the Land Druid (PHB) grants Circle Spells based on the chosen terrain
 * (selected at druid level 3). Keys are druid class level → spell ids.
 *
 * Lists are partial where some PHB spells aren't yet in `spellData.ts` (gradient
 * coverage matching the rest of Phase C). Add more spell entries to spellData.ts
 * to fill the gaps.
 */
export type LandCircleTerrain = NonNullable<import('@/entities/character/types').Character['circleOfLandTerrain']>

export const LAND_CIRCLE_SPELLS: Record<LandCircleTerrain, Partial<Record<number, string[]>>> = {
  arctic:    { 3: ['hold-person', 'spike-growth'], 5: ['slow'], 7: ['freedom-of-movement', 'ice-storm'], 9: ['cone-of-cold'] },
  coast:     { 3: ['mirror-image', 'misty-step'], 7: ['freedom-of-movement'] },
  desert:    { 3: ['blur', 'silence'], 5: ['protection-from-energy'], 7: ['blight'] },
  forest:    { 5: ['plant-growth'], 7: ['freedom-of-movement'] },
  grassland: { 3: ['invisibility', 'pass-without-trace'], 5: ['daylight', 'haste'], 7: ['freedom-of-movement'] },
  mountain:  { 3: ['spike-growth'], 5: ['lightning-bolt'], 7: ['stoneskin'], 9: ['passwall'] },
  swamp:     { 3: ['melfs-acid-arrow', 'darkness'], 7: ['freedom-of-movement'] },
  underdark: { 5: ['gaseous-form'], 7: ['greater-invisibility'], 9: ['cloudkill'] },
}

export const LAND_CIRCLE_TERRAINS: LandCircleTerrain[] = ['arctic', 'coast', 'desert', 'forest', 'grassland', 'mountain', 'swamp', 'underdark']

export const SUBCLASS_BY_ID = Object.fromEntries(SUBCLASSES.map(s => [s.id, s])) as Record<string, SubclassDef>

export const SUBCLASSES_BY_CLASS = SUBCLASSES.reduce<Record<string, SubclassDef[]>>((acc, s) => {
  if (!acc[s.classId]) acc[s.classId] = []
  acc[s.classId].push(s)
  return acc
}, {})
