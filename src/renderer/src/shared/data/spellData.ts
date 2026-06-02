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
  /** Non-damage visualization templates. Leave undefined for damage spells (which use aoeShape+damageType). */
  vizCategory?: 'self-buff' | 'debuff-aura' | 'terrain'
  /** Sprite color theme for non-damage viz; falls back through the existing damage-type palette. */
  vizDamageType?: string
  /** Marks a spell that creates a summon; auto-creates the instance on cast. */
  summons?: { templateId: string; count?: number }
}

export interface SpellGridLayout {
  cols: number
  rows: number
  playerPosA: { x: number; y: number }
  playerPosB: { x: number; y: number }
  enemyHitPositions: { x: number; y: number }[]
  enemyMissPositions: { x: number; y: number }[]
  areaCells: { x: number; y: number }[]
  /** Populated for wall/line spells with two-point placement. */
  wallSpine?: { x: number; y: number }[]
}

export interface SpellGridConfig {
  /** Cone/line: the cell the player aimed at. Direction = player→aimTarget. */
  aimTarget?: { x: number; y: number }
  /** Sphere: 'square' = tile centre (default), 'intersection' = tile corner (+0.5, +0.5 shift). */
  sphereMode?: 'square' | 'intersection'
  /** Wall: explicit start+end cells. When null/absent, falls back to static straight-down layout. */
  wallPoints?: { start: { x: number; y: number }; end: { x: number; y: number } } | null
}

function bresenhamLine(
  x0: number, y0: number, x1: number, y1: number,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0, y = y0
  while (true) {
    cells.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
  return cells
}

export const SPELLS: SpellEntry[] = [
  // ── Cantrips (level 0) ────────────────────────────────────────────────────
  { id: 'fire-bolt',        name: 'Fire Bolt',          level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You hurl a mote of fire at a creature or object. Make a ranged spell attack. On a hit, deal 1d10 fire damage. A flammable object hit by this spell ignites. Damage increases to 2d10 at 5th level, 3d10 at 11th, and 4d10 at 17th.', classes: ['Sorcerer', 'Wizard', 'Artificer'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'fire' },
  { id: 'ray-of-frost',     name: 'Ray of Frost',       level: 0, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "A frigid beam of blue-white light streaks toward a creature. Make a ranged spell attack. On a hit, deal 1d8 cold damage and reduce the target's speed by 10ft until the start of your next turn. Damage scales at 5th, 11th, and 17th levels.", classes: ['Sorcerer', 'Wizard'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'cold' },
  { id: 'mage-hand',        name: 'Mage Hand',          level: 0, school: 'Conjuration',   castingTime: '1 action', range: '30ft',  components: 'V, S', duration: '1 minute', concentration: false, description: 'A spectral, floating hand appears at a point you choose. Use it to manipulate objects, open doors/containers, stow/retrieve items, or pour contents out. The hand weighs up to 10 pounds and vanishes after 1 minute or if you cast this again.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'vicious-mockery',  saveAbility: 'wis', name: 'Vicious Mockery',    level: 0, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V', duration: 'Instantaneous', concentration: false, description: "You unleash a string of insults laced with subtle enchantments. The target must succeed on a Wisdom saving throw or take 1d4 psychic damage and have disadvantage on the next attack roll it makes before the end of its next turn. Damage scales at 5th, 11th, and 17th levels.", classes: ['Bard'], aoeShape: 'single', attackType: 'save', damageType: 'psychic' },
  { id: 'sacred-flame',     saveAbility: 'dex', name: 'Sacred Flame',       level: 0, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "Flame-like radiance descends on a creature you can see. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage. The target gains no benefit from cover. Damage scales at 5th, 11th, and 17th levels.", classes: ['Cleric'], aoeShape: 'single', attackType: 'save', damageType: 'radiant' },
  { id: 'guidance',         name: 'Guidance',           level: 0, school: 'Divination',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check.', classes: ['Cleric', 'Druid', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'holy' },
  { id: 'chill-touch',      name: 'Chill Touch',        level: 0, school: 'Necromancy',    castingTime: '1 action', range: '120ft', components: 'V, S', duration: '1 round', concentration: false, description: 'You create a ghostly skeletal hand that clutches at the target. Make a ranged spell attack. On a hit, deal 1d8 necrotic damage and the target cannot regain HP until the start of your next turn. Undead also have disadvantage on attacks against you until then.', classes: ['Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'necrotic' },
  { id: 'toll-the-dead',    saveAbility: 'wis', name: 'Toll the Dead',      level: 0, school: 'Necromancy',    castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: "You point at one creature and the sound of a dolorous bell fills the air. The target must succeed on a Wisdom saving throw or take 1d8 necrotic damage. If the target is missing any hit points, it takes 1d12 instead. Scales at higher levels.", classes: ['Cleric', 'Warlock', 'Wizard'], aoeShape: 'single', attackType: 'save', damageType: 'necrotic' },
  { id: 'eldritch-blast',   name: 'Eldritch Blast',     level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A beam of crackling energy streaks toward a creature. Make a ranged spell attack. On a hit, the target takes 1d10 force damage. The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level.', classes: ['Warlock'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'force', damageFormula: '1d10', multiTargetScaling: { kind: 'charLevel', thresholds: [{ level: 1, count: 1 }, { level: 5, count: 2 }, { level: 11, count: 3 }, { level: 17, count: 4 }] } },
  { id: 'shillelagh',       name: 'Shillelagh',         level: 0, school: 'Transmutation', castingTime: '1 bonus action', range: 'Touch', components: 'V, S, M (mistletoe, shamrock leaf, club/quarterstaff)', duration: 'Concentration, 1 minute', concentration: true, description: 'The wood of a club or quarterstaff you are holding is imbued with nature\'s power. For the duration, you can use your spellcasting ability instead of Strength for attack and damage rolls using that weapon, and the weapon\'s damage die becomes a d8. The weapon also becomes magical.', classes: ['Druid'], vizCategory: 'self-buff', vizDamageType: 'weapon_glow' },
  { id: 'prestidigitation',  name: 'Prestidigitation',  level: 0, school: 'Transmutation', castingTime: '1 action', range: '10ft', components: 'V, S', duration: 'Up to 1 hour', concentration: false, description: 'Minor magical tricks: create a small sensory effect, light/snuff a small fire, clean/soil an object, chill/warm/flavor food, make a color or mark last 1 hour, produce a small trinket. Up to three non-instantaneous effects can be active simultaneously.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'light',            name: 'Light',              level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Touch', components: 'V, M (firefly/phosphorescent moss)', duration: '1 hour', concentration: false, description: 'You touch one object no larger than 10ft. It emits bright light in a 20ft radius and dim light for an additional 20ft. The light can be a color. Covering the object blocks the light. If you target an unwilling creature, it must succeed on a Dexterity saving throw.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'spare-the-dying',  name: 'Spare the Dying',    level: 0, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You touch a living creature that has 0 hit points. The creature becomes stable. This spell has no effect on undead or constructs.', classes: ['Cleric', 'Artificer'] },
  { id: 'minor-illusion',   name: 'Minor Illusion',     level: 0, school: 'Illusion',      castingTime: '1 action', range: '30ft',  components: 'S, M (bit of fleece)', duration: '1 minute', concentration: false, description: 'You create a sound or an image of an object within range that lasts until the end of the duration. You can create a sound, up to the volume of 4 humans shouting, or an image no larger than a 5ft cube. A creature can investigate with an Intelligence (Investigation) check against your spell save DC.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'terrain', vizDamageType: 'illusion_shimmer' },
  { id: 'thaumaturgy',      name: 'Thaumaturgy',        level: 0, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V', duration: 'Up to 1 minute', concentration: false, description: 'You manifest a minor wonder. Choose an effect: your voice booms, flames flicker, thunderclaps sound, the ground trembles, a door flies open/shut, or your eyes gleam. Up to three non-instantaneous effects at once.', classes: ['Cleric'] },
  { id: 'dancing-lights',   name: 'Dancing Lights',     level: 0, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (bit of phosphorus or wychwood)', duration: 'Concentration, 1 minute', concentration: true, description: 'You create up to four torch-sized lights within range. You can combine them into one glowing Medium form. As a bonus action, you can move the lights up to 60ft to a new spot within range. Each light sheds dim light in a 10ft radius.', classes: ['Bard', 'Sorcerer', 'Wizard'] },

  // ── Level 1 ───────────────────────────────────────────────────────────────
  { id: 'magic-missile',    name: 'Magic Missile',      level: 1, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice within range automatically, dealing 1d4+1 force damage. The darts strike simultaneously, and you can direct them at the same or different targets. +1 dart per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], aoeShape: 'single', attackType: 'auto-hit', damageType: 'force', multiTargetScaling: { kind: 'slot', baseCount: 3, perSlotAbove: 1, baseLevel: 1 } },
  { id: 'shield',           name: 'Shield',             level: 1, school: 'Abjuration',    castingTime: '1 reaction', range: 'Self', components: 'V, S', duration: '1 round', concentration: false, description: 'When you are hit by an attack or targeted by Magic Missile, an invisible barrier of magical force appears. Until the start of your next turn, you have +5 AC (including against the triggering attack) and you take no damage from magic missile.', classes: ['Sorcerer', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'defense' },
  { id: 'sleep',            name: 'Sleep',              level: 1, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (sand/rose petals/cricket)', duration: '1 minute', concentration: false, description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many HP of creatures this spell can affect. Creatures with the lowest current HP are affected first. Unconscious until the spell ends, they take damage, or a creature uses an action to wake them. +2d8 per slot level above 1st.', classes: ['Bard', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '5d8', addPerLevel: '2d8', baseLevel: 1 }, vizCategory: 'debuff-aura', vizDamageType: 'asleep', attackType: 'auto-hit' },
  { id: 'thunderwave',      saveAbility: 'con', name: 'Thunderwave',        level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft cube)', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A wave of thunderous force sweeps out from you. Each creature in a 15ft cube must succeed on a Constitution saving throw. On failure: take 2d8 thunder damage and be pushed 10ft away. On success: half damage, not pushed. Unsecured objects in the area are pushed. +1d8 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 1 }, aoeShape: 'cube', aoeSize: 15, attackType: 'save', damageType: 'thunder' },
  { id: 'burning-hands',    saveAbility: 'dex', name: 'Burning Hands',      level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft cone)', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A thin sheet of flames shoots from your outstretched fingertips. Each creature in a 15ft cone must make a Dexterity saving throw. On failure: take 3d6 fire damage. On success: half damage. Flammable objects ignite. +1d6 per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '3d6', addPerLevel: '1d6', baseLevel: 1 }, aoeShape: 'cone', aoeSize: 15, attackType: 'save', damageType: 'fire' },
  { id: 'cure-wounds',      name: 'Cure Wounds',        level: 1, school: 'Evocation',     castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Artificer'], scalingDice: { baseDice: '1d8', addPerLevel: '1d8', baseLevel: 1 } },
  { id: 'healing-word',     name: 'Healing Word',       level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'A creature of your choice within range regains HP equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d4 per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid'], scalingDice: { baseDice: '1d4', addPerLevel: '1d4', baseLevel: 1 } },
  { id: 'bless',            name: 'Bless',              level: 1, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, S, M (holy water)', duration: 'Concentration, 1 minute', concentration: true, description: 'You bless up to three creatures of your choice. Whenever a target makes an attack roll or saving throw before the spell ends, the target can roll a d4 and add the number rolled. +1 creature per slot level above 1st.', classes: ['Cleric', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'holy' },
  { id: 'guiding-bolt',     name: 'Guiding Bolt',       level: 1, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: '1 round', concentration: false, description: 'A flash of light streaks toward a creature. Make a ranged spell attack. On a hit: 4d6 radiant damage, and the next attack roll against the creature before the end of your next turn has advantage. +1d6 per slot level above 1st.', classes: ['Cleric'], scalingDice: { baseDice: '4d6', addPerLevel: '1d6', baseLevel: 1 }, aoeShape: 'single', attackType: 'attack-roll', damageType: 'radiant' },
  { id: 'hex',              name: 'Hex',                level: 1, school: 'Enchantment',   castingTime: '1 bonus action', range: '90ft', components: 'V, S, M (eye of newt)', duration: 'Concentration, 1 hour', concentration: true, description: 'You place a curse on a creature. Until the spell ends, you deal an extra 1d6 necrotic damage whenever you hit that target with an attack, and the target has disadvantage on ability checks using one ability score you choose. If the target drops to 0 HP, you can use a bonus action to move the hex.', classes: ['Warlock'], attackBuff: { bonusDmg: '1d6', bonusDmgType: 'necrotic' }, vizCategory: 'debuff-aura', vizDamageType: 'marked', attackType: 'auto-hit' },
  { id: 'hunter-s-mark',   name: "Hunter's Mark",       level: 1, school: 'Divination',    castingTime: '1 bonus action', range: '90ft', components: 'V', duration: 'Concentration, 1 hour', concentration: true, description: "You choose a creature and mystically mark it as your quarry. Until the spell ends, you deal an extra 1d6 damage to the target whenever you hit it with a weapon attack, and you have advantage on Perception and Survival checks to find it. If the target drops to 0 HP, you can use a bonus action to mark a new creature.", classes: ['Ranger'], attackBuff: { bonusDmg: '1d6', bonusDmgType: 'weapon' }, vizCategory: 'debuff-aura', vizDamageType: 'marked', attackType: 'auto-hit' },
  { id: 'detect-magic',     name: 'Detect Magic',       level: 1, school: 'Divination',    castingTime: '1 action', range: 'Self', components: 'V, S', duration: 'Concentration, 10 minutes', concentration: true, description: 'For the duration, you sense the presence of magic within 30ft of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object that bears magic, and you learn its school if any.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'mage-armor',       name: 'Mage Armor',         level: 1, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (cured leather)', duration: '8 hours', concentration: false, description: 'You touch a willing creature who is not wearing armor, and a protective magical force surrounds them until the spell ends. The target\'s base AC becomes 13 + their Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.', classes: ['Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'defense' },
  { id: 'inflict-wounds',   name: 'Inflict Wounds',     level: 1, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'Make a melee spell attack against a creature you can reach. On a hit, deal 3d10 necrotic damage. +1d10 per slot level above 1st.', classes: ['Cleric'], scalingDice: { baseDice: '3d10', addPerLevel: '1d10', baseLevel: 1 }, aoeShape: 'single', attackType: 'attack-roll', damageType: 'necrotic' },
  { id: 'sanctuary',        name: 'Sanctuary',          level: 1, school: 'Abjuration',    castingTime: '1 bonus action', range: '30ft', components: 'V, S, M (holy water)', duration: '1 minute', concentration: false, description: 'You ward a creature within range against attack. Until the spell ends, any creature that targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. On a failed save, it must choose a new target or lose the attack or spell. The spell ends if the warded creature attacks, casts a spell, or takes harmful actions.', classes: ['Artificer', 'Cleric'], vizCategory: 'self-buff', vizDamageType: 'defense' },
  { id: 'hellish-rebuke',   saveAbility: 'dex', name: 'Hellish Rebuke',     level: 1, school: 'Evocation',     castingTime: '1 reaction', range: '60ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'When you are damaged by a creature within range, you can use your reaction to point your finger and surround that creature with hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half on a success. +1d10 per slot level above 1st.', classes: ['Warlock'], scalingDice: { baseDice: '2d10', addPerLevel: '1d10', baseLevel: 1 }, aoeShape: 'single', attackType: 'save', damageType: 'fire' },
  { id: 'entangle',         saveAbility: 'str', name: 'Entangle',           level: 1, school: 'Conjuration',   castingTime: '1 action', range: '90ft',  components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'Grasping weeds and vines sprout from the ground in a 20ft square. For the duration, these plants turn the area into difficult terrain. A creature in the area when you cast must succeed on a Strength saving throw or be restrained until the spell ends. A creature can use its action to make a Strength check against your spell save DC.', classes: ['Druid'], aoeShape: 'cube', aoeSize: 20, vizCategory: 'terrain', vizDamageType: 'vines_grasping' },
  { id: 'faerie-fire',      saveAbility: 'dex', name: 'Faerie Fire',        level: 1, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: 'Each object in a 20ft cube within range is outlined in blue, green, or violet light. Any creature in the area when cast must succeed on a Dexterity saving throw or also be outlined in light. Outlined objects and affected creatures shed dim light in a 10ft radius, can\'t benefit from being invisible, and attack rolls against them have advantage.', classes: ['Bard', 'Druid'], vizCategory: 'debuff-aura', vizDamageType: 'illuminated', attackType: 'save' },
  { id: 'fog-cloud',        name: 'Fog Cloud',          level: 1, school: 'Conjuration',   castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Concentration, 1 hour', concentration: true, description: 'You create a 20ft-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is heavily obscured. It lasts for the duration or until a wind of moderate or greater speed (at least 10 mph) disperses it. Radius increases by +20ft per slot level above 1st.', classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard'], aoeShape: 'sphere', aoeSize: 20, vizCategory: 'terrain', vizDamageType: 'fog_cloud' },
  { id: 'longstrider',      name: 'Longstrider',        level: 1, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (pinch of dirt)', duration: '1 hour', concentration: false, description: 'You touch a creature. Its speed increases by 10ft until the spell ends. +1 target per slot level above 1st.', classes: ['Bard', 'Druid', 'Ranger', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'speed' },
  { id: 'jump',             name: 'Jump',               level: 1, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (grasshopper\'s hind leg)', duration: '1 minute', concentration: false, description: "You touch a creature. The creature's jump distance is tripled until the spell ends.", classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'speed' },
  { id: 'divine-favor',     name: 'Divine Favor',       level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: "Your prayer empowers you with divine radiance. Until the spell ends, your weapon attacks deal an extra 1d4 radiant damage on a hit.", classes: ['Paladin'], attackBuff: { bonusDmg: '1d4', bonusDmgType: 'radiant' }, vizCategory: 'self-buff', vizDamageType: 'holy' },
  { id: 'searing-smite',    name: 'Searing Smite',      level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The next time you hit a creature with a melee weapon attack during this spell's duration, your weapon flares with white-hot intensity and deals an extra 1d6 fire damage. The target must succeed on a Constitution saving throw or ignite in flames, taking 1d6 fire damage at the start of each of its turns until the spell ends. +1d6 per slot level above 1st.", classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'fire' },
  { id: 'thunderous-smite', name: 'Thunderous Smite',   level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The first time you hit with a melee weapon attack during this spell's duration, your weapon rings with thunder audible to 300ft, and the attack deals an extra 2d6 thunder damage. Additionally, if the target is a creature, it must succeed on a Strength saving throw or be pushed 10ft and knocked prone.", classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'thunder' },
  { id: 'wrathful-smite',   name: 'Wrathful Smite',     level: 1, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The next time you hit with a melee weapon attack during this spell's duration, your attack deals an extra 1d6 psychic damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or become frightened of you until the spell ends. As an action, the creature can make another Wisdom saving throw to end the effect.", classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'psychic' },
  { id: 'armor-of-agathys', name: 'Armor of Agathys',   level: 1, school: 'Abjuration',    castingTime: '1 action', range: 'Self', components: 'V, S, M (cup of water)', duration: '1 hour', concentration: false, description: 'A protective magical force surrounds you, manifesting as a spectral frost that covers you and your gear. You gain 5 temporary hit points for the duration. If a creature hits you with a melee attack while you have these temporary hit points, it takes 5 cold damage. +5 temp HP and +5 cold damage per slot level above 1st.', classes: ['Warlock'], scalingDice: { baseDice: '5', addPerLevel: '5', baseLevel: 1 }, vizCategory: 'self-buff', vizDamageType: 'frost' },
  { id: 'witch-bolt',       name: 'Witch Bolt',         level: 1, school: 'Evocation',     castingTime: '1 action', range: '30ft', components: 'V, S, M (twig from a tree struck by lightning)', duration: 'Concentration, 1 minute', concentration: true, description: 'A beam of crackling, blue energy lances out toward a creature within range, forming a sustained arc of lightning. Make a ranged spell attack. On a hit, deal 1d12 lightning damage. On each of your subsequent turns, you can use your action to deal 1d12 lightning damage to the target automatically. The spell ends if you use your action for anything else or if the target is ever outside the spell\'s range. +1d12 initial damage per slot level above 1st.', classes: ['Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'lightning', damageFormula: '1d12', scalingDice: { baseDice: '1d12', addPerLevel: '1d12', baseLevel: 1 } },
  { id: 'arms-of-hadar',    saveAbility: 'str', name: 'Arms of Hadar',      level: 1, school: 'Conjuration',   castingTime: '1 action', range: 'Self (10ft radius)', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You invoke the power of Hadar, the Dark Hunger. Tendrils of dark energy erupt from you and batter all creatures within 10ft of you. Each creature in that area must make a Strength saving throw. Failure: 2d6 necrotic damage and can\'t take reactions until its next turn. Success: half damage and no reaction loss. +1d6 per slot level above 1st.', classes: ['Warlock'], scalingDice: { baseDice: '2d6', addPerLevel: '1d6', baseLevel: 1 }, aoeShape: 'sphere', aoeSize: 10, attackType: 'save', damageType: 'necrotic' },
  { id: 'heroism',          name: 'Heroism',            level: 1, school: 'Enchantment',   castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'A willing creature you touch is imbued with bravery. Until the spell ends, the target is immune to being frightened and gains temporary hit points equal to your spellcasting ability modifier at the start of each of its turns. +1 creature per slot level above 1st.', classes: ['Bard', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'ray-of-sickness',  saveAbility: 'con', name: 'Ray of Sickness',    level: 1, school: 'Necromancy',    castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A ray of sickening greenish energy lashes out toward a creature within range. Make a ranged spell attack. On a hit: 2d8 poison damage and the target must succeed on a Constitution saving throw or be poisoned until the end of your next turn. +1d8 per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 1 }, aoeShape: 'single', attackType: 'attack-roll', damageType: 'poison' },
  { id: 'bane',             saveAbility: 'cha', name: 'Bane',               level: 1, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, S, M (drop of blood)', duration: 'Concentration, 1 minute', concentration: true, description: 'Up to three creatures of your choice that you can see within range must make a Charisma saving throw. Whenever a target that fails this save makes an attack roll or saving throw before the spell ends, the target must roll a d4 and subtract the number rolled from the attack roll or saving throw. +1 creature per slot level above 1st.', classes: ['Bard', 'Cleric'], vizCategory: 'debuff-aura', vizDamageType: 'necrotic' },
  { id: 'command',          saveAbility: 'wis', name: 'Command',            level: 1, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V', duration: '1 round', concentration: false, description: "You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn (typical: Approach, Drop, Flee, Grovel, Halt). Common upcast: +1 creature per slot level above 1st.", classes: ['Cleric', 'Paladin'], vizCategory: 'debuff-aura', vizDamageType: 'psychic' },
  { id: 'charm-person',     saveAbility: 'wis', name: 'Charm Person',       level: 1, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, S', duration: '1 hour', concentration: false, description: 'You attempt to charm a humanoid you can see within range. It must make a Wisdom saving throw, and does so with advantage if you or your companions are fighting it. On a failed save, it is charmed by you until the spell ends or until you or your companions do anything harmful to it. +1 creature per slot level above 1st.', classes: ['Bard', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'psychic' },
  { id: 'disguise-self',    name: 'Disguise Self',      level: 1, school: 'Illusion',      castingTime: '1 action', range: 'Self',  components: 'V, S', duration: '1 hour', concentration: false, description: "You make yourself — including your clothing, armor, weapons, and other belongings on your person — look different until the spell ends or you use your action to dismiss it. You can change your apparent height by up to 1 foot and your build by a similar amount. Physical inspection (Investigation check vs. spell save DC) reveals the illusion.", classes: ['Bard', 'Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'false-life',       name: 'False Life',         level: 1, school: 'Necromancy',    castingTime: '1 action', range: 'Self',  components: 'V, S, M (small amount of alcohol or distilled spirits)', duration: '1 hour', concentration: false, description: 'Bolstering yourself with a necromantic facsimile of life, you gain 1d4 + 4 temporary hit points for the duration. +5 temp HP per slot level above 1st.', classes: ['Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'necrotic' },
  { id: 'identify',         name: 'Identify',           level: 1, school: 'Divination',    castingTime: '1 minute', range: 'Touch', components: 'V, S, M (pearl worth 100gp, owl feather)', duration: 'Instantaneous', concentration: false, description: 'You choose one object you must touch throughout the casting. If it is a magic item, you learn its properties and how to use them, whether it requires attunement, and how many charges it has. You also learn whether any spells are affecting the item and what they are.', classes: ['Bard', 'Wizard', 'Artificer'] },
  { id: 'animal-friendship', saveAbility: 'wis', name: 'Animal Friendship', level: 1, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, S, M (morsel of food)', duration: '24 hours', concentration: false, description: 'You attempt to convince a beast you can see within range that you mean it no harm. The target must succeed on a Wisdom saving throw or be charmed by you for the duration. +1 beast per slot level above 1st.', classes: ['Bard', 'Cleric', 'Druid', 'Ranger'] },
  { id: 'shield-of-faith',  name: 'Shield of Faith',    level: 1, school: 'Abjuration',    castingTime: '1 bonus action', range: '60ft', components: 'V, S, M (small parchment with holy text)', duration: 'Concentration, 10 minutes', concentration: true, description: 'A shimmering field appears and surrounds a creature of your choice within range, granting it a +2 bonus to AC for the duration.', classes: ['Cleric', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'radiant' },

  // ── Level 2 ───────────────────────────────────────────────────────────────
  { id: 'hold-person',      saveAbility: 'wis', name: 'Hold Person',        level: 2, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V, S, M (iron bar)', duration: 'Concentration, 1 minute', concentration: true, description: 'Choose a humanoid you can see. It must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw to end the effect. +1 creature per slot level above 2nd.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'paralyzed', attackType: 'save' },
  { id: 'invisibility',     name: 'Invisibility',       level: 2, school: 'Illusion',      castingTime: '1 action', range: 'Touch', components: 'V, S, M (eyelash in gum arabic)', duration: 'Concentration, 1 hour', concentration: true, description: 'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible. The spell ends for a target that attacks or casts a spell. +1 creature per slot level above 2nd.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'] },
  { id: 'misty-step',       name: 'Misty Step',         level: 2, school: 'Conjuration',   castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Instantaneous', concentration: false, description: 'Briefly surrounded by silvery mist, you teleport up to 30ft to an unoccupied space that you can see.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'darkness',         name: 'Darkness',           level: 2, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, M (bat fur/drop of pitch)', duration: 'Concentration, 10 minutes', concentration: true, description: "Magical darkness spreads from a point you choose to fill a 15ft radius sphere for the duration. Darkvision can't see through it. If this darkness overlaps with an area of light created by a 2nd-level or lower spell, the light spell is dispelled.", classes: ['Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'sphere', aoeSize: 15, vizCategory: 'terrain', vizDamageType: 'darkness_sphere' },
  { id: 'detect-thoughts',  saveAbility: 'wis' as const, name: 'Detect Thoughts',   level: 2, school: 'Divination',    castingTime: '1 action', range: 'Self',  components: 'V, S, M (copper piece)', duration: 'Concentration, 1 minute', concentration: true, description: "For the duration, you can read the thoughts of certain creatures. When you cast the spell, and as your action each turn, you can focus your mind on any creature within 30ft that you can see. You learn the surface thoughts of that creature. You can probe deeper; the creature makes a WIS saving throw against your spell save DC.", classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'mirror-image',     name: 'Mirror Image',       level: 2, school: 'Illusion',      castingTime: '1 action', range: 'Self', components: 'V, S', duration: '1 minute', concentration: false, description: 'Three illusory duplicates of yourself appear in your space. Until the spell ends, whenever a creature targets you with an attack, roll a d20 to determine whether the attack targets you or one of your duplicates. Duplicates are destroyed when hit and disappear when the spell ends.', classes: ['Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'mirror' },
  { id: 'scorching-ray',    name: 'Scorching Ray',      level: 2, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several. Make a ranged spell attack for each ray. On a hit, deal 2d6 fire damage. +1 ray per slot level above 2nd.', classes: ['Sorcerer', 'Wizard'], aoeShape: 'single', attackType: 'attack-roll', damageType: 'fire', damageFormula: '2d6', multiTargetScaling: { kind: 'slot', baseCount: 3, perSlotAbove: 1, baseLevel: 2 } },
  { id: 'shatter',          saveAbility: 'con', name: 'Shatter',            level: 2, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S, M (chip of mica)', duration: 'Instantaneous', concentration: false, description: 'A sudden loud ringing noise causes a sphere of 10ft radius centered on a point you choose to erupt with shattering sound. Each creature there must make a Constitution saving throw. On failure: take 3d8 thunder damage. Half on success. Inorganic material takes an automatic failure. +1d8 per slot level above 2nd.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 2 }, aoeShape: 'sphere', aoeSize: 10, attackType: 'save', damageType: 'thunder' },
  { id: 'spiritual-weapon', name: 'Spiritual Weapon',   level: 2, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V, S', duration: '1 minute', concentration: false, description: 'You create a floating spectral weapon within range that lasts for the duration. When you cast the spell, and as a bonus action on each of your turns thereafter, you can move the weapon up to 20ft and make a melee spell attack against a creature within 5ft. On a hit, deal 1d8 + spellcasting modifier force damage. +1d8 per 2 slot levels above 2nd.', classes: ['Cleric'] },
  { id: 'lesser-restoration', name: 'Lesser Restoration', level: 2, school: 'Abjuration', castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You touch a creature and can end either one disease or one condition afflicting it. The condition can be blinded, deafened, paralyzed, or poisoned.', classes: ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'] },
  { id: 'magic-weapon',     name: 'Magic Weapon',       level: 2, school: 'Transmutation', castingTime: '1 bonus action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 hour', concentration: true, description: "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. At 4th level: +2 bonus. At 6th level: +3 bonus.", classes: ['Paladin', 'Wizard'], attackBuff: { toHit: 1, bonusDmg: '1', bonusDmgType: 'magical' }, vizCategory: 'self-buff', vizDamageType: 'weapon_glow' },
  { id: 'suggestion',       saveAbility: 'wis', name: 'Suggestion',         level: 2, school: 'Enchantment',   castingTime: '1 action', range: '30ft',  components: 'V, M (snake tongue, honeycomb)', duration: 'Concentration, 8 hours', concentration: true, description: 'You suggest a course of activity to a creature that can hear and understand you. The creature must make a Wisdom saving throw or follow the suggestion. The activity must be worded so it seems reasonable. The spell ends if the creature completes it or is harmed.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'charmed', attackType: 'save' },
  { id: 'silence',          name: 'Silence',            level: 2, school: 'Illusion',      castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Concentration, 10 minutes', concentration: true, description: 'For the duration, no sound can be created within or pass through a 20ft-radius sphere centered on a point you choose. Any creature or object entirely inside the sphere is immune to thunder damage and is deafened. Casting a spell that includes a verbal component is impossible there.', classes: ['Bard', 'Cleric', 'Ranger'], aoeShape: 'sphere', aoeSize: 20, vizCategory: 'terrain', vizDamageType: 'silence_dome' },
  { id: 'moonbeam',         saveAbility: 'con', name: 'Moonbeam',           level: 2, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (moonseed leaf, opalescent feldspar)', duration: 'Concentration, 1 minute', concentration: true, description: "A silvery beam of pale light shines in a 5ft-radius, 40ft-tall cylinder centered on a point. Each creature in the cylinder must make a Constitution saving throw on start of your turn when you cast, taking 2d10 radiant on failure (half on success). Shapechangers have disadvantage. +1d10 per slot level above 2nd.", classes: ['Druid'], scalingDice: { baseDice: '2d10', addPerLevel: '1d10', baseLevel: 2 }, aoeShape: 'sphere', aoeSize: 5, attackType: 'save', damageType: 'radiant' },
  { id: 'prayer-of-healing', name: 'Prayer of Healing', level: 2, school: 'Evocation',    castingTime: '10 minutes', range: '30ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'Up to six creatures of your choice within range each regain hit points equal to 2d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 2nd.', classes: ['Cleric'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 2 } },
  { id: 'spike-growth',     name: 'Spike Growth',       level: 2, school: 'Transmutation', castingTime: '1 action', range: '150ft', components: 'V, S, M (seven thorns/twigs)', duration: 'Concentration, 10 minutes', concentration: true, description: 'The ground in a 20ft radius centered on a point becomes difficult terrain covered in spikes. When a creature moves into or within the area, it takes 2d4 piercing damage for every 5ft of movement in the area. The transformation is camouflaged; DC 15 Perception check to notice before entering.', classes: ['Druid', 'Ranger'], aoeShape: 'sphere', aoeSize: 20, vizCategory: 'terrain', vizDamageType: 'spikes_thorns' },
  { id: 'enlarge-reduce',   name: 'Enlarge/Reduce',     level: 2, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V, S, M (pinch of iron/iron filings)', duration: 'Concentration, 1 minute', concentration: true, description: 'You cause a creature or object to grow larger or smaller. If enlarged: double in size, +1d4 weapon damage, advantage on Strength checks and saving throws. If reduced: half size, -1d4 weapon damage, disadvantage on Strength checks and saving throws.', classes: ['Sorcerer', 'Wizard', 'Artificer'] },
  { id: 'aid',              name: 'Aid',                level: 2, school: 'Abjuration',    castingTime: '1 action', range: '30ft',  components: 'V, S, M (tiny white bandage strip)', duration: '8 hours', concentration: false, description: "Your spell bolsters up to three creatures. Each target's hit point maximum and current hit points increase by 5 for the duration. +5 HP per slot level above 2nd.", classes: ['Artificer', 'Bard', 'Cleric', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'heal' },
  { id: 'blindness-deafness', saveAbility: 'con', name: 'Blindness/Deafness', level: 2, school: 'Necromancy', castingTime: '1 action', range: '30ft',  components: 'V', duration: '1 minute', concentration: false, description: 'You can blind or deafen a foe. Choose one creature you can see within range to make a Constitution saving throw. On a failure, the target is blinded or deafened (your choice) for the duration. The target can make a Constitution saving throw at the end of each of its turns. +1 creature per slot level above 2nd.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'blinded', attackType: 'save' },
  { id: 'branding-smite',   name: 'Branding Smite',     level: 2, school: 'Evocation',     castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: "The next time you hit a creature with a weapon attack before this spell ends, your weapon gleams with astral radiance. The attack deals an extra 2d6 radiant damage, the target becomes visible if it was invisible, and the target sheds dim light in a 5-foot radius and can't become invisible until the spell ends. +1d6 per slot level above 2nd.", classes: ['Paladin'], scalingDice: { baseDice: '2d6', addPerLevel: '1d6', baseLevel: 2 }, vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'warding-bond',     name: 'Warding Bond',       level: 2, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (two platinum rings worth 50gp each)', duration: '1 hour', concentration: false, description: 'You touch a willing creature, granting it +1 AC, +1 to all saving throws, and resistance to all damage. Both you and the target share any damage taken while linked. The spell ends if either creature is more than 60 ft from the other or drops to 0 HP.', classes: ['Cleric', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'flaming-sphere',   saveAbility: 'dex', name: 'Flaming Sphere',     level: 2, school: 'Conjuration',   castingTime: '1 action', range: '60ft',  components: 'V, S, M (pinch of sulfur)', duration: 'Concentration, 1 minute', concentration: true, description: 'A 5-foot-diameter sphere of fire appears in an unoccupied space within range. Any creature ending its turn within 5 ft of the sphere must make a Dexterity saving throw, taking 2d6 fire damage on failure (half on success). As a bonus action, move the sphere up to 30 ft. +1d6 per slot level above 2nd.', classes: ['Druid', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d6', addPerLevel: '1d6', baseLevel: 2 }, aoeShape: 'sphere', aoeSize: 5, attackType: 'save', damageType: 'fire' },
  { id: 'melfs-acid-arrow', name: "Melf's Acid Arrow",  level: 2, school: 'Evocation',     castingTime: '1 action', range: '90ft',  components: 'V, S, M (powdered rhubarb leaf, an adder\'s stomach)', duration: 'Instantaneous', concentration: false, description: 'A shimmering green arrow streaks toward a target within range. Make a ranged spell attack. On a hit: 4d4 acid damage immediately and 2d4 acid damage at the end of its next turn. On a miss: half damage and no end-of-turn damage. +1d4 (both rolls) per slot level above 2nd.', classes: ['Wizard'], scalingDice: { baseDice: '4d4', addPerLevel: '1d4', baseLevel: 2 }, aoeShape: 'single', attackType: 'attack-roll', damageType: 'acid' },
  { id: 'blur',             name: 'Blur',               level: 2, school: 'Illusion',      castingTime: '1 action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: 'Your body becomes blurred, shifting and wavering. Attack rolls against you have disadvantage unless the attacker can pinpoint you with senses other than sight (e.g. blindsight, tremorsense, truesight).', classes: ['Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'see-invisibility', name: 'See Invisibility',   level: 2, school: 'Divination',    castingTime: '1 action', range: 'Self', components: 'V, S, M (pinch of talc, small sprinkling of powdered silver)', duration: '1 hour', concentration: false, description: 'For the duration, you see invisible creatures and objects as if they were visible, and you can see into the Ethereal Plane.', classes: ['Bard', 'Sorcerer', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'pass-without-trace', name: 'Pass Without Trace', level: 2, school: 'Abjuration', castingTime: '1 action', range: 'Self (30ft radius)', components: 'V, S, M (ash from burned mistletoe)', duration: 'Concentration, 1 hour', concentration: true, description: "A veil of shadows and silence radiates from you, masking you and your companions. For the duration, each creature you choose within 30 ft (and that remains within 30 ft) gains a +10 bonus to Dexterity (Stealth) checks and can't be tracked except by magical means.", classes: ['Druid', 'Ranger'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'calm-emotions',    saveAbility: 'cha', name: 'Calm Emotions',      level: 2, school: 'Enchantment',   castingTime: '1 action', range: '60ft', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You attempt to suppress strong emotions in a group of people. Each humanoid in a 20-ft radius makes a Charisma saving throw; a creature can choose to fail. On a failure, choose to suppress charmed/frightened effects, or render the target indifferent about characters of your choice it is hostile toward.', classes: ['Bard', 'Cleric'], vizCategory: 'debuff-aura', vizDamageType: 'psychic' },
  { id: 'gentle-repose',    name: 'Gentle Repose',      level: 2, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (pinch of salt, copper pieces on the corpse\'s eyes)', duration: '10 days', concentration: false, description: 'You touch a corpse or other remains. For the duration, the target is protected from decay and can\'t become undead. The spell also extends the time limit on raising the target from the dead (each day under this spell doesn\'t count against the limit of spells like raise dead).', classes: ['Cleric', 'Wizard'] },
  { id: 'zone-of-truth',    saveAbility: 'cha', name: 'Zone of Truth',      level: 2, school: 'Enchantment',   castingTime: '1 action', range: '60ft', components: 'V, S', duration: '10 minutes', concentration: false, description: 'You create a magical zone (15-ft radius sphere centered on a point within range) that guards against deception. Each creature that enters or starts its turn in the zone must make a Charisma saving throw or be unable to speak deliberate lies while in the zone (it can choose its words, evade questions, etc.).', classes: ['Bard', 'Cleric', 'Paladin'] },

  // ── Level 3 ───────────────────────────────────────────────────────────────
  { id: 'fireball',         saveAbility: 'dex', name: 'Fireball',           level: 3, school: 'Evocation',     castingTime: '1 action', range: '150ft', components: 'V, S, M (bat guano, sulfur)', duration: 'Instantaneous', concentration: false, description: 'A bright streak flashes from your pointing finger and then blossoms with a low roar into an explosion of flame. Each creature in a 20ft-radius sphere must make a Dexterity saving throw. Failure: 8d6 fire damage. Success: half damage. The fire spreads around corners. +1d6 per slot level above 3rd.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d6', addPerLevel: '1d6', baseLevel: 3 }, aoeShape: 'sphere', aoeSize: 20, attackType: 'save', damageType: 'fire' },
  { id: 'lightning-bolt',   saveAbility: 'dex', name: 'Lightning Bolt',     level: 3, school: 'Evocation',     castingTime: '1 action', range: 'Self (100ft line)', components: 'V, S, M (fur, amber/crystal/glass rod)', duration: 'Instantaneous', concentration: false, description: 'A stroke of lightning forming a 100ft-long, 5ft-wide line blasts out from you. Each creature in the line must make a Dexterity saving throw. Failure: 8d6 lightning damage. Success: half damage. The lightning ignites flammable objects. +1d6 per slot level above 3rd.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d6', addPerLevel: '1d6', baseLevel: 3 }, aoeShape: 'line', aoeSize: 100, attackType: 'save', damageType: 'lightning' },
  { id: 'counterspell',     name: 'Counterspell',       level: 3, school: 'Abjuration',    castingTime: '1 reaction', range: '60ft', components: 'S', duration: 'Instantaneous', concentration: false, description: "You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability: DC 10 + the spell's level. On success, the spell fails. Upcast to automatically counter higher level spells.", classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'dispel-magic',     name: 'Dispel Magic',       level: 3, school: 'Abjuration',    castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: "Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends. For each spell of 4th level or higher on the target, make an ability check: DC 10 + the spell's level. On success, the spell ends. Upcast to automatically dispel higher level spells.", classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'], aoeShape: 'single', attackType: 'auto-hit', damageType: 'force' },
  { id: 'haste',            name: 'Haste',              level: 3, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V, S, M (shaving of licorice root)', duration: 'Concentration, 1 minute', concentration: true, description: "Choose a willing creature you can see. Until the spell ends: target's speed doubled, +2 AC, advantage on Dexterity saving throws, and gains an additional action on each of its turns. When the spell ends, the target can't move or take actions until after its next turn, as lethargy overcomes it.", classes: ['Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'speed' },
  { id: 'fly',              name: 'Fly',                level: 3, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (wing feather)', duration: 'Concentration, 10 minutes', concentration: true, description: 'You touch a willing creature. The target gains a flying speed of 60ft for the duration. When the spell ends, the target falls if it is still aloft, unless it can stop the fall. +1 target per slot level above 3rd.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'speed' },
  { id: 'hypnotic-pattern', saveAbility: 'wis', name: 'Hypnotic Pattern',   level: 3, school: 'Illusion',      castingTime: '1 action', range: '120ft', components: 'S, M (glowing stick/phosphorescent moss)', duration: 'Concentration, 1 minute', concentration: true, description: 'You create a twisting pattern of colors in a 30ft cube. Each creature in the area must make a Wisdom saving throw. On failure, the creature becomes charmed for the duration. While charmed, the creature is incapacitated and its speed drops to 0. The effect ends for an affected creature if it takes damage or if someone else uses an action to shake it out of its stupor.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'cube', aoeSize: 30, vizCategory: 'terrain', vizDamageType: 'hypnotic_swirl' },
  { id: 'spirit-guardians', saveAbility: 'wis', name: 'Spirit Guardians',   level: 3, school: 'Conjuration',   castingTime: '1 action', range: 'Self (15ft radius)', components: 'V, S, M (holy symbol)', duration: 'Concentration, 10 minutes', concentration: true, description: 'You call forth spirits to protect you. They flit around you to a distance of 15ft. Until the spell ends, the area is difficult terrain for enemies, and when an enemy first enters the area on a turn or starts its turn there, it must make a Wisdom saving throw. Failure: 3d8 radiant/necrotic damage. Half on success. +1d8 per slot level above 3rd.', classes: ['Cleric'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 3 }, aoeShape: 'sphere', aoeSize: 15, attackType: 'save', damageType: 'radiant' },
  { id: 'mass-healing-word', name: 'Mass Healing Word', level: 3, school: 'Evocation',     castingTime: '1 bonus action', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'As you call out words of restoration, up to six creatures of your choice that you can see within range regain hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d4 per slot level above 3rd.', classes: ['Bard', 'Cleric'], scalingDice: { baseDice: '1d4', addPerLevel: '1d4', baseLevel: 3 } },
  { id: 'revivify',         name: 'Revivify',           level: 3, school: 'Necromancy',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (diamonds worth 300gp)', duration: 'Instantaneous', concentration: false, description: 'You touch a creature that has died within the last minute. That creature returns to life with 1 hit point. This spell can\'t return to life a creature that has died of old age, nor can it restore any missing body parts.', classes: ['Artificer', 'Cleric', 'Paladin'] },
  { id: 'animate-dead',     name: 'Animate Dead',       level: 3, school: 'Necromancy',    castingTime: '1 minute', range: '10ft',  components: 'V, S, M (drop of blood, bone fragment, pinch of grave dirt)', duration: 'Instantaneous', concentration: false, description: "This spell creates an undead servant. Choose a pile of bones or a corpse of a Medium or Small humanoid within range. Your spell imbues the target with a foul mimicry of life, raising it as an undead creature. It obeys your verbal commands. +2 undead per slot level above 3rd.", classes: ['Cleric', 'Wizard'], summons: { templateId: 'skeleton', count: 1 } },
  { id: 'vampiric-touch',   name: 'Vampiric Touch',     level: 3, school: 'Necromancy',    castingTime: '1 action', range: 'Self', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'The touch of your shadow-wreathed hand can siphon life force. Make a melee spell attack against a creature within your reach. On a hit, deal 3d6 necrotic damage, and you regain HP equal to half the amount of necrotic damage dealt. Until the spell ends, you can make the attack again on each of your turns. +1d6 per slot level above 3rd.', classes: ['Warlock', 'Wizard'], scalingDice: { baseDice: '3d6', addPerLevel: '1d6', baseLevel: 3 }, aoeShape: 'single', attackType: 'attack-roll', damageType: 'necrotic' },
  { id: 'slow',             saveAbility: 'wis', name: 'Slow',               level: 3, school: 'Transmutation', castingTime: '1 action', range: '120ft', components: 'V, S, M (molasses)', duration: 'Concentration, 1 minute', concentration: true, description: 'You alter time around up to six creatures of your choice. Each target must succeed on a Wisdom saving throw or be affected for the duration: half speed, -2 AC and Dex saves, can\'t use reactions, only one action or bonus action per turn, and can\'t make more than one melee or ranged attack per turn.', classes: ['Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'slowed', attackType: 'save' },
  { id: 'hunger-of-hadar',  saveAbility: 'dex', name: 'Hunger of Hadar',    level: 3, school: 'Conjuration',   castingTime: '1 action', range: '150ft', components: 'V, S, M (pickled octopus tentacle)', duration: 'Concentration, 1 minute', concentration: true, description: 'You open a gateway to the dark between the stars. A 20ft-radius sphere of cold blackness and bitter cold appears, centered on a point in range. The void is filled with the sound of clicking, slurping, and chittering. The area is heavily obscured. Any creature that starts its turn in the area takes 2d6 cold damage. Any creature that ends its turn there must succeed on a Dexterity saving throw or take 2d6 acid damage. The area is difficult terrain.', classes: ['Warlock'], aoeShape: 'sphere', aoeSize: 20, attackType: 'save', damageType: 'cold' },
  { id: 'aura-of-vitality', name: 'Aura of Vitality',   level: 3, school: 'Evocation',     castingTime: '1 action', range: 'Self (30ft radius)', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: 'Healing energy radiates from you in a 30-ft aura. The aura moves with you. As a bonus action, you can cause one creature in the aura (including yourself) to regain 2d6 hit points.', classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'conjure-barrage',  saveAbility: 'dex', name: 'Conjure Barrage',    level: 3, school: 'Conjuration',   castingTime: '1 action', range: 'Self (60ft cone)', components: 'V, S, M (one piece of ammunition or a thrown weapon)', duration: 'Instantaneous', concentration: false, description: "You throw a non-magical weapon or fire a piece of ammunition into the air to create a cone of identical weapons that emanates from you. Each creature in a 60-ft cone makes a Dexterity saving throw. Failure: 3d8 damage of the weapon's damage type. Success: half damage.", classes: ['Ranger'], aoeShape: 'cone', aoeSize: 60, attackType: 'save', damageType: 'piercing' },
  { id: 'gaseous-form',     name: 'Gaseous Form',       level: 3, school: 'Transmutation', castingTime: '1 action', range: 'Touch', components: 'V, S, M (bit of gauze and a wisp of smoke)', duration: 'Concentration, 1 hour', concentration: true, description: 'You transform a willing creature you touch, along with everything it is wearing and carrying, into a misty cloud. While in this form, the target\'s only movement is a flying speed of 10 ft. It can enter and occupy spaces of other creatures, has resistance to nonmagical damage, advantage on STR/DEX/CON saves, and can pass through narrow openings.', classes: ['Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'wind-wall',        saveAbility: 'str', name: 'Wind Wall',          level: 3, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (tiny fan and a feather of exotic origin)', duration: 'Concentration, 1 minute', concentration: true, description: 'A wall of strong wind rises from the ground at a point you choose. The wall is 50 ft long, 15 ft high, and 1 ft thick. When the wall appears, each creature in its area must make a Strength saving throw or take 3d8 bludgeoning damage (half on success). The wall deflects ordinary missiles and small flying creatures.', classes: ['Druid', 'Ranger'], aoeShape: 'line', aoeSize: 50, attackType: 'save', damageType: 'bludgeoning' },
  { id: 'daylight',         name: 'Daylight',           level: 3, school: 'Evocation',     castingTime: '1 action', range: '60ft', components: 'V, S', duration: '1 hour', concentration: false, description: 'A 60-foot-radius sphere of light spreads out from a point you choose within range. The sphere is bright light and sheds dim light for an additional 60 feet. If the chosen point is on an object you are holding or one that isn\'t worn or carried, the light emanates from the object and moves with it.', classes: ['Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer'], vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'blink',            name: 'Blink',              level: 3, school: 'Transmutation', castingTime: '1 action', range: 'Self', components: 'V, S', duration: '1 minute', concentration: false, description: 'At the end of each of your turns, roll a d20: on 11+, you vanish from your current plane and appear on the Ethereal Plane. At the start of your next turn (and when the spell ends if you are on the Ethereal Plane), you return to an unoccupied space of your choice within 10 ft.', classes: ['Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'fear',             saveAbility: 'wis', name: 'Fear',               level: 3, school: 'Illusion',      castingTime: '1 action', range: 'Self (30ft cone)', components: 'V, S, M (white feather or heart of a hen)', duration: 'Concentration, 1 minute', concentration: true, description: 'You project a phantasmal image of a creature\'s worst fears. Each creature in a 30-ft cone must succeed on a Wisdom saving throw or drop whatever it is holding and become frightened for the duration. A frightened creature must take the Dash action and move away from you by the safest route each turn.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'cone', aoeSize: 30, attackType: 'save', damageType: 'psychic', vizCategory: 'debuff-aura', vizDamageType: 'psychic' },
  { id: 'plant-growth',     name: 'Plant Growth',       level: 3, school: 'Transmutation', castingTime: '1 action or 8 hours', range: '150ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'This spell channels vitality into plants. Either overgrow plants in a 100-ft radius (movement costs 4 ft per ft, no plant attacks against affected creatures), or enrich plants in a half-mile radius for 1 year (plants yield twice the normal amount of food).', classes: ['Bard', 'Druid', 'Ranger'] },
  { id: 'protection-from-energy', name: 'Protection from Energy', level: 3, school: 'Abjuration', castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 hour', concentration: true, description: 'For the duration, the willing creature you touch has resistance to one damage type of your choice: acid, cold, fire, lightning, or thunder.', classes: ['Cleric', 'Druid', 'Ranger', 'Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'speak-with-dead',  name: 'Speak with Dead',    level: 3, school: 'Necromancy',    castingTime: '1 action', range: '10ft', components: 'V, S, M (burning incense)', duration: '10 minutes', concentration: false, description: 'You grant the semblance of life and intelligence to a corpse of your choice within range. The corpse must still have a mouth and not be undead. You can ask the corpse up to 5 questions; it answers in the language it knew in life, knows only what it knew in life, and can refuse questions if it would have refused them in life.', classes: ['Bard', 'Cleric'] },

  // ── Level 4 ───────────────────────────────────────────────────────────────
  { id: 'banishment',       saveAbility: 'cha', name: 'Banishment',         level: 4, school: 'Abjuration',    castingTime: '1 action', range: '60ft',  components: 'V, S, M (repulsive object)', duration: 'Concentration, 1 minute', concentration: true, description: 'You attempt to send one creature that you can see within range to another plane of existence. The target must succeed on a Charisma saving throw or be banished. If the target is native to the plane you\'re on, it appears in a random spot on a harmless demiplane and is incapacitated until the spell ends. If the spell lasts the full minute, the target is permanently banished. +1 creature per slot level above 4th.', classes: ['Cleric', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'banished', attackType: 'save' },
  { id: 'polymorph',        saveAbility: 'wis', name: 'Polymorph',          level: 4, school: 'Transmutation', castingTime: '1 action', range: '60ft',  components: 'V, S, M (caterpillar cocoon)', duration: 'Concentration, 1 hour', concentration: true, description: 'This spell transforms a creature you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. The transformation lasts for the duration, or until the target drops to 0 HP or dies. The target\'s game statistics are replaced by those of the chosen beast.', classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'transformed', attackType: 'save' },
  { id: 'greater-invisibility', name: 'Greater Invisibility', level: 4, school: 'Illusion', castingTime: '1 action', range: 'Touch', components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You or a creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person. The spell does not end when the target attacks or casts a spell.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'death-ward',       name: 'Death Ward',         level: 4, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S', duration: '8 hours', concentration: false, description: 'You touch a creature and grant it a measure of protection from death. The first time the target would drop to 0 hit points as a result of taking damage, the target instead drops to 1 hit point, and the spell ends. If the spell is still in effect when the target is subjected to an effect that would kill it instantly without dealing damage, that effect is instead negated against the target, and the spell ends.', classes: ['Cleric', 'Paladin'], vizCategory: 'self-buff', vizDamageType: 'defense' },
  { id: 'confusion',        saveAbility: 'wis', name: 'Confusion',          level: 4, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (three nutshells)', duration: 'Concentration, 1 minute', concentration: true, description: 'This spell assaults and twists creatures\'s minds, spawning delusions and provoking uncontrolled action. Each creature in a 10ft-radius sphere centered on a point you choose must succeed on a Wisdom saving throw or be affected for the duration. An affected creature can\'t take reactions and must roll a d10 at the start of each of its turns to determine its behavior.', classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'charmed', attackType: 'save' },
  { id: 'aura-of-purity',   name: 'Aura of Purity',     level: 4, school: 'Abjuration',    castingTime: '1 action', range: 'Self (30ft radius)', components: 'V', duration: 'Concentration, 10 minutes', concentration: true, description: "Purifying energy radiates from you in a 30-ft aura, moving with you. Creatures in the aura (including you) can't become diseased, have resistance to poison damage, and have advantage on saving throws against effects causing conditions.", classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'radiant' },
  { id: 'blight',           saveAbility: 'con', name: 'Blight',             level: 4, school: 'Necromancy',    castingTime: '1 action', range: '30ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'Necromantic energy washes over a target creature within range. The target makes a CON save. Failure: 8d8 necrotic damage. Success: half damage. The spell has no effect on undead or constructs. A plant creature or magical plant makes the save with disadvantage and takes maximum damage. +1d8 per slot level above 4th.', classes: ['Druid', 'Sorcerer', 'Warlock', 'Wizard'], scalingDice: { baseDice: '8d8', addPerLevel: '1d8', baseLevel: 4 }, aoeShape: 'single', attackType: 'save', damageType: 'necrotic' },
  { id: 'fire-shield',      name: 'Fire Shield',        level: 4, school: 'Evocation',     castingTime: '1 action', range: 'Self', components: 'V, S, M (a bit of phosphorus or a firefly)', duration: '10 minutes', concentration: false, description: 'Thin, wispy flames wreathe your body. Choose warm shield (resistance to cold damage) or chill shield (resistance to fire damage). When a creature within 5 ft of you hits you with a melee attack, the shield erupts; the attacker takes 2d8 fire damage (warm) or cold damage (chill).', classes: ['Wizard'], vizCategory: 'self-buff', vizDamageType: 'fire' },
  { id: 'ice-storm',        saveAbility: 'dex', name: 'Ice Storm',          level: 4, school: 'Evocation',     castingTime: '1 action', range: '300ft', components: 'V, S, M (pinch of dust and a few drops of water)', duration: 'Instantaneous', concentration: false, description: 'A hail of rock-hard ice pounds to the ground in a 20-ft-radius, 40-ft-high cylinder centered on a point within range. Each creature in the area makes a Dexterity saving throw. Failure: 2d8 bludgeoning + 4d6 cold damage. Success: half. The storm leaves difficult terrain. +1d8 bludgeoning per slot level above 4th.', classes: ['Druid', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d8', addPerLevel: '1d8', baseLevel: 4 }, aoeShape: 'sphere', aoeSize: 20, attackType: 'save', damageType: 'cold' },
  { id: 'wall-of-fire',     saveAbility: 'dex', name: 'Wall of Fire',       level: 4, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (small piece of phosphorus)', duration: 'Concentration, 1 minute', concentration: true, description: 'You create a wall of fire on a solid surface — a 60-ft-long, 20-ft-high, 1-ft-thick line, or a 20-ft-diameter ring. The wall is opaque. One side deals 5d8 fire damage to each creature ending its turn within 10 ft of that side (DEX save half). Each creature entering the wall takes 5d8 fire damage. +1d8 per slot level above 4th.', classes: ['Druid', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '5d8', addPerLevel: '1d8', baseLevel: 4 }, aoeShape: 'line', aoeSize: 60, attackType: 'save', damageType: 'fire' },
  { id: 'arcane-eye',       name: 'Arcane Eye',         level: 4, school: 'Divination',    castingTime: '1 action', range: '30ft', components: 'V, S, M (bit of bat fur)', duration: 'Concentration, 1 hour', concentration: true, description: 'You create an invisible, magical eye within range that hovers in the air for the duration. You mentally receive visual information from the eye (normal vision and 30-ft darkvision). As an action, move the eye up to 30 ft. There is no limit to how far it can move from you, but it can\'t enter another plane of existence; solid barriers block it.', classes: ['Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'freedom-of-movement', name: 'Freedom of Movement', level: 4, school: 'Abjuration', castingTime: '1 action', range: 'Touch', components: 'V, S, M (leather strap, bound around the arm)', duration: '1 hour', concentration: false, description: "You touch a willing creature. For the duration, the target's movement is unaffected by difficult terrain, and spells and other magical effects can neither reduce its speed nor cause it to be paralyzed or restrained. The target can also spend 5 ft of movement to escape from nonmagical restraints or grapples.", classes: ['Bard', 'Cleric', 'Druid', 'Ranger'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'stoneskin',        name: 'Stoneskin',          level: 4, school: 'Abjuration',    castingTime: '1 action', range: 'Touch', components: 'V, S, M (diamond dust worth 100gp)', duration: 'Concentration, 1 hour', concentration: true, description: 'This spell turns the flesh of a willing creature you touch as hard as stone. Until the spell ends, the target has resistance to nonmagical bludgeoning, piercing, and slashing damage.', classes: ['Druid', 'Ranger', 'Sorcerer', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'dimension-door',   name: 'Dimension Door',     level: 4, school: 'Conjuration',   castingTime: '1 action', range: '500ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'You teleport yourself from your current location to any other spot within range. You arrive at exactly the spot desired. You can bring along one willing creature of your size or smaller who is within 5 ft of you. If you would arrive in occupied space, you and any creature you brought take 4d6 force damage and don\'t teleport.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },

  // ── Level 5 ───────────────────────────────────────────────────────────────
  { id: 'hold-monster',     saveAbility: 'wis', name: 'Hold Monster',       level: 5, school: 'Enchantment',   castingTime: '1 action', range: '90ft',  components: 'V, S, M (iron bar)', duration: 'Concentration, 1 minute', concentration: true, description: 'Choose a creature you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. This spell has no effect on undead. At the end of each of its turns, the target can make another Wisdom saving throw to end the effect. +1 creature per slot level above 5th.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'paralyzed', attackType: 'save' },
  { id: 'cone-of-cold',     saveAbility: 'con', name: 'Cone of Cold',       level: 5, school: 'Evocation',     castingTime: '1 action', range: 'Self (60ft cone)', components: 'V, S, M (crystal/glass cone)', duration: 'Instantaneous', concentration: false, description: 'A blast of cold air erupts from your hands. Each creature in a 60ft cone must make a Constitution saving throw. Failure: 8d8 cold damage. Half on success. A creature killed by this spell becomes a frozen statue until it thaws. +1d8 per slot level above 5th.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '8d8', addPerLevel: '1d8', baseLevel: 5 }, aoeShape: 'cone', aoeSize: 60, attackType: 'save', damageType: 'cold' },
  { id: 'mass-cure-wounds', name: 'Mass Cure Wounds',   level: 5, school: 'Evocation',     castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'A wave of healing energy washes out from a point. Choose up to six creatures in a 30ft-radius sphere. Each target regains hit points equal to 3d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs. +1d8 per slot level above 5th.', classes: ['Bard', 'Cleric', 'Druid'], scalingDice: { baseDice: '3d8', addPerLevel: '1d8', baseLevel: 5 } },
  { id: 'dominate-person',  saveAbility: 'wis', name: 'Dominate Person',    level: 5, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V, S', duration: 'Concentration, 1 minute', concentration: true, description: 'You attempt to beguile a humanoid. The target must succeed on a Wisdom saving throw or be charmed. While charmed, you have a telepathic link and can issue commands as a bonus action. The dominated creature must do its best to obey. Each time the target takes damage, it makes a new saving throw.', classes: ['Bard', 'Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'charmed', attackType: 'save' },
  { id: 'raise-dead',       name: 'Raise Dead',         level: 5, school: 'Necromancy',    castingTime: '1 hour', range: 'Touch', components: 'V, S, M (diamonds worth 500gp)', duration: 'Instantaneous', concentration: false, description: "You return a dead creature to life if it has been dead no longer than 10 days. If the creature's soul is both willing and at liberty, the creature returns to life with 1 hit point. This spell also neutralizes any poisons and cures non-magical diseases. It doesn't remove magical diseases, curses, or similar effects.", classes: ['Bard', 'Cleric', 'Paladin'] },
  { id: 'wall-of-force',    name: 'Wall of Force',      level: 5, school: 'Evocation',     castingTime: '1 action', range: '120ft', components: 'V, S, M (pinch of powder from clear gem)', duration: 'Concentration, 10 minutes', concentration: true, description: 'An invisible wall of force springs into existence at a point you choose. The wall can be up to 10 panels, each 10ft × 10ft. The wall is immune to all damage and can\'t be dispelled by dispel magic. A disintegrate spell destroys the wall instantly. Nothing can physically pass through the wall.', classes: ['Wizard'] },
  { id: 'passwall',         name: 'Passwall',           level: 5, school: 'Transmutation', castingTime: '1 action', range: '30ft',  components: 'V, S, M (pinch of sesame seeds)', duration: '1 hour', concentration: false, description: 'A passage appears at a point of your choice you can see on a wooden, plaster, or stone surface within range. The passage is 5 ft wide, 8 ft tall, and 20 ft deep. Creatures inside the passage when the spell ends are safely ejected.', classes: ['Wizard'] },
  { id: 'banishing-smite',  name: 'Banishing Smite',    level: 5, school: 'Abjuration',    castingTime: '1 bonus action', range: 'Self', components: 'V', duration: 'Concentration, 1 minute', concentration: true, description: 'The next time you hit a creature with a weapon attack before this spell ends, your weapon crackles with force and deals an extra 5d10 force damage. If that damage drops the target to 50 HP or fewer, you banish it (as the Banishment spell).', classes: ['Paladin'], vizCategory: 'self-buff', vizDamageType: 'force' },
  { id: 'cloudkill',        saveAbility: 'con', name: 'Cloudkill',          level: 5, school: 'Conjuration',   castingTime: '1 action', range: '120ft', components: 'V, S', duration: 'Concentration, 10 minutes', concentration: true, description: 'You create a 20-ft-radius sphere of poisonous, yellow-green fog centered on a point you choose within range. Each creature wholly within the cloud at the start of its turn must make a CON save: failure 5d8 poison damage; success half. The cloud moves 10 ft from you each round. +1d8 per slot level above 5th.', classes: ['Sorcerer', 'Wizard'], scalingDice: { baseDice: '5d8', addPerLevel: '1d8', baseLevel: 5 }, aoeShape: 'sphere', aoeSize: 20, attackType: 'save', damageType: 'poison' },
  { id: 'flame-strike',     saveAbility: 'dex', name: 'Flame Strike',       level: 5, school: 'Evocation',     castingTime: '1 action', range: '60ft', components: 'V, S, M (pinch of sulfur)', duration: 'Instantaneous', concentration: false, description: 'A vertical column of divine fire roars down from the heavens in a 10-ft-radius, 40-ft-high cylinder centered on a point within range. Each creature in the area makes a Dexterity saving throw. Failure: 4d6 fire + 4d6 radiant. Success: half. +1d6 (each) per slot level above 5th.', classes: ['Cleric'], scalingDice: { baseDice: '4d6', addPerLevel: '1d6', baseLevel: 5 }, aoeShape: 'sphere', aoeSize: 10, attackType: 'save', damageType: 'radiant' },
  { id: 'greater-restoration', name: 'Greater Restoration', level: 5, school: 'Abjuration', castingTime: '1 action', range: 'Touch', components: 'V, S, M (diamond dust worth 100gp, consumed)', duration: 'Instantaneous', concentration: false, description: 'You imbue a creature you touch with positive energy to undo a debilitating effect. End one of the following on the target: exhaustion, charmed/petrified, curse (including attunement to a cursed magic item), or any reduction to an ability score or HP maximum.', classes: ['Bard', 'Cleric', 'Druid'] },
  { id: 'planar-binding',   name: 'Planar Binding',     level: 5, school: 'Abjuration',    castingTime: '1 hour', range: '60ft', components: 'V, S, M (jewel worth 1000gp, consumed)', duration: '24 hours', concentration: false, description: 'You attempt to bind a celestial, elemental, fey, or fiend you can see within range to your service. It must succeed on a Charisma saving throw or be bound to serve you for the duration. The creature must be already imprisoned somehow (via a spell like Magic Circle). +24 hours per slot level above 5th, capped at 1 year at 7th+.', classes: ['Bard', 'Cleric', 'Druid', 'Wizard'] },

  // ── Tasha's Cauldron of Everything ──────────────────────────────────────────
  // Cantrips
  { id: 'booming-blade',    name: 'Booming Blade',      level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (5ft)',  components: 'S, M (melee weapon worth 1sp+)', duration: 'Instantaneous', concentration: false, description: 'You brandish the weapon and make one melee weapon attack. On a hit it deals normal damage, and the target is surrounded by booming energy until the start of your next turn. If it moves before then, it takes 1d8 thunder damage (2d8 at 11th, 3d8 at 17th). At 5th level, the hit also deals +1d8 thunder damage (2d8 at 11th, 3d8 at 17th).', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'damage' },
  { id: 'green-flame-blade', name: 'Green-Flame Blade', level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (5ft)',  components: 'S, M (melee weapon worth 1sp+)', duration: 'Instantaneous', concentration: false, description: 'You brandish the weapon and make one melee weapon attack. On a hit, green fire leaps from the target to one creature within 5 ft that you can see, dealing fire damage equal to your spellcasting modifier. Both the attack damage and the leaping fire increase at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'], vizCategory: 'self-buff', vizDamageType: 'damage' },
  { id: 'mind-sliver',      saveAbility: 'int', name: 'Mind Sliver',       level: 0, school: 'Enchantment',   castingTime: '1 action', range: '60ft',  components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You drive a disorienting spike of psychic energy into the mind of one creature you can see in range. The target must succeed on an Intelligence saving throw or take 1d6 psychic damage and subtract 1d4 from the next saving throw it makes before the end of your next turn. The damage increases by 1d6 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard'], aoeShape: 'single', attackType: 'save', damageType: 'psychic' },
  { id: 'lightning-lure',   saveAbility: 'str', name: 'Lightning Lure',    level: 0, school: 'Evocation',     castingTime: '1 action', range: 'Self (15ft)', components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You create a lash of lightning energy that strikes one creature within 15 ft of you. The target must succeed on a Strength saving throw or be pulled up to 10 ft toward you and take 1d8 lightning damage. The damage increases by 1d8 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'], aoeShape: 'single', attackType: 'save', damageType: 'lightning' },
  { id: 'sword-burst',      saveAbility: 'dex', name: 'Sword Burst',       level: 0, school: 'Conjuration',   castingTime: '1 action', range: 'Self (5ft)',  components: 'V',              duration: 'Instantaneous', concentration: false, description: 'You create a momentary circle of spectral blades that sweep around you. All other creatures within 5 ft of you must each succeed on a Dexterity saving throw or take 1d6 force damage. The damage increases by 1d6 at 5th, 11th, and 17th level.', classes: ['Sorcerer', 'Warlock', 'Wizard', 'Artificer'], aoeShape: 'sphere', aoeSize: 5, attackType: 'save', damageType: 'force' },
  // Level 1
  { id: 'silvery-barbs',    name: 'Silvery Barbs',      level: 1, school: 'Enchantment',   castingTime: '1 reaction', range: '60ft', components: 'V', duration: 'Instantaneous', concentration: false, description: 'When a creature you can see within range succeeds on an attack roll, ability check, or saving throw, use your reaction to force it to reroll and use the lower result. You then choose a different creature within range (or yourself); that creature has advantage on its next attack roll, ability check, or saving throw within 1 minute.', classes: ['Bard', 'Sorcerer', 'Wizard'], vizCategory: 'debuff-aura', vizDamageType: 'marked', attackType: 'auto-hit' },
  { id: 'tashas-caustic-brew', saveAbility: 'dex', name: "Tasha's Caustic Brew", level: 1, school: 'Evocation', castingTime: '1 action', range: 'Self (30ft line)', components: 'V, S, M (lime and spit)', duration: 'Concentration, 1 minute', concentration: true, description: 'A stream of acid sprays from your mouth in a line 30 ft long and 5 ft wide. Each creature in the line must succeed on a Dexterity saving throw or be covered in acid for the spell\'s duration. A covered creature takes 2d4 acid damage at the start of each of its turns. It can use its action to remove the acid. +2d4 per slot level above 1st.', classes: ['Artificer', 'Sorcerer', 'Wizard'], scalingDice: { baseDice: '2d4', addPerLevel: '2d4', baseLevel: 1 }, aoeShape: 'line', aoeSize: 30, attackType: 'save', damageType: 'acid' },
  // Level 2
  { id: 'intellect-fortress', name: 'Intellect Fortress', level: 2, school: 'Abjuration',  castingTime: '1 action', range: '30ft', components: 'V', duration: 'Concentration, 1 hour', concentration: true, description: 'For the duration, the target creature has resistance to psychic damage and advantage on Intelligence, Wisdom, and Charisma saving throws. You can target one additional creature for each slot level above 2nd.', classes: ['Artificer', 'Bard', 'Sorcerer', 'Warlock', 'Wizard'], vizCategory: 'self-buff', vizDamageType: 'defense' },
  { id: 'vortex-warp',      name: 'Vortex Warp',        level: 2, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S', duration: 'Instantaneous', concentration: false, description: 'You magically twist space around another creature you can see within range. The target must succeed on a Constitution saving throw or be teleported to an unoccupied space of your choice within range. The chosen space must be on the ground or on a floor. Willing creatures automatically fail the save.', classes: ['Artificer', 'Sorcerer', 'Wizard'] },
  // Level 3
  { id: 'summon-beast',     name: 'Summon Beast',       level: 3, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S, M (feather, tuft of fur, fish tail — each worth 200gp)', duration: 'Concentration, 1 hour', concentration: true, description: 'You call forth a bestial spirit. It manifests in an unoccupied space within range. Use the Beast Spirit stat block and choose the spirit\'s form: Air, Land, or Water. The creature disappears when it drops to 0 HP or when the spell ends. The spirit\'s attacks deal an extra 1d8 damage for each slot level above 3rd.', classes: ['Druid', 'Ranger'], summons: { templateId: 'beast-spirit', count: 1 } },
  { id: 'summon-fey',       name: 'Summon Fey',         level: 3, school: 'Conjuration',   castingTime: '1 action', range: '90ft', components: 'V, S, M (gilded flower worth 300gp)', duration: 'Concentration, 1 hour', concentration: true, description: 'You call forth a fey spirit. It manifests in an unoccupied space within range. Choose a mood for the spirit: Fuming, Mirthful, or Tricksy — this determines some of its capabilities. The spirit disappears when it drops to 0 HP or when the spell ends. The spirit\'s attacks deal an extra 1d6 damage for each slot level above 3rd.', classes: ['Druid', 'Ranger', 'Warlock'], summons: { templateId: 'fey-spirit', count: 1 } },
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
  config?: SpellGridConfig,
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
    const isSelf = spell.range.toLowerCase().startsWith('self')
    const radiusTiles = Math.ceil(size / 5)
    const side = Math.max(9, radiusTiles * 2 + 5)
    const centerX = Math.floor(side / 2)
    const centerY = side - radiusTiles - 2
    // Intersection mode: shift effective center by +0.5 so radius is measured from a corner
    const cx = centerX + (config?.sphereMode === 'intersection' ? 0.5 : 0)
    const cy = centerY + (config?.sphereMode === 'intersection' ? 0.5 : 0)
    const areaCells: { x: number; y: number }[] = []
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const dx = x - cx
        const dy = y - cy
        if (Math.sqrt(dx * dx + dy * dy) <= radiusTiles) areaCells.push({ x, y })
      }
    }
    const inside = areaCells.filter(c => !(c.x === centerX && c.y === centerY))
    const outsideEnemies: { x: number; y: number }[] = [
      { x: Math.max(0, centerX - radiusTiles - 1), y: centerY },
      { x: Math.min(side - 1, centerX + radiusTiles + 1), y: centerY },
    ].filter(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) > radiusTiles)
    return {
      cols: side, rows: side,
      playerPosA: { x: centerX, y: 0 },
      playerPosB: isSelf ? { x: centerX, y: centerY } : { x: 1, y: 0 },
      enemyHitPositions:  inside.slice(0, Math.min(3, inside.length)),
      enemyMissPositions: outsideEnemies,
      areaCells,
    }
  }

  if (shape === 'cone') {
    const lenTiles = Math.ceil(size / 5)
    // Cap at 19 cols. Spells over 14 tiles shift the player 4 left so the
    // right/forward portion of the shape isn't clipped.
    const cols = Math.min(Math.max(9, lenTiles + 7), 19)
    const rows = Math.max(7, lenTiles + 4)
    const apexX = lenTiles > 14
      ? Math.floor(cols / 2) - 4
      : Math.floor(cols / 2)
    const apexY = 1
    // θ = atan2(dy, dx) in screen coords (+y = down).  Default: straight down (π/2).
    const θ = config?.aimTarget
      ? Math.atan2(config.aimTarget.y - apexY, config.aimTarget.x - apexX)
      : Math.PI / 2
    const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
    // Rotation into the cone's local frame (forward axis = +dyr):
    //   dxr = dx·sinθ − dy·cosθ   (perpendicular)
    //   dyr = dx·cosθ + dy·sinθ   (forward)
    const areaCells: { x: number; y: number }[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - apexX, dy = y - apexY
        if (dy <= 0) continue  // never show cells at or above the player row
        const dxr = dx * sinθ - dy * cosθ
        const dyr = dx * cosθ + dy * sinθ
        if (dyr <= 0) continue
        if (Math.abs(dxr) > dyr / 2) continue
        if (Math.hypot(dx, dy) > lenTiles + 0.5) continue
        areaCells.push({ x, y })
      }
    }
    // Map local (forward, perp) → world grid coords (inverse rotation)
    const toGrid = (fwd: number, perp: number) => ({
      x: Math.round(apexX + sinθ * perp + cosθ * fwd),
      y: Math.round(apexY - cosθ * perp + sinθ * fwd),
    })
    const clampG = (p: { x: number; y: number }) => ({
      x: Math.max(0, Math.min(cols - 1, p.x)),
      y: Math.max(apexY + 1, Math.min(rows - 1, p.y)),
    })
    const midDepth = Math.round(lenTiles / 2)
    const insideEnemies = [
      clampG(toGrid(midDepth, 0)),
      clampG(toGrid(lenTiles - 1, 1)),
    ].filter(p => areaCells.some(c => c.x === p.x && c.y === p.y))
    const outsideEnemies = [
      clampG(toGrid(midDepth, midDepth + 1)),
      clampG(toGrid(midDepth, -(midDepth + 1))),
    ]
    return {
      cols, rows,
      playerPosA: { x: apexX, y: apexY },
      playerPosB: { x: apexX, y: apexY },
      enemyHitPositions:  insideEnemies.slice(0, 2),
      enemyMissPositions: outsideEnemies,
      areaCells,
    }
  }

  if (shape === 'cube') {
    const sideTiles = Math.ceil(size / 5)
    // Same layout rules as cone/line: cap at 19, shift left for large shapes.
    const cols = Math.min(Math.max(7, sideTiles * 2 + 3), 19)
    const rows = Math.max(7, sideTiles + 3)
    const apexX = sideTiles > 14
      ? Math.floor(cols / 2) - 4
      : Math.floor(cols / 2)
    const apexY = 1
    const θ = config?.aimTarget
      ? Math.atan2(config.aimTarget.y - apexY, config.aimTarget.x - apexX)
      : Math.PI / 2
    const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
    // Place a sideTiles×sideTiles block starting 1 tile in front of the player.
    // lat = perpendicular offset centred on the axis; fwd = forward distance.
    const areaCells: { x: number; y: number }[] = []
    for (let i = 0; i < sideTiles; i++) {
      for (let j = 0; j < sideTiles; j++) {
        const fwd = i + 1
        const lat = j - (sideTiles - 1) / 2
        const cx = Math.round(apexX + sinθ * lat + cosθ * fwd)
        const cy = Math.round(apexY - cosθ * lat + sinθ * fwd)
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
          if (!areaCells.some(c => c.x === cx && c.y === cy))
            areaCells.push({ x: cx, y: cy })
        }
      }
    }
    const toGridC = (fwd: number, lat: number) => ({
      x: Math.max(0, Math.min(cols - 1, Math.round(apexX + sinθ * lat + cosθ * fwd))),
      y: Math.max(0, Math.min(rows - 1, Math.round(apexY - cosθ * lat + sinθ * fwd))),
    })
    const mid = Math.round(sideTiles / 2)
    const hitCandidates = [toGridC(mid, 0), toGridC(sideTiles - 1, 0)]
      .filter(p => areaCells.some(c => c.x === p.x && c.y === p.y))
    return {
      cols, rows,
      playerPosA: { x: apexX, y: apexY },
      playerPosB: { x: apexX, y: apexY },
      enemyHitPositions:  hitCandidates.slice(0, 2),
      enemyMissPositions: [toGridC(mid, sideTiles), toGridC(mid, -sideTiles)],
      areaCells,
    }
  }

  // line / wall
  const lenTiles = Math.ceil(size / 5)
  // A line is 1 cell wide; at 45° the spine shifts ~0.7×lenTiles laterally,
  // so lenTiles/2 + margin on each side is enough. Cap at 19, shift for large spells.
  const lineCols = Math.min(Math.max(7, lenTiles + 3), 19)
  const lineRows = Math.max(9, lenTiles + 4)
  const lineApexX = lenTiles > 14
    ? Math.floor(lineCols / 2) - 4
    : Math.floor(lineCols / 2)
  const lineApexY = 1  // player near top; aiming restricted to y > lineApexY in UI

  if (config?.wallPoints) {
    // Two-point wall: Bresenham spine between start and end.
    // Use a square grid so the user can reach all cells.
    const wallSide = Math.min(Math.max(9, lenTiles + 6), 19)
    const clampW = (v: number) => Math.max(0, Math.min(wallSide - 1, v))
    const spine = bresenhamLine(
      clampW(config.wallPoints.start.x), clampW(config.wallPoints.start.y),
      clampW(config.wallPoints.end.x),   clampW(config.wallPoints.end.y),
    )
    const wCtr = Math.floor(wallSide / 2)
    return {
      cols: wallSide, rows: wallSide,
      playerPosA: { x: wCtr, y: wCtr },
      playerPosB: { x: wCtr, y: wCtr },
      enemyHitPositions:  spine.slice(0, 2),
      enemyMissPositions: [{ x: 0, y: 0 }, { x: wallSide - 1, y: wallSide - 1 }],
      areaCells: spine,
      wallSpine: spine,
    }
  }

  // Rotation-based directional line: same rotation formula as cone, 1-cell-wide spine
  const lineθ = config?.aimTarget
    ? Math.atan2(config.aimTarget.y - lineApexY, config.aimTarget.x - lineApexX)
    : Math.PI / 2
  const lineCos = Math.cos(lineθ), lineSin = Math.sin(lineθ)
  const lineArea: { x: number; y: number }[] = []
  for (let y = 0; y < lineRows; y++) {
    for (let x = 0; x < lineCols; x++) {
      const dx = x - lineApexX, dy = y - lineApexY
      if (dy <= 0) continue  // only forward (below player)
      const dxr = dx * lineSin - dy * lineCos
      const dyr = dx * lineCos + dy * lineSin
      if (dyr <= 0) continue
      if (Math.abs(dxr) > 0.5) continue
      if (Math.hypot(dx, dy) > lenTiles + 0.5) continue
      lineArea.push({ x, y })
    }
  }
  const midL = Math.round(lenTiles / 2)
  const toGridL = (fwd: number, perp: number) => ({
    x: Math.max(0, Math.min(lineCols - 1, Math.round(lineApexX + lineSin * perp + lineCos * fwd))),
    y: Math.max(lineApexY + 1, Math.min(lineRows - 1, Math.round(lineApexY - lineCos * perp + lineSin * fwd))),
  })
  const lineHit = [toGridL(midL, 0), toGridL(lenTiles - 1, 0)]
    .filter(p => lineArea.some(c => c.x === p.x && c.y === p.y))
  return {
    cols: lineCols, rows: lineRows,
    playerPosA: { x: lineApexX, y: lineApexY },
    playerPosB: { x: lineApexX, y: lineApexY },
    enemyHitPositions:  lineHit.slice(0, 2),
    enemyMissPositions: [toGridL(midL, 2), toGridL(midL, -2)],
    areaCells: lineArea,
  }
}
