export interface SpellScaling {
  baseDice: string
  addPerLevel: string
  baseLevel: number
}

export type AoeShape = 'sphere' | 'cone' | 'line' | 'cube' | 'single'
export type SpellAttackType = 'attack-roll' | 'save' | 'auto-hit'

export interface SpellSprites {
  hit?: string
  miss?: string
  pass?: string
}

export type MultiTargetScaling =
  | { kind: 'slot';      baseCount: number; perSlotAbove?: number; baseLevel: number }
  | { kind: 'charLevel'; thresholds: { level: number; count: number }[] }

export interface SpellEntry {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  description: string
  classes: string[]
  scalingDice?: SpellScaling
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  /** Marks spells that add a bonus to weapon attack/damage rolls when active */
  attackBuff?: { toHit?: number; bonusDmg?: string; bonusDmgType?: string }
  aoeShape?: AoeShape
  aoeSize?: number
  attackType?: SpellAttackType
  damageType?: string
  damageFormula?: string
  sprites?: SpellSprites
  multiTargetScaling?: MultiTargetScaling
}

export interface SpellGridLayout {
  cols: number
  rows: number
  playerPosA: { x: number; y: number }
  playerPosB: { x: number; y: number }
  enemyHitPositions: { x: number; y: number }[]
  enemyMissPositions: { x: number; y: number }[]
  areaCells: { x: number; y: number }[]
}

export const SPELLS: SpellEntry[] = [
  // ── Cantrips (level 0) ────────────────────────────────────────────────────
  { id: 'fire-bolt',        name: 'Fire Bolt',          level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You hurl a mote of fire at a creature or object. Make a ranged spell attack. On a hit, deal 1d10 fire damage. A flammable object hit by this spell ignites. Damage increases to 2d10 at 5th level, 3d10 at 11th, and 4d10 at 17th.', classes: ['Sorcerer', 'Wizard', 'Artificer'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'fire', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif', pass: '/assets/spells/pass/Sparks_Effect.gif' } },
  { id: 'ray-of-frost',     name: 'Ray of Frost',       level: 0, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "A frigid beam of blue-white light streaks toward a creature. Make a ranged spell attack. On a hit, deal 1d8 cold damage and reduce the target's speed by 10ft until the start of your next turn. Damage scales at 5th, 11th, and 17th levels.", classes: ['Sorcerer', 'Wizard'] },
  { id: 'mage-hand',        name: 'Mage Hand',          level: 0, school: 'Conjuration',   castingTime: '1 action', range: '30ft',  components: 'V, S', duration: '1 minute', concentration: false, description: 'A spectral, floating hand appears at a point you choose. Use it to manipulate objects, open doors/containers, stow/retrieve items, or pour contents out. The hand weighs up to 10 pounds and vanishes after 1 minute or if you cast this again.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'vicious-mockery',  saveAbility: 'wis', name: 'Vicious Mockery',    level: 0, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V', duration: 'Instantaneous', concentration: false, description: "You unleash a string of insults laced with subtle enchantments. The target must succeed on a Wisdom saving throw or take 1d4 psychic damage and have disadvantage on the next attack roll it makes before the end of its next turn. Damage scales at 5th, 11th, and 17th levels.", classes: ['Bard'] },
  { id: 'sacred-flame',     saveAbility: 'dex', name: 'Sacred Flame',       level: 0, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "Flame-like radiance descends on a creature you can see. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage. The target gains no benefit from cover. Damage scales at 5th, 11th, and 17th levels.", classes: ['Cleric'] },
  { id: 'guidance',         name: 'Guidance',           level: 0, school: 'Divination',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check.', classes: ['Cleric', 'Druid', 'Artificer'] },
  { id: 'chill-touch',      name: 'Chill Touch',        level: 0, school: 'Necromancy',    castingTime: '1 action', range: '120ft', components: 'V, S', duration: '1 round', concentration: false, description: 'You create a ghostly skeletal hand that clutches at the target. Make a ranged spell attack. On a hit, deal 1d8 necrotic damage and the target cannot regain HP until the start of your next turn. Undead also have disadvantage on attacks against you until then.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'toll-the-dead',    saveAbility: 'wis', name: 'Toll the Dead',      level: 0, school: 'Necromancy',    castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "You point at one creature and the sound of a dolorous bell fills the air. The target must succeed on a Wisdom saving throw or take 1d8 necrotic damage. If the target is missing any hit points, it takes 1d12 instead. Scales at higher levels.", classes: ['Cleric', 'Warlock', 'Wizard'] },
  { id: 'eldritch-blast',   name: 'Eldritch Blast',     level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A beam of crackling energy streaks toward a creature. Make a ranged spell attack. On a hit, the target takes 1d10 force damage. The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level.', classes: ['Warlock'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'force', damageFormula: '1d10', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif' }, multiTargetScaling: { kind: 'charLevel', thresholds: [{ level: 1, count: 1 }, { level: 5, count: 2 }, { level: 11, count: 3 }, { level: 17, count: 4 }] } },
  { id: 'shillelagh',       name: 'Shillelagh',         level: 0, school: 'Transmutation', castingTime: '1 bonus action', range: 'Touch', components: 'V, S, M (mistletoe, shamrock leaf, club/quarterstaff)', duration: 'Concentration, 1 minute', concentration: true, description: 'The wood of a club or quarterstaff you are holding is imbued with nature\'s power. For the duration, you can use your spellcasting ability instead of Strength for attack and damage rolls using that weapon, and the weapon\'s damage die becomes a d8. The weapon also becomes magical.', classes: ['Druid'] },
  { id: 'prestidigitation',  name: 'Prestidigitation',  level: 0, school: 'Transmutation', castingTime: '1 action', range: '10ft', components: 'V, S', duration: 'Up to 1 hour', concentration: false, description: 'Minor magical tricks: create a small sensory effect, light/snuff a small fire, clean/soil an object, chill/warm/flavor food, make a color or mark last 1 hour, produce a small trinket. Up to three non-instantaneous effects can be active simultaneously.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'light',            name: 'Light',              level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Touch', components: 'V, M (firefly/phosphorescent moss)', duration: '1 hour', concentration: false, description: 'You touch one object no larger than 10ft. It emits bright light in a 20ft radius and dim light for an additional 20ft. The light can be a color. Covering the object blocks the light. If you target an unwilling creature, it must succeed on a Dexterity saving throw.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'spare-the-dying',  name: 'Spare the Dying',    level: 0, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You touch a living creature that has 0 hit points. The creature becomes stable. This spell has no effect on undead or constructs.', classes: ['Cleric', 'Artificer'] },
  { id: 'minor-illusion',   name: 'Minor Illusion',     level: 0, school: 'Illusion',      castingTime: '1 action', range: '30ft',  components: 'S, M (bit of fleece)', duration: '1 minute', concentration: false, description: 'You create a sound or an image of an object within range that lasts until the end of the duration. You can create a sound, up to the volume of 4 humans shouting, or an image no larger than a 5ft cube. A creature can investigate with an Intelligence (Investigation) check against your spell save DC.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'thaumaturgy',      name: 'Thaumaturgy',        level: 0, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V', duration: 'Up to 1 minute', concentration: false, description: 'You manifest a minor wonder. Choose an effect: your voice booms, flames flicker, thunderclaps sound, the ground trembles, a door flies open/shut, or your eyes gleam. Up to three non-instantaneous effects at once.', classes: ['Cleric'] },
  { id: 'dancing-lights',   name: 'Dancing Lights',     level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (bit of phosphorus or wychwood)', duration: 'Concentration, 1 minute', concentration: true, description: 'You create up to four torch-sized lights within range. You can combine them into one glowing Medium form. As a bonus action, you can move the lights up to 60ft to a new spot within range. Each light sheds dim light in a 10ft radius.', classes: ['Bard', 'Sorcerer', 'Wizard'] },

  // ── Level 1 ───────────────────────────────────────────────────────────────
  { id: 'magic-missile',    name: 'Magic Missile',      level: 1, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice within range automatically, dealing 1d4+1 force damage. The darts strike simultaneously, and you can direct them at the same or different targets. +1 dart per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], aoeShape: 'single', attackType: 'auto-hit', damageType: 'force', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', pass: '/assets/spells/pass/Sparks_Effect.gif' }, multiTargetScaling: { kind: 'slot', baseCount: 3, perSlotAbove: 1, baseLevel: 1 } },
  { id: 'shield',           name: 'Shield',             level: 1, school: 'Abjuration',    castingTime: '1 reaction', range: 'Self', components: 'V, S', duration: '1 round', concentration: false, description: 'When you are hit by an attack or targeted by Magic Missile, an invisible barrier of magical force appears. Until the start of your next turn, you have +5 AC (including against the triggering attack) and you take no damage from magic missile.', classes: ['Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'sleep',            name: 'Sleep',              level: 1, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (sand/rose petals/cricket)', duration: '1 minute', concentration: false, description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many HP of creatures this spell can affect. Creatures with the lowest current HP are affected first. Unconscious until the spell ends, they take damage, or a creature uses an action to wake them. +2d8 per slot level above 1st.', classes: ['Bard', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '5d8', addPerLevel: '2d8', baseLevel: 1 } },
  { id: 'thunderwave',      saveAbility: 'con', name: 'Thunderwave',        level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft cube)', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A wave of thunderous force sweeps out from you. Each creature in a 15ft cube must succeed on a Constitution saving throw. On failure: take 2d8 thunder damage and be pushed 10ft away. On success: half damage, not pushed. Unsecured objects in the area are pushed. +1d8 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 1 } },
  { id: 'burning-hands',    saveAbility: 'dex', name: 'Burning Hands',      level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft cone)', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A thin sheet of flames shoots from your outstretched fingertips. Each creature in a 15ft cone must make a Dexterity saving throw. On failure: take 3d6 fire damage. On success: half damage. Flammable objects ignite. +1d6 per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '3d6', addPerLevel: '1d6', baseLevel: 1 } },
  { id: 'cure-wounds',      name: 'Cure Wounds',        level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Artificer'], scalingDice: { baseDice: '1d8', addPerLevel: '1d8', baseLevel: 1 } },
  { id: 'healing-word',     name: 'Healing Word',       level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'A creature of your choice within range regains HP equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d4 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid'], scalingDice: { baseDice: '1d4', addPerLevel: '1d4', baseLevel: 1 } },
  { id: 'bless',            name: 'Bless',              level: 1, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, S, M (holy water)', duration: 'Concentration, 1 minute', concentration: true, description: 'You bless up to three creatures of your choice. Whenever a target makes an attack roll or saving throw before the spell ends, the target can roll a d4 and add the number rolled. +1 creature per slot level above 1st.', classes: ['Cleric', 'Paladin'] },
  { id: 'guiding-bolt',     name: 'Guiding Bolt',       level: 1, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: '1 round', concentration: false, description: 'A flash of light streaks toward a creature. Make a ranged spell attack. On a hit: 4d6 radiant damage, and the next attack roll against the creature before the end of your next turn has advantage. +1d6 per slot level above 1st.', classes: ['Cleric'], scalingDice: { baseDice: '4d6', addPerLevel: '1d6', baseLevel: 1 } },
  { id: 'hex',              name: 'Hex',                level: 1, school: 'Enchantment',   castingTime: '1 bonus action', range: '90ft', components: 'V, S, M (eye of newt)', duration: 'Concentration, 1 hour', concentration: true, description: 'You place a curse on a creature. Until the spell ends, you deal an extra 1d6 necrotic damage whenever you hit that target with an attack, and the target has disadvantage on ability checks using one ability score you choose. If the target drops to 0 HP, you can use a bonus action to move the hex.', classes: ['Warlock'], attackBuff: { bonusDmg: '1d6', bonusDmgType: 'necrotic' } },
  { id: 'hunter-s-mark',   name: "Hunter's Mark",       level: 1, school: 'Divination',    castingTime: '1 bonus action', range: '90ft', components: 'V', duration: 'Concentration, 1 hour', concentration: true, description: "You choose a creature and mystically mark it as your quarry. Until the spell ends, you deal an extra 1d6 damage to the target whenever you hit it with a weapon attack, and you have advantage on Perception and Survival checks to find it. If the target drops to 0 HP, you can use a bonus action to mark a new creature.", classes: ['Ranger'], attackBuff: { bonusDmg: '1d6', bonusDmgType: 'weapon' } },
  { id: 'detect-magic',     name: 'Detect Magic',       level: 1, school: 'Divination',    castingTime: '1 action', range: 'Self', components: 'V, S', duration: 'Concentration, 10 minutes', concentration: true, description: 'For the duration, you sense the presence of magic within 30ft of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object that bears magic, and you learn its school if any.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'mage-armor',       name: 'Mage Armor',         level: 1, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (cured leather)', duration: '8 hours', concentration: false, description: 'You touch a willing creature who is not wearing armor, and a protective magical force surrounds them until the spell ends. The target\'s base AC becomes 13 + their Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.', classes: ['Sorcerer', 'Wizard'] },
  { id: 'inflict-wounds',   name: 'Inflict Wounds',     level: 1, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'Make a melee spell attack against a creature you can reach. On a hit, deal 3d10 necrotic damage. +1d10 per slot level above 1st.', classes: ['Cleric'], scalingDice: { baseDice: '3d10', addPerLevel: '1d10', baseLevel: 1 } },
  { id: 'sanctuary',        name: 'Sanctuary',          level: 1, school: 'Abjuration',    castingTime: '1 bonus action', range: '30ft', components: 'V, S, M (holy water)', duration: '1 minute', concentration: false, description: 'You ward a creature within range against attack. Until the spell ends, any creature that targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. On a failed save, it must choose a new target or lose the attack or spell. The spell ends if the warded creature attacks, casts a spell, or takes harmful actions.', classes: ['Artificer', 'Cleric'] },
  { id: 'hellish-rebuke',   saveAbility: 'dex', name: 'Hellish Rebuke',     level: 1, school: 'Evocation',     castingTime: '1 reaction', range: '60ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'When you are damaged by a creature within range, you can use your reaction to point your finger and surround that creature with hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half on a success. +1d10 per slot level above 1st.', classes: ['Warlock'], scalingDice: { baseDice: '2d10', addPerLevel: '1d10', baseLevel: 1 } },
  { id: 'entangle',         saveAbility: 'str', name: 'Entangle',           level: 1, school: 'Conjuration',   castingTime: '1 action', range: '90ft',  components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'Grasping weeds and vines sprout from the ground in a 20ft square. For the duration, these plants turn the area into difficult terrain. A creature in the area when you cast must succeed on a Strength saving throw or be restrained until the spell ends. A creature can use its action to make a Strength check against your spell save DC.', classes: ['Druid'] },
  { id: 'faerie-fire',      saveAbility: 'dex', name: 'Faerie Fire',        level: 1, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: 'Each object in a 20ft cube within range is outlined in blue, green, or violet light. Any creature in the area when cast must succeed on a Dexterity saving throw or also be outlined in light. Outlined objects and affected creatures shed dim light in a 10ft radius, can\'t benefit from being invisible, and attack rolls against them have advantage.', classes: ['Bard', 'Druid'] },
  { id: 'fog-cloud',        name: 'Fog Cloud',          level: 1, school: 'Conjuration',   castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Concentration, 1 hour', concentration: true, description: 'You create a 20ft-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is heavily obscured. It lasts for the duration or until a wind of moderate or greater speed (at least 10 mph) disperses it. Radius increases by +20ft per slot level above 1st.', classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard'] },
  { id: 'longstrider',      name: 'Longstrider',        level: 1, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (pinch of dirt)', duration: '1 hour', concentration: false, description: 'You touch a creature. Its speed increases by 10ft until the spell ends. +1 target per slot level above 1st.', classes: ['Bard', 'Druid', 'Ranger', 'Wizard', 'Artificer'] },
  { id: 'jump',             name: 'Jump',               level: 1, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (grasshopper\'s hind leg)', duration: '1 minute', concentration: false, description: "You touch a creature. The creature's jump distance is tripled until the spell ends.", classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'divine-favor',     name: 'Divine Favor',       level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: "Your prayer empowers you with divine radiance. Until the spell ends, your weapon attacks deal an extra 1d4 radiant damage on a hit.", classes: ['Paladin'], attackBuff: { bonusDmg: '1d4', bonusDmgType: 'radiant' } },
  { id: 'searing-smite',    name: 'Searing Smite',      level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The next time you hit a creature with a melee weapon attack during this spell's duration, your weapon flares with white-hot intensity and deals an extra 1d6 fire damage. The target must succeed on a Constitution saving throw or ignite in flames, taking 1d6 fire damage at the start of each of its turns until the spell ends. +1d6 per slot level above 1st.", classes: ['Paladin'] },
  { id: 'thunderous-smite', name: 'Thunderous Smite',   level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The first time you hit with a melee weapon attack during this spell's duration, your weapon rings with thunder audible to 300ft, and the attack deals an extra 2d6 thunder damage. Additionally, if the target is a creature, it must succeed on a Strength saving throw or be pushed 10ft and knocked prone.", classes: ['Paladin'] },
  { id: 'wrathful-smite',   name: 'Wrathful Smite',     level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The next time you hit with a melee weapon attack during this spell's duration, your attack deals an extra 1d6 psychic damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or become frightened of you until the spell ends. As an action, the creature can make another Wisdom saving throw to end the effect.", classes: ['Paladin'] },

  // ── Level 2 ───────────────────────────────────────────────────────────────
  { id: 'hold-person',      saveAbility: 'wis', name: 'Hold Person',        level: 2, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V, S, M (iron bar)', duration: 'Concentration, 1 minute', concentration: true, description: 'Choose a humanoid you can see. It must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw to end the effect. +1 creature per slot level above 2nd.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'invisibility',     name: 'Invisibility',       level: 2, school: 'Illusion',      castingTime: '1 action', range: 'Touch', components: 'V, S, M (eyelash in gum arabic)', duration: 'Concentration, 1 hour', concentration: true, description: 'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible. The spell ends for a target that attacks or casts a spell. +1 creature per slot level above 2nd.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'misty-step',       name: 'Misty Step',         level: 2, school: 'Conjuration',   castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Instantaneous', concentration: false, description: 'Briefly surrounded by silvery mist, you teleport up to 30ft to an unoccupied space that you can see.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'darkness',         name: 'Darkness',           level: 2, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, M (bat fur/drop of pitch)', duration: 'Concentration, 10 minutes', concentration: true, description: "Magical darkness spreads from a point you choose to fill a 15ft radius sphere for the duration. Darkvision can't see through it. If this darkness overlaps with an area of light created by a 2nd-level or lower spell, the light spell is dispelled.", classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'detect-thoughts',  saveAbility: 'wis' as const, name: 'Detect Thoughts',   level: 2, school: 'Divination',    castingTime: '1 action', range: 'Self',  components: 'V, S, M (copper piece)', duration: 'Concentration, 1 minute', concentration: true, description: "For the duration, you can read the thoughts of certain creatures. When you cast the spell, and as your action each turn, you can focus your mind on any creature within 30ft that you can see. You learn the surface thoughts of that creature. You can probe deeper; the creature makes a WIS saving throw against your spell save DC.", classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'mirror-image',     name: 'Mirror Image',       level: 2, school: 'Illusion',      castingTime: '1 action', range: 'Self', components: 'V, S', duration: '1 minute', concentration: false, description: 'Three illusory duplicates of yourself appear in your space. Until the spell ends, whenever a creature targets you with an attack, roll a d20 to determine whether the attack targets you or one of your duplicates. Duplicates are destroyed when hit and disappear when the spell ends.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'scorching-ray',    name: 'Scorching Ray',      level: 2, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several. Make a ranged spell attack for each ray. On a hit, deal 2d6 fire damage. +1 ray per slot level above 2nd.', classes: ['Sorcerer', 'Wizard'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'fire', damageFormula: '2d6', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif' }, multiTargetScaling: { kind: 'slot', baseCount: 3, perSlotAbove: 1, baseLevel: 2 } },
  { id: 'shatter',          saveAbility: 'con', name: 'Shatter',            level: 2, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S, M (chip of mica)', duration: 'Instantaneous', concentration: false, description: 'A sudden loud ringing noise causes a sphere of 10ft radius centered on a point you choose to erupt with shattering sound. Each creature there must make a Constitution saving throw. On failure: take 3d8 thunder damage. Half on success. Inorganic material takes an automatic failure. +1d8 per slot level above 2nd.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 2 }, aoeShape: 'sphere', aoeSize: 10, attackType: 'save', damageType: 'thunder', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif' } },
  { id: 'spiritual-weapon', name: 'Spiritual Weapon',   level: 2, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V, S', duration: '1 minute', concentration: false, description: 'You create a floating spectral weapon within range that lasts for the duration. When you cast the spell, and as a bonus action on each of your turns thereafter, you can move the weapon up to 20ft and make a melee spell attack against a creature within 5ft. On a hit, deal 1d8 + spellcasting modifier force damage. +1d8 per 2 slot levels above 2nd.', classes: ['Cleric'] },
  { id: 'lesser-restoration', name: 'Lesser Restoration', level: 2, school: 'Abjuration', castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You touch a creature and can end either one disease or one condition afflicting it. The condition can be blinded, deafened, paralyzed, or poisoned.', classes: ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'] },
  { id: 'magic-weapon',     name: 'Magic Weapon',       level: 2, school: 'Transmutation', castingTime: '1 bonus action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 hour', concentration: true, description: "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. At 4th level: +2 bonus. At 6th level: +3 bonus.", classes: ['Paladin', 'Wizard'], attackBuff: { toHit: 1, bonusDmg: '1', bonusDmgType: 'magical' } },
  { id: 'suggestion',       saveAbility: 'wis', name: 'Suggestion',         level: 2, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, M (snake tongue, honeycomb)', duration: 'Concentration, 8 hours', concentration: true, description: 'You suggest a course of activity to a creature that can hear and understand you. The creature must make a Wisdom saving throw or follow the suggestion. The activity must be worded so it seems reasonable. The spell ends if the creature completes it or is harmed.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'silence',          name: 'Silence',            level: 2, school: 'Illusion',      castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Concentration, 10 minutes', concentration: true, description: 'For the duration, no sound can be created within or pass through a 20ft-radius sphere centered on a point you choose. Any creature or object entirely inside the sphere is immune to thunder damage and is deafened. Casting a spell that includes a verbal component is impossible there.', classes: ['Bard', 'Cleric', 'Ranger'] },
  { id: 'moonbeam',         saveAbility: 'con', name: 'Moonbeam',           level: 2, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (moonseed leaf, opalescent feldspar)', duration: 'Concentration, 1 minute', concentration: true, description: "A silvery beam of pale light shines in a 5ft-radius, 40ft-tall cylinder centered on a point. Each creature in the cylinder must make a Constitution saving throw on start of your turn when you cast, taking 2d10 radiant on failure (half on success). Shapechangers have disadvantage. +1d10 per slot level above 2nd.", classes: ['Druid'], scalingDice: { baseDice: '2d10', addPerLevel: '1d10', baseLevel: 2 } },
  { id: 'prayer-of-healing', name: 'Prayer of Healing', level: 2, school: 'Evocation',    castingTime: '10 minutes', range: '30ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'Up to six creatures of your choice within range each regain hit points equal to 2d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 2nd.', classes: ['Cleric'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 2 } },
  { id: 'spike-growth',     name: 'Spike Growth',       level: 2, school: 'Transmutation', castingTime: '1 action', range: '150ft', components: 'V, S, M (seven thorns/twigs)', duration: 'Concentration, 10 minutes', concentration: true, description: 'The ground in a 20ft radius centered on a point becomes difficult terrain covered in spikes. When a creature moves into or within the area, it takes 2d4 piercing damage for every 5ft of movement in the area. The transformation is camouflaged; DC 15 Perception check to notice before entering.', classes: ['Druid', 'Ranger'] },
  { id: 'enlarge-reduce',   name: 'Enlarge/Reduce',     level: 2, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V, S, M (pinch of iron/iron filings)', duration: 'Concentration, 1 minute', concentration: true, description: 'You cause a creature or object to grow larger or smaller. If enlarged: double in size, +1d4 weapon damage, advantage on Strength checks and saving throws. If reduced: half size, -1d4 weapon damage, disadvantage on Strength checks and saving throws.', classes: ['Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'aid',              name: 'Aid',                level: 2, school: 'Abjuration',    castingTime: '1 action', range: '30ft',  components: 'V, S, M (tiny white bandage strip)', duration: '8 hours', concentration: false, description: "Your spell bolsters up to three creatures. Each target's hit point maximum and current hit points increase by 5 for the duration. +5 HP per slot level above 2nd.", classes: ['Artificer', 'Bard', 'Cleric', 'Paladin'] },
  { id: 'blindness-deafness', saveAbility: 'con', name: 'Blindness/Deafness', level: 2, school: 'Necromancy', castingTime: '1 action', range: '30ft',  components: 'V', duration: '1 minute', concentration: false, description: 'You can blind or deafen a foe. Choose one creature you can see within range to make a Constitution saving throw. On a failure, the target is blinded or deafened (your choice) for the duration. The target can make a Constitution saving throw at the end of each of its turns. +1 creature per slot level above 2nd.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'] },

  // ── Level 3 ───────────────────────────────────────────────────────────────
  { id: 'fireball',         saveAbility: 'dex', name: 'Fireball',           level: 3, school: 'Evocation',     castingTime: '1 action', range: '150ft', components: 'V, S, M (bat guano, sulfur)', duration: 'Instantaneous', concentration: false, description: 'A bright streak flashes from your pointing finger and then blossoms with a low roar into an explosion of flame. Each creature in a 20ft-radius sphere must make a Dexterity saving throw. Failure: 8d6 fire damage. Success: half damage. The fire spreads around corners. +1d6 per slot level above 3rd.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d6', addPerLevel: '1d6', baseLevel: 3 }, aoeShape: 'sphere', aoeSize: 20, attackType: 'save', damageType: 'fire', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif' } },
  { id: 'lightning-bolt',   saveAbility: 'dex', name: 'Lightning Bolt',     level: 3, school: 'Evocation',     castingTime: '1 action', range: 'Self (100ft line)', components: 'V, S, M (fur, amber/crystal/glass rod)', duration: 'Instantaneous', concentration: false, description: 'A stroke of lightning forming a 100ft-long, 5ft-wide line blasts out from you. Each creature in the line must make a Dexterity saving throw. Failure: 8d6 lightning damage. Success: half damage. The lightning ignites flammable objects. +1d6 per slot level above 3rd.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d6', addPerLevel: '1d6', baseLevel: 3 } },
  { id: 'counterspell',     name: 'Counterspell',       level: 3, school: 'Abjuration',    castingTime: '1 reaction', range: '60ft', components: 'S', duration: 'Instantaneous', concentration: false, description: "You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability: DC 10 + the spell's level. On success, the spell fails. Upcast to automatically counter higher level spells.", classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'dispel-magic',     name: 'Dispel Magic',       level: 3, school: 'Abjuration',    castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: "Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends. For each spell of 4th level or higher on the target, make an ability check: DC 10 + the spell's level. On success, the spell ends. Upcast to automatically dispel higher level spells.", classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'haste',            name: 'Haste',              level: 3, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V, S, M (shaving of licorice root)', duration: 'Concentration, 1 minute', concentration: true, description: "Choose a willing creature you can see. Until the spell ends: target's speed doubled, +2 AC, advantage on Dexterity saving throws, and gains an additional action on each of its turns. When the spell ends, the target can't move or take actions until after its next turn, as lethargy overcomes it.", classes: ['Sorcerer', 'Wizard'] },
  { id: 'fly',              name: 'Fly',                level: 3, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (wing feather)', duration: 'Concentration, 10 minutes', concentration: true, description: 'You touch a willing creature. The target gains a flying speed of 60ft for the duration. When the spell ends, the target falls if it is still aloft, unless it can stop the fall. +1 target per slot level above 3rd.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'hypnotic-pattern', saveAbility: 'wis', name: 'Hypnotic Pattern',   level: 3, school: 'Illusion',      castingTime: '1 action', range: '120ft', components: 'S, M (glowing stick/phosphorescent moss)', duration: 'Concentration, 1 minute', concentration: true, description: 'You create a twisting pattern of colors in a 30ft cube. Each creature in the area must make a Wisdom saving throw. On failure, the creature becomes charmed for the duration. While charmed, the creature is incapacitated and its speed drops to 0. The effect ends for an affected creature if it takes damage or if someone else uses an action to shake it out of its stupor.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'spirit-guardians', saveAbility: 'wis', name: 'Spirit Guardians',   level: 3, school: 'Conjuration',   castingTime: '1 action', range: 'Self (15ft radius)', components: 'V, S, M (holy symbol)', duration: 'Concentration, 10 minutes', concentration: true, description: 'You call forth spirits to protect you. They flit around you to a distance of 15ft. Until the spell ends, the area is difficult terrain for enemies, and when an enemy first enters the area on a turn or starts its turn there, it must make a Wisdom saving throw. Failure: 3d8 radiant/necrotic damage. Half on success. +1d8 per slot level above 3rd.', classes: ['Cleric'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 3 } },
  { id: 'mass-healing-word', name: 'Mass Healing Word', level: 3, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'As you call out words of restoration, up to six creatures of your choice that you can see within range regain hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d4 per slot level above 3rd.', classes: ['Bard', 'Cleric'], scalingDice: { baseDice: '1d4', addPerLevel: '1d4', baseLevel: 3 } },
  { id: 'revivify',         name: 'Revivify',           level: 3, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (diamonds worth 300gp)', duration: 'Instantaneous', concentration: false, description: 'You touch a creature that has died within the last minute. That creature returns to life with 1 hit point. This spell can\'t return to life a creature that has died of old age, nor can it restore any missing body parts.', classes: ['Artificer', 'Cleric', 'Paladin'] },
  { id: 'animate-dead',     name: 'Animate Dead',       level: 3, school: 'Necromancy',    castingTime: '1 minute', range: '10ft',  components: 'V, S, M (drop of blood, bone fragment, pinch of grave dirt)', duration: 'Instantaneous', concentration: false, description: "This spell creates an undead servant. Choose a pile of bones or a corpse of a Medium or Small humanoid within range. Your spell imbues the target with a foul mimicry of life, raising it as an undead creature. It obeys your verbal commands. +2 undead per slot level above 3rd.", classes: ['Cleric', 'Wizard'] },
  { id: 'vampiric-touch',   name: 'Vampiric Touch',     level: 3, school: 'Necromancy',    castingTime: '1 action', range: 'Self', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'The touch of your shadow-wreathed hand can siphon life force. Make a melee spell attack against a creature within your reach. On a hit, deal 3d6 necrotic damage, and you regain HP equal to half the amount of necrotic damage dealt. Until the spell ends, you can make the attack again on each of your turns. +1d6 per slot level above 3rd.', classes: ['Warlock', 'Wizard'], scalingDice: { baseDice: '3d6', addPerLevel: '1d6', baseLevel: 3 } },
  { id: 'slow',             saveAbility: 'wis', name: 'Slow',               level: 3, school: 'Transmutation', castingTime: '1 action', range: '120ft', components: 'V, S, M (molasses)', duration: 'Concentration, 1 minute', concentration: true, description: 'You alter time around up to six creatures of your choice. Each target must succeed on a Wisdom saving throw or be affected for the duration: half speed, -2 AC and Dex saves, can\'t use reactions, only one action or bonus action per turn, and can\'t make more than one melee or ranged attack per turn.', classes: ['Sorcerer', 'Wizard'] },

  // ── Level 4 ───────────────────────────────────────────────────────────────
  { id: 'banishment',       saveAbility: 'cha', name: 'Banishment',         level: 4, school: 'Abjuration',    castingTime: '1 action', range: '60ft',  components: 'V, S, M (repulsive object)', duration: 'Concentration, 1 minute', concentration: true, description: 'You attempt to send one creature that you can see within range to another plane of existence. The target must succeed on a Charisma saving throw or be banished. If the target is native to the plane you\'re on, it appears in a random spot on a harmless demiplane and is incapacitated until the spell ends. If the spell lasts the full minute, the target is permanently banished. +1 creature per slot level above 4th.', classes: ['Cleric', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'polymorph',        saveAbility: 'wis', name: 'Polymorph',          level: 4, school: 'Transmutation', castingTime: '1 action', range: '60ft',  components: 'V, S, M (caterpillar cocoon)', duration: 'Concentration, 1 hour', concentration: true, description: 'This spell transforms a creature you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. The transformation lasts for the duration, or until the target drops to 0 HP or dies. The target\'s game statistics are replaced by those of the chosen beast.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'] },
  { id: 'greater-invisibility', name: 'Greater Invisibility', level: 4, school: 'Illusion', castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You or a creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person. The spell does not end when the target attacks or casts a spell.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'death-ward',       name: 'Death Ward',         level: 4, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: '8 hours', concentration: false, description: 'You touch a creature and grant it a measure of protection from death. The first time the target would drop to 0 hit points as a result of taking damage, the target instead drops to 1 hit point, and the spell ends. If the spell is still in effect when the target is subjected to an effect that would kill it instantly without dealing damage, that effect is instead negated against the target, and the spell ends.', classes: ['Cleric', 'Paladin'] },
  { id: 'confusion',        saveAbility: 'wis', name: 'Confusion',          level: 4, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (three nutshells)', duration: 'Concentration, 1 minute', concentration: true, description: 'This spell assaults and twists creatures\'s minds, spawning delusions and provoking uncontrolled action. Each creature in a 10ft-radius sphere centered on a point you choose must succeed on a Wisdom saving throw or be affected for the duration. An affected creature can\'t take reactions and must roll a d10 at the start of each of its turns to determine its behavior.', classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'] },

  // ── Level 5 ───────────────────────────────────────────────────────────────
  { id: 'hold-monster',     saveAbility: 'wis', name: 'Hold Monster',       level: 5, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (iron bar)', duration: 'Concentration, 1 minute', concentration: true, description: 'Choose a creature you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. This spell has no effect on undead. At the end of each of its turns, the target can make another Wisdom saving throw to end the effect. +1 creature per slot level above 5th.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'cone-of-cold',     saveAbility: 'con', name: 'Cone of Cold',       level: 5, school: 'Evocation',     castingTime: '1 action', range: 'Self (60ft cone)', components: 'V, S, M (crystal/glass cone)', duration: 'Instantaneous', concentration: false, description: 'A blast of cold air erupts from your hands. Each creature in a 60ft cone must make a Constitution saving throw. Failure: 8d8 cold damage. Half on success. A creature killed by this spell becomes a frozen statue until it thaws. +1d8 per slot level above 5th.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d8', addPerLevel: '1d8', baseLevel: 5 }, aoeShape: 'cone', aoeSize: 60, attackType: 'save', damageType: 'cold', sprites: { hit: '/assets/spells/hit/Blood_Effect.gif', miss: '/assets/spells/miss/Poof_Effect.gif' } },
  { id: 'mass-cure-wounds', name: 'Mass Cure Wounds',   level: 5, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A wave of healing energy washes out from a point. Choose up to six creatures in a 30ft-radius sphere. Each target regains hit points equal to 3d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 5th.', classes: ['Bard', 'Cleric', 'Druid'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 5 } },
  { id: 'dominate-person',  saveAbility: 'wis', name: 'Dominate Person',    level: 5, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You attempt to beguile a humanoid. The target must succeed on a Wisdom saving throw or be charmed. While charmed, you have a telepathic link and can issue commands as a bonus action. The dominated creature must do its best to obey. Each time the target takes damage, it makes a new saving throw.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'raise-dead',       name: 'Raise Dead',         level: 5, school: 'Necromancy',    castingTime: '1 hour', range: 'Touch', components: 'V, S, M (diamonds worth 500gp)', duration: 'Instantaneous', concentration: false, description: "You return a dead creature to life if it has been dead no longer than 10 days. If the creature's soul is both willing and at liberty, the creature returns to life with 1 hit point. This spell also neutralizes any poisons and cures non-magical diseases. It doesn't remove magical diseases, curses, or similar effects.", classes: ['Bard', 'Cleric', 'Paladin'] },
  { id: 'wall-of-force',    name: 'Wall of Force',      level: 5, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (pinch of powder from clear gem)', duration: 'Concentration, 10 minutes', concentration: true, description: 'An invisible wall of force springs into existence at a point you choose. The wall can be up to 10 panels, each 10ft × 10ft. The wall is immune to all damage and can\'t be dispelled by dispel magic. A disintegrate spell destroys the wall instantly. Nothing can physically pass through the wall.', classes: ['Wizard'] },

  // ── Tasha's Cauldron of Everything ──────────────────────────────────────────
  // Cantrips
  { id: 'booming-blade',    name: 'Booming Blade',      level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (5ft)',  components: 'S, M (melee weapon worth 1sp+)', duration: 'Instantaneous', concentration: false, description: 'You brandish the weapon and make one melee weapon attack. On a hit it deals normal damage, and the target is surrounded by booming energy until the start of your next turn. If it moves before then, it takes 1d8 thunder damage (2d8 at 11th, 3d8 at 17th). At 5th level, the hit also deals +1d8 thunder damage (2d8 at 11th, 3d8 at 17th).', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'green-flame-blade', name: 'Green-Flame Blade', level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (5ft)',  components: 'S, M (melee weapon worth 1sp+)', duration: 'Instantaneous', concentration: false, description: 'You brandish the weapon and make one melee weapon attack. On a hit, green fire leaps from the target to one creature within 5 ft that you can see, dealing fire damage equal to your spellcasting modifier. Both the attack damage and the leaping fire increase at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'mind-sliver',      saveAbility: 'int', name: 'Mind Sliver',       level: 0, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You drive a disorienting spike of psychic energy into the mind of one creature you can see in range. The target must succeed on an Intelligence saving throw or take 1d6 psychic damage and subtract 1d4 from the next saving throw it makes before the end of your next turn. The damage increases by 1d6 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'lightning-lure',   name: 'Lightning Lure',     level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft)', components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You create a lash of lightning energy that strikes one creature within 15 ft of you. The target must succeed on a Strength saving throw or be pulled up to 10 ft toward you and take 1d8 lightning damage. The damage increases by 1d8 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'sword-burst',      saveAbility: 'dex', name: 'Sword Burst',       level: 0, school: 'Conjuration',   castingTime: '1 action', range: 'Self (5ft)',  components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You create a momentary circle of spectral blades that sweep around you. All other creatures within 5 ft of you must each succeed on a Dexterity saving throw or take 1d6 force damage. The damage increases by 1d6 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  // Level 1
  { id: 'silvery-barbs',    name: 'Silvery Barbs',      level: 1, school: 'Enchantment',   castingTime: '1 reaction', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'When a creature you can see within range succeeds on an attack roll, ability check, or saving throw, use your reaction to force it to reroll and use the lower result. You then choose a different creature within range (or yourself); that creature has advantage on its next attack roll, ability check, or saving throw within 1 minute.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'tashas-caustic-brew', name: "Tasha's Caustic Brew", level: 1, school: 'Evocation', castingTime: '1 action', range: 'Self (30ft line)', components: 'V, S, M (lime and spit)', duration: 'Concentration, 1 minute', concentration: true, description: 'A stream of acid sprays from your mouth in a line 30 ft long and 5 ft wide. Each creature in the line must succeed on a Dexterity saving throw or be covered in acid for the spell\'s duration. A covered creature takes 2d4 acid damage at the start of each of its turns. It can use its action to remove the acid. +2d4 per slot level above 1st.', classes: ['Artificer', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d4', addPerLevel: '2d4', baseLevel: 1 } },
  // Level 2
  { id: 'intellect-fortress', name: 'Intellect Fortress', level: 2, school: 'Abjuration',  castingTime: '1 action', range: '30ft', components: 'V', duration: 'Concentration, 1 hour', concentration: true, description: 'For the duration, the target creature has resistance to psychic damage and advantage on Intelligence, Wisdom, and Charisma saving throws. You can target one additional creature for each slot level above 2nd.', classes: ['Artificer', 'Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'vortex-warp',      name: 'Vortex Warp',        level: 2, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You magically twist space around another creature you can see within range. The target must succeed on a Constitution saving throw or be teleported to an unoccupied space of your choice within range. The chosen space must be on the ground or on a floor. Willing creatures automatically fail the save.', classes: ['Artificer', 'Sorcerer', 'Wizard'] },
  // Level 3
  { id: 'summon-beast',     name: 'Summon Beast',       level: 3, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S, M (feather, tuft of fur, fish tail — each worth 200gp)', duration: 'Concentration, 1 hour', concentration: true, description: 'You call forth a bestial spirit. It manifests in an unoccupied space within range. Use the Beast Spirit stat block and choose the spirit\'s form: Air, Land, or Water. The creature disappears when it drops to 0 HP or when the spell ends. The spirit\'s attacks deal an extra 1d8 damage for each slot level above 3rd.', classes: ['Druid', 'Ranger'] },
  { id: 'summon-fey',       name: 'Summon Fey',         level: 3, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S, M (gilded flower worth 300gp)', duration: 'Concentration, 1 hour', concentration: true, description: 'You call forth a fey spirit. It manifests in an unoccupied space within range. Choose a mood for the spirit: Fuming, Mirthful, or Tricksy — this determines some of its capabilities. The spirit disappears when it drops to 0 HP or when the spell ends. The spirit\'s attacks deal an extra 1d6 damage for each slot level above 3rd.', classes: ['Druid', 'Ranger', 'Warlock'] },
]

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s])) as Record<string, SpellEntry>

export function spellLabel(id: string): string {
  const spell = SPELL_BY_ID[id]
  if (!spell) return id
  const level = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`
  return `${spell.name} — ${level}`
}

export function spellsForClass(classId: string): SpellEntry[] {
  return SPELLS.filter(s => s.classes.includes(classId))
}

/** Returns spells available to a class up to the given slot level. Cantrips (level 0) are always included. */
export function getSelectableSpells(classId: string, maxSlotLevel: number): SpellEntry[] {
  return SPELLS.filter(s => s.classes.includes(classId) && (s.level === 0 || s.level <= maxSlotLevel))
}

export function computeUpcastDice(scaling: SpellScaling, castLevel: number): string {
  const delta = Math.max(0, castLevel - scaling.baseLevel)
  if (delta === 0) return scaling.baseDice
  const bm = scaling.baseDice.match(/^(\d+)(d\d+)$/)
  const am = scaling.addPerLevel.match(/^(\d+)(d\d+)$/)
  if (bm && am && bm[2] === am[2]) {
    return `${parseInt(bm[1]) + delta * parseInt(am[1])}${bm[2]}`
  }
  return `${scaling.baseDice} + ${delta}×${scaling.addPerLevel}`
}

/**
 * Compute a tile-grid layout for visualizing a damage spell.
 * Returns dimensions, player positions (A/B toggle), enemy positions for hit/miss
 * scenarios, and the spell area cells.
 *
 * Tile = 5ft. Grid origin (0,0) is top-left.
 */
export function computeSpellGrid(
  spell: SpellEntry,
  slotLevel?: number,
  characterLevel?: number,
): SpellGridLayout {
  const shape = spell.aoeShape ?? 'single'
  const size = spell.aoeSize ?? 0

  if (shape === 'single') {
    // Multi-target spells (Magic Missile, Scorching Ray, Eldritch Blast) place
    // one enemy per ray/dart/beam at the current slot or character level.
    let enemyCount = 1
    if (spell.multiTargetScaling) {
      const m = spell.multiTargetScaling
      if (m.kind === 'slot') {
        const lvl = slotLevel ?? m.baseLevel
        enemyCount = m.baseCount + Math.max(0, lvl - m.baseLevel) * (m.perSlotAbove ?? 1)
      } else {
        const lvl = characterLevel ?? 1
        const match = [...m.thresholds].reverse().find(t => lvl >= t.level)
        enemyCount = match?.count ?? m.thresholds[0]?.count ?? 1
      }
    }

    const cols = Math.max(3, Math.min(9, enemyCount + 2))
    const rows = 8
    const enemyRowY = rows - 1
    // Center the row of enemies in the grid
    const startX = Math.max(0, Math.floor((cols - enemyCount) / 2))
    const positions = Array.from({ length: enemyCount }, (_, i) => ({
      x: Math.min(cols - 1, startX + i),
      y: enemyRowY,
    }))

    return {
      cols, rows,
      playerPosA: { x: Math.floor(cols / 2), y: 0 },
      playerPosB: { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
      enemyHitPositions:  positions,
      enemyMissPositions: positions,
      areaCells: [],
    }
  }

  if (shape === 'sphere') {
    const radiusTiles = Math.ceil(size / 5)
    const side = Math.max(9, radiusTiles * 2 + 5)
    const centerX = Math.floor(side / 2)
    const centerY = side - radiusTiles - 2
    const areaCells: { x: number; y: number }[] = []
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const dx = x - centerX
        const dy = y - centerY
        if (Math.sqrt(dx * dx + dy * dy) <= radiusTiles) areaCells.push({ x, y })
      }
    }
    const inside = areaCells.filter(c => !(c.x === centerX && c.y === centerY))
    const outsideEnemies: { x: number; y: number }[] = [
      { x: Math.max(0, centerX - radiusTiles - 1), y: centerY },
      { x: Math.min(side - 1, centerX + radiusTiles + 1), y: centerY },
    ].filter(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2) > radiusTiles)
    return {
      cols: side, rows: side,
      playerPosA: { x: centerX, y: 0 },
      playerPosB: { x: 1, y: 0 },
      enemyHitPositions:  inside.slice(0, Math.min(3, inside.length)),
      enemyMissPositions: outsideEnemies,
      areaCells,
    }
  }

  if (shape === 'cone') {
    const lenTiles = Math.ceil(size / 5)
    const cols = Math.max(7, lenTiles + 2)
    const rows = Math.max(7, lenTiles + 2)
    const apexX = Math.floor(cols / 2)
    const apexY = 0
    const areaCells: { x: number; y: number }[] = []
    for (let depth = 1; depth <= lenTiles; depth++) {
      const y = apexY + depth
      if (y >= rows) break
      const half = Math.floor(depth / 2)
      for (let dx = -half; dx <= half; dx++) {
        const x = apexX + dx
        if (x >= 0 && x < cols) areaCells.push({ x, y })
      }
    }
    const midDepth = Math.floor(lenTiles / 2)
    const insideEnemies: { x: number; y: number }[] = [
      { x: apexX, y: apexY + midDepth },
      { x: apexX + 1, y: apexY + lenTiles - 1 },
    ].filter(p => areaCells.some(c => c.x === p.x && c.y === p.y))
    const outsideEnemies: { x: number; y: number }[] = [
      { x: Math.max(0, apexX - midDepth - 1), y: apexY + midDepth },
      { x: Math.min(cols - 1, apexX + midDepth + 1), y: apexY + midDepth },
    ]
    return {
      cols, rows,
      playerPosA: { x: apexX, y: apexY },
      playerPosB: { x: Math.max(0, apexX - 2), y: apexY },
      enemyHitPositions:  insideEnemies,
      enemyMissPositions: outsideEnemies,
      areaCells,
    }
  }

  if (shape === 'cube') {
    const sideTiles = Math.ceil(size / 5)
    const total = Math.max(7, sideTiles + 3)
    const startX = Math.floor((total - sideTiles) / 2)
    const startY = Math.floor(total * 0.4)
    const areaCells: { x: number; y: number }[] = []
    for (let y = startY; y < startY + sideTiles; y++) {
      for (let x = startX; x < startX + sideTiles; x++) {
        areaCells.push({ x, y })
      }
    }
    return {
      cols: total, rows: total,
      playerPosA: { x: Math.floor(total / 2), y: 0 },
      playerPosB: { x: 1, y: 0 },
      enemyHitPositions:  areaCells.slice(0, 3),
      enemyMissPositions: [{ x: 0, y: total - 1 }, { x: total - 1, y: total - 1 }],
      areaCells,
    }
  }

  // line
  const lenTiles = Math.ceil(size / 5)
  const cols = 3
  const rows = Math.max(5, lenTiles + 2)
  const areaCells: { x: number; y: number }[] = []
  for (let y = 1; y <= lenTiles && y < rows - 1; y++) areaCells.push({ x: 1, y })
  return {
    cols, rows,
    playerPosA: { x: 1, y: 0 },
    playerPosB: { x: 0, y: 0 },
    enemyHitPositions:  areaCells.slice(0, 2),
    enemyMissPositions: [{ x: 0, y: rows - 1 }, { x: 2, y: rows - 1 }],
    areaCells,
  }
}
