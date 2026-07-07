/**
 * Channel Divinity option catalog — one entry per option, with the granting
 * subclass as a DEFAULT source (never a gate: the UI offers defaults, and any
 * option can be added to any character with the Channel Divinity resource).
 * `mechanics` carries the computable part; text covers the rest.
 */
export interface ChannelDivinityOption {
  id: string
  name: string
  /** Subclass id granting it by default; 'cleric' = every cleric domain. */
  source: string | 'cleric'
  minLevel?: number
  action: 'action' | 'bonus' | 'reaction' | 'special'
  desc: string
  mechanics?:
    | { kind: 'healPool'; amountPerLevel: number }
    | { kind: 'damage'; formula: string; damageType: string; save?: 'con' | 'wis' | 'cha' | 'dex' }
    | { kind: 'tempHp'; formula: string }
    | { kind: 'attackBonus'; value: number }
}

export const CHANNEL_DIVINITY_OPTIONS: ChannelDivinityOption[] = [
  { id: 'turn-undead', name: 'Turn Undead', source: 'cleric', minLevel: 2, action: 'action',
    desc: 'Present your holy symbol: each undead within 30 ft that can see or hear you makes a WIS save or is turned for 1 minute or until it takes damage. Undead of low enough CR are destroyed outright (CR ½ at level 5, 1 at 8, 2 at 11, 3 at 14, 4 at 17).' },
  { id: 'preserve-life', name: 'Preserve Life', source: 'LifeDomain', minLevel: 2, action: 'action',
    desc: 'Restore HP equal to 5 × cleric level, divided among creatures within 30 ft; none above half their HP max. No effect on undead or constructs.',
    mechanics: { kind: 'healPool', amountPerLevel: 5 } },
  { id: 'radiance-of-the-dawn', name: 'Radiance of the Dawn', source: 'LightDomain', minLevel: 2, action: 'action',
    desc: 'Dispel magical darkness within 30 ft. Each hostile creature within 30 ft makes a CON save, taking 2d10 + cleric level radiant damage (half on success).',
    mechanics: { kind: 'damage', formula: '2d10 + <level>', damageType: 'radiant', save: 'con' } },
  { id: 'invoke-duplicity', name: 'Invoke Duplicity', source: 'TrickeryDomain', minLevel: 2, action: 'action',
    desc: 'Create an illusory duplicate for 1 minute (concentration). You can cast spells as if in its space, and you have advantage on attacks against creatures within 5 ft of both you and it.' },
  { id: 'cloak-of-shadows', name: 'Cloak of Shadows', source: 'TrickeryDomain', minLevel: 6, action: 'action',
    desc: 'Become invisible until the end of your next turn, or until you attack or cast a spell.' },
  { id: 'knowledge-of-the-ages', name: 'Knowledge of the Ages', source: 'KnowledgeDomain', minLevel: 2, action: 'action',
    desc: 'For 10 minutes, gain proficiency with one skill or tool of your choice.' },
  { id: 'read-thoughts', name: 'Read Thoughts', source: 'KnowledgeDomain', minLevel: 6, action: 'action',
    desc: 'One creature within 60 ft makes a WIS save; on a failure, read its surface thoughts for 1 minute and you may cast Suggestion on it without a slot (it fails its save automatically).' },
  { id: 'charm-animals-and-plants', name: 'Charm Animals and Plants', source: 'NatureDomain', minLevel: 2, action: 'action',
    desc: 'Each beast or plant creature within 30 ft that can see you makes a WIS save or is charmed by you for 1 minute (friendly to you and your companions).' },
  { id: 'destructive-wrath', name: 'Destructive Wrath', source: 'TempestDomain', minLevel: 2, action: 'special',
    desc: 'When you roll lightning or thunder damage, deal maximum damage instead of rolling.' },
  { id: 'guided-strike', name: 'Guided Strike', source: 'WarDomain', minLevel: 2, action: 'special',
    desc: 'When you make an attack roll, gain +10 to the roll (after seeing the roll, before knowing the outcome).',
    mechanics: { kind: 'attackBonus', value: 10 } },
  { id: 'war-gods-blessing', name: "War God's Blessing", source: 'WarDomain', minLevel: 6, action: 'reaction',
    desc: 'When a creature within 30 ft makes an attack roll, grant it +10 to the roll.',
    mechanics: { kind: 'attackBonus', value: 10 } },
  { id: 'touch-of-death', name: 'Touch of Death', source: 'DeathDomain', minLevel: 2, action: 'special',
    desc: 'When you hit a creature with a melee attack, deal extra necrotic damage equal to 5 + twice your cleric level.',
    mechanics: { kind: 'damage', formula: '5 + <level*2>', damageType: 'necrotic' } },
  { id: 'arcane-abjuration', name: 'Arcane Abjuration', source: 'ArcanaDomain', minLevel: 2, action: 'action',
    desc: 'One celestial, elemental, fey, or fiend within 30 ft makes a WIS save or is turned for 1 minute. Low-CR creatures are banished at higher levels.' },
  { id: 'artisans-blessing', name: "Artisan's Blessing", source: 'ForgeDomain', minLevel: 2, action: 'special',
    desc: 'Over 1 hour (can coincide with a short rest), craft a nonmagical metal item worth up to 100 gp, consuming metal worth its value.' },
  { id: 'path-to-the-grave', name: 'Path to the Grave', source: 'GraveDomain', minLevel: 2, action: 'action',
    desc: 'Curse one creature within 30 ft until the end of your next turn: the next attack or spell to damage it treats it as having vulnerability to all of that damage, then the curse ends.' },
  { id: 'orders-demand', name: "Order's Demand", source: 'OrderDomain', minLevel: 2, action: 'action',
    desc: 'Each creature of your choice within 30 ft that can see or hear you makes a CHA save or is charmed until the end of your next turn and drops what it is holding.' },
  { id: 'balm-of-peace', name: 'Balm of Peace', source: 'PeaceDomain', minLevel: 2, action: 'action',
    desc: 'Move up to your speed without provoking opportunity attacks; each creature you move within 5 ft of regains 2d6 + WIS mod HP (once per creature per use).',
    mechanics: { kind: 'healPool', amountPerLevel: 0 } },
  { id: 'twilight-sanctuary', name: 'Twilight Sanctuary', source: 'TwilightDomain', minLevel: 2, action: 'action',
    desc: 'A 30-ft sphere of twilight around you for 1 minute. A creature ending its turn inside gains temp HP equal to 1d6 + cleric level, or ends one charm/fear effect on itself.',
    mechanics: { kind: 'tempHp', formula: '1d6 + <level>' } },
  // ── Paladin oaths (2 options each at 3rd) ─────────────────────────────
  { id: 'sacred-weapon', name: 'Sacred Weapon', source: 'OathOfDevotion', minLevel: 3, action: 'action',
    desc: 'For 1 minute, add your CHA modifier to attack rolls with one weapon (min +1). The weapon emits bright light in 20 ft and counts as magical.' },
  { id: 'turn-the-unholy', name: 'Turn the Unholy', source: 'OathOfDevotion', minLevel: 3, action: 'action',
    desc: 'Each fiend or undead within 30 ft that can see or hear you makes a WIS save or is turned for 1 minute or until it takes damage.' },
  { id: 'natures-wrath', name: "Nature's Wrath", source: 'OathOfTheAncients', minLevel: 3, action: 'action',
    desc: 'Spectral vines ensnare one creature within 10 ft: STR or DEX save (its choice) or restrained. It repeats the save at the end of each of its turns.' },
  { id: 'turn-the-faithless', name: 'Turn the Faithless', source: 'OathOfTheAncients', minLevel: 3, action: 'action',
    desc: 'Each fey or fiend within 30 ft that can hear you makes a WIS save or is turned for 1 minute. Illusory or shapeshifted forms are revealed.' },
  { id: 'abjure-enemy', name: 'Abjure Enemy', source: 'OathOfVengeance', minLevel: 3, action: 'action',
    desc: 'One creature within 60 ft makes a WIS save: on failure it is frightened and its speed is 0 for 1 minute; on success its speed is halved. Fiends and undead have disadvantage.' },
  { id: 'vow-of-enmity', name: 'Vow of Enmity', source: 'OathOfVengeance', minLevel: 3, action: 'bonus',
    desc: 'Utter a vow against a creature within 10 ft: you gain advantage on attack rolls against it for 1 minute or until it drops to 0 HP or falls unconscious.' },
  { id: 'conquering-presence', name: 'Conquering Presence', source: 'OathOfConquest', minLevel: 3, action: 'action',
    desc: 'Each creature of your choice within 30 ft makes a WIS save or is frightened of you for 1 minute. It repeats the save at the end of each of its turns.' },
  { id: 'guided-strike-conquest', name: 'Guided Strike', source: 'OathOfConquest', minLevel: 3, action: 'special',
    desc: 'When you make an attack roll, gain +10 to the roll (after seeing the roll, before knowing the outcome).',
    mechanics: { kind: 'attackBonus', value: 10 } },
  { id: 'emissary-of-peace', name: 'Emissary of Peace', source: 'OathOfRedemption', minLevel: 3, action: 'bonus',
    desc: 'Gain +5 to Charisma (Persuasion) checks for the next 10 minutes.' },
  { id: 'rebuke-the-violent', name: 'Rebuke the Violent', source: 'OathOfRedemption', minLevel: 3, action: 'reaction',
    desc: 'When an attacker within 30 ft damages a creature other than you, it makes a WIS save, taking radiant damage equal to the damage it dealt (half on success).' },
  { id: 'peerless-athlete', name: 'Peerless Athlete', source: 'OathOfGlory', minLevel: 3, action: 'bonus',
    desc: 'For 10 minutes: advantage on Athletics and Acrobatics checks, carrying capacity doubles, and +10 ft on long jumps.' },
  { id: 'inspiring-smite', name: 'Inspiring Smite', source: 'OathOfGlory', minLevel: 3, action: 'bonus',
    desc: 'Immediately after dealing Divine Smite damage, distribute 2d8 + your paladin level temporary HP among creatures within 30 ft (including yourself).',
    mechanics: { kind: 'tempHp', formula: '2d8 + <level>' } },
  { id: 'watchers-will', name: "Watcher's Will", source: 'OathOfTheWatchers', minLevel: 3, action: 'action',
    desc: 'Choose up to CHA mod creatures within 30 ft (min 1): for 1 minute they have advantage on INT, WIS, and CHA saving throws.' },
  { id: 'abjure-the-extraplanar', name: 'Abjure the Extraplanar', source: 'OathOfTheWatchers', minLevel: 3, action: 'action',
    desc: 'Each aberration, celestial, elemental, fey, or fiend within 30 ft that can hear you makes a WIS save or is turned for 1 minute.' },
  { id: 'control-undead', name: 'Control Undead', source: 'Oathbreaker', minLevel: 3, action: 'action',
    desc: 'One undead within 30 ft makes a WIS save or must obey your commands for 24 hours (CR must be below your paladin level).' },
  { id: 'dreadful-aspect', name: 'Dreadful Aspect', source: 'Oathbreaker', minLevel: 3, action: 'action',
    desc: 'Each creature of your choice within 30 ft that can see you makes a WIS save or is frightened of you for 1 minute.' },
]

export const CHANNEL_DIVINITY_BY_ID: Record<string, ChannelDivinityOption> = Object.fromEntries(
  CHANNEL_DIVINITY_OPTIONS.map(o => [o.id, o]),
)

/** Default options for a subclass at a level ('cleric' = any divine domain). */
export function channelDivinityOptionsFor(subclassId: string | undefined, level: number): ChannelDivinityOption[] {
  return CHANNEL_DIVINITY_OPTIONS.filter(o =>
    (o.source === 'cleric' ? (subclassId ?? '').endsWith('Domain') : o.source === subclassId) &&
    level >= (o.minLevel ?? 2))
}
