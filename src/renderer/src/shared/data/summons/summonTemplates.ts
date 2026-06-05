import type { SummonTemplate } from '@/entities/summon/types'

export type { SummonTemplate }

/** Built-in catalog. Editable copies are persisted to summonTemplates.json. */
export let SUMMON_TEMPLATES: SummonTemplate[] = [
  {
    id: 'skeleton',
    name: 'Skeleton',
    type: 'creature',
    source: 'builtin',
    maxHp: 13,
    ac: 13,
    speed: '30 ft',
    initiativeMod: 2,
    actionEconomy: { actions: 1, bonusActions: 1, reactions: 1 },
    attacks: [
      { id: 'shortsword', name: 'Shortsword', toHit: '+4', damage: '1d6+2', damageType: 'piercing' },
      { id: 'shortbow', name: 'Shortbow', toHit: '+4', damage: '1d6+2', damageType: 'piercing', notes: 'range 80/320' },
    ],
    defaultNotes: 'Vulnerable to bludgeoning. Obeys verbal commands.',
  },
  {
    id: 'zombie',
    name: 'Zombie',
    type: 'creature',
    source: 'builtin',
    maxHp: 22,
    ac: 8,
    speed: '20 ft',
    initiativeMod: -2,
    actionEconomy: { actions: 1, bonusActions: 1, reactions: 1 },
    attacks: [
      { id: 'slam', name: 'Slam', toHit: '+3', damage: '1d6+1', damageType: 'bludgeoning' },
    ],
    defaultNotes: 'Undead Fortitude: drops to 1 HP on a CON save (DC 5 + damage) unless radiant/crit.',
  },
  {
    id: 'eldritch-cannon-flamethrower',
    name: 'Eldritch Cannon (Flamethrower)',
    type: 'structure',
    source: 'builtin',
    maxHp: 5,
    maxHpFormula: '5 × artificer level',
    ac: 18,
    speed: '15 ft (walking variant)',
    initiativeMod: 0,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 0 },
    attacks: [
      { id: 'flame', name: 'Flamethrower', toHit: 'DC = spell save', damage: '2d8', damageType: 'fire', notes: '15-ft cone, Dex save for half' },
    ],
    defaultNotes: 'Activated as a bonus action by its creator.',
  },
  {
    id: 'eldritch-cannon-force-ballista',
    name: 'Eldritch Cannon (Force Ballista)',
    type: 'structure',
    source: 'builtin',
    maxHp: 5,
    maxHpFormula: '5 × artificer level',
    ac: 18,
    speed: '15 ft (walking variant)',
    initiativeMod: 0,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 0 },
    attacks: [
      { id: 'ballista', name: 'Force Ballista', toHit: 'spell attack', damage: '2d8', damageType: 'force', notes: 'range 120 ft, push 5 ft' },
    ],
    defaultNotes: 'Activated as a bonus action by its creator.',
  },
  {
    id: 'eldritch-cannon-protector',
    name: 'Eldritch Cannon (Protector)',
    type: 'structure',
    source: 'builtin',
    maxHp: 5,
    maxHpFormula: '5 × artificer level',
    ac: 18,
    speed: '15 ft (walking variant)',
    initiativeMod: 0,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 0 },
    attacks: [],
    defaultNotes: 'Emits a protective aura granting temp HP (1d8 + INT mod) to creatures within 10 ft.',
  },
  {
    id: 'beast-spirit',
    name: 'Beast Spirit (Land)',
    type: 'creature',
    source: 'builtin',
    maxHp: 30,
    maxHpFormula: '30 + 5 per slot above 3rd',
    ac: 13,
    speed: '40 ft',
    initiativeMod: 2,
    actionEconomy: { actions: 1, bonusActions: 1, reactions: 1 },
    attacks: [
      { id: 'maul', name: 'Maul', toHit: 'spell atk', damage: '1d8 + spell mod', damageType: 'piercing', notes: '+1d8 per slot above 3rd' },
    ],
    defaultNotes: 'Summon Beast (concentration). Acts on your turn after you command it (no action).',
  },
  {
    id: 'spiritual-weapon',
    name: 'Spiritual Weapon',
    type: 'construct',
    source: 'spell',
    maxHp: 10,
    ac: 40,
    speed: '20 ft (hover)',
    initiativeMod: 0,
    actionEconomy: {
      actions: 0,
      bonusActions: 1,
      reactions: 0
    },
    attacks: [
      {
        id: 'force-strike',
        name: 'Force Strike',
        toHit: 'spell attack',
        damage: '1d8+spellcasting modifier',
        damageType: 'force'
      }
    ],
    defaultNotes: 'Can be moved and attacked with using a bonus action.'
  },
  {
    id: "steel-defender",
    name: "Steel Defender",
    type: "construct",
    source: "class-feature",
    maxHp: 40,
    maxHpFormula: "2 + Intelligence modifier + 5 × artificer level",
    ac: 15,
    speed: "40 ft",
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1
    },
    attacks: [
      {
        id: "force-empowered-rend",
        name: "Force-Empowered Rend",
        toHit: "spell attack",
        damage: "1d8+PB",
        damageType: "force"
      }
    ],
    defaultNotes: "Can impose disadvantage with Deflect Attack reaction."
  },
  {
    id: "familiar-owl",
    name: "Familiar (Owl)",
    type: "beast",
    source: "spell",
    maxHp: 1,
    ac: 11,
    speed: "5 ft, fly 60 ft",
    initiativeMod: 1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1
    },
    attacks: [],
    defaultNotes: "Cannot attack. Can deliver touch spells and use Help action."
  },
  {
    id: "drake-companion",
    name: "Drake Companion",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1
    },
    attacks: [
      {
        id: "rend",
        name: "Rend",
        toHit: "PB + spell modifier",
        damage: "1d6+PB",
        damageType: "piercing"
      }
    ],
    defaultNotes: "Its damage type depends on the drake's essence."
  },
  {
    id: "drake-red",
    name: "Drake (Red)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "fire" }],
    defaultNotes: "Red drake — fire damage."
  },
  {
    id: "drake-blue",
    name: "Drake (Blue)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "lightning" }],
    defaultNotes: "Blue drake — lightning damage."
  },
  {
    id: "drake-green",
    name: "Drake (Green)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "poison" }],
    defaultNotes: "Green drake — poison damage."
  },
  {
    id: "drake-black",
    name: "Drake (Black)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "acid" }],
    defaultNotes: "Black drake — acid damage."
  },
  {
    id: "drake-white",
    name: "Drake (White)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "cold" }],
    defaultNotes: "White drake — cold damage."
  },
  {
    id: "drake-gold",
    name: "Drake (Gold)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "fire" }],
    defaultNotes: "Gold drake — fire damage."
  },
  {
    id: "drake-silver",
    name: "Drake (Silver)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "cold" }],
    defaultNotes: "Silver drake — cold damage."
  },
  {
    id: "drake-bronze",
    name: "Drake (Bronze)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "lightning" }],
    defaultNotes: "Bronze drake — lightning damage."
  },
  {
    id: "drake-copper",
    name: "Drake (Copper)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "acid" }],
    defaultNotes: "Copper drake — acid damage."
  },
  {
    id: "drake-brass",
    name: "Drake (Brass)",
    type: "dragon",
    source: "class-feature",
    maxHp: 35,
    maxHpFormula: "5 + five times ranger level",
    ac: 14,
    speed: "40 ft",
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [{ id: "rend", name: "Rend", toHit: "PB + spell modifier", damage: "1d6+PB", damageType: "fire" }],
    defaultNotes: "Brass drake — fire damage."
  },
  {
    id: "shadowspawn-fury",
    name: "Shadowspawn (Fury)",
    type: "monstrosity",
    source: "spell",
    maxHp: 35,
    maxHpFormula: "35 + 15 for each spell level above 3rd",
    ac: 11,
    speed: "40 ft",
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 0
    },
    attacks: [
      {
        id: "chilling-rend",
        name: "Chilling Rend",
        toHit: "spell attack",
        damage: "1d12+3+spell level",
        damageType: "cold"
      }
    ],
    defaultNotes: "Targets frightened of it take extra pressure from attacks."
  },
  {
    id: "aberration-spawn-slaad",
    name: "Summoned Aberration (Slaad)",
    type: "aberration",
    source: "spell",
    maxHp: 40,
    maxHpFormula: "40 + 10 for each spell level above 4th",
    ac: 11,
    speed: "30 ft",
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1
    },
    attacks: [
      {
        id: "claw",
        name: "Claw",
        toHit: "spell attack",
        damage: "1d10+3+spell level",
        damageType: "slashing"
      }
    ],
    defaultNotes: "Regenerates HP at the start of its turn."
  },
  {
    id: 'fey-spirit',
    name: 'Fey Spirit',
    type: 'creature',
    source: 'builtin',
    maxHp: 30,
    maxHpFormula: '30 + 10 per slot above 3rd',
    ac: 13,
    speed: '40 ft, fly 30 ft',
    initiativeMod: 3,
    actionEconomy: { actions: 1, bonusActions: 1, reactions: 1 },
    attacks: [
      { id: 'fey-strike', name: 'Fey Strike', toHit: 'spell atk', damage: '2d6 + 3 + spell mod', damageType: 'force', notes: '+1d6 per slot above 3rd' },
    ],
    defaultNotes: 'Summon Fey (concentration). Mood (Fuming/Mirthful/Tricksy) grants a rider effect.',
  },
 {
    id: 'mage-hand',
    name: 'Mage Hand',
    type: 'spectral',
    source: 'spell',
    maxHp: 10,
    ac: 10,
    speed: '30 ft',
    initiativeMod: 0,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 0,
    },
    attacks: [],
    defaultNotes: 'Can manipulate objects up to 10 pounds.'
  },

  {
    id: 'unseen-servant',
    name: 'Unseen Servant',
    type: 'spirit',
    source: 'spell',
    maxHp: 1,
    ac: 10,
    speed: '15 ft',
    initiativeMod: 0,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 0,
    },
    attacks: [],
    defaultNotes: 'Mindless invisible force that performs simple tasks.'
  },

  {
    id: 'tiny-servant',
    name: 'Tiny Servant',
    type: 'construct',
    source: 'spell',
    maxHp: 10,
    ac: 15,
    speed: '30 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'slam',
        name: 'Slam',
        toHit: '+5',
        damage: '1d4+3',
        damageType: 'bludgeoning',
      }
    ],
    defaultNotes: 'Animated object created from a Tiny nonmagical item.'
  },

  {
    id: 'homunculus-servant',
    name: 'Homunculus Servant',
    type: 'construct',
    source: 'infusion',
    maxHp: 8,
    maxHpFormula: '1 + Intelligence modifier + artificer level',
    ac: 13,
    speed: '20 ft, fly 30 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'force-strike',
        name: 'Force Strike',
        toHit: 'spell attack',
        damage: '1d4+PB',
        damageType: 'force',
      }
    ],
    defaultNotes: 'Can channel touch spells through its reaction.'
  },
  {
    id: 'steam-mephit',
    name: 'Steam Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 21,
    ac: 10,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+4',
        damage: '1d4+2',
        damageType: 'slashing',
      },
      {
        id: 'steam-breath',
        name: 'Steam Breath',
        toHit: 'Dex save DC 10',
        damage: '1d8',
        damageType: 'fire',
        notes: '15-ft cone',
      }
    ],
    defaultNotes: 'Death Burst deals fire damage in a small radius.'
  },

  {
    id: 'dust-mephit',
    name: 'Dust Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 17,
    ac: 12,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+4',
        damage: '1d4+2',
        damageType: 'slashing',
      },
      {
        id: 'blinding-breath',
        name: 'Blinding Breath',
        toHit: 'Con save DC 10',
        damage: '0',
        damageType: 'blindness',
        notes: '15-ft cone, blinds on failed save',
      }
    ],
    defaultNotes: 'Death Burst can blind nearby creatures.'
  },

  {
    id: 'ice-mephit',
    name: 'Ice Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 21,
    ac: 11,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+3',
        damage: '1d4+1',
        damageType: 'slashing',
      },
      {
        id: 'frost-breath',
        name: 'Frost Breath',
        toHit: 'Dex save DC 10',
        damage: '2d4',
        damageType: 'cold',
        notes: '15-ft cone',
      }
    ],
    defaultNotes: 'Death Burst deals cold damage nearby.'
  },

  {
    id: 'magma-mephit',
    name: 'Magma Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 22,
    ac: 11,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+3',
        damage: '1d4+1',
        damageType: 'slashing',
      },
      {
        id: 'fire-breath',
        name: 'Fire Breath',
        toHit: 'Dex save DC 11',
        damage: '2d6',
        damageType: 'fire',
        notes: '15-ft cone',
      }
    ],
    defaultNotes: 'Death Burst deals fire damage in 10-ft radius.'
  },

  {
    id: 'mud-mephit',
    name: 'Mud Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 27,
    ac: 11,
    speed: '20 ft, fly 20 ft',
    initiativeMod: -1,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+3',
        damage: '1d6+1',
        damageType: 'slashing',
      },
      {
        id: 'mud-breath',
        name: 'Mud Breath',
        toHit: 'Dex save DC 11',
        damage: '0',
        damageType: 'restrained',
        notes: 'Restrains targets in 15-ft cone',
      }
    ],
    defaultNotes: 'Can restrain enemies with sticky mud.'
  },

  {
    id: 'smoke-mephit',
    name: 'Smoke Mephit',
    type: 'elemental',
    source: 'conjured',
    maxHp: 22,
    ac: 12,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+4',
        damage: '1d4+2',
        damageType: 'slashing',
      },
      {
        id: 'cinder-breath',
        name: 'Cinder Breath',
        toHit: 'Dex save DC 10',
        damage: '1d8',
        damageType: 'fire',
        notes: '15-ft cone',
      }
    ],
    defaultNotes: 'Death Burst creates a smoke cloud.'
  },

  {
    id: 'air-elemental-myrrh',
    name: 'Air Elemental Myrmidon',
    type: 'elemental',
    source: 'conjured',
    maxHp: 117,
    ac: 18,
    speed: '40 ft, fly 40 ft',
    initiativeMod: 5,
    actionEconomy: {
      actions: 2,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'flail',
        name: 'Lightning Flail',
        toHit: '+7',
        damage: '2d8+4',
        damageType: 'bludgeoning',
      }
    ],
    defaultNotes: 'Immune to lightning, poison, and exhaustion.'
  },

  {
    id: 'fire-elemental-myrrh',
    name: 'Fire Elemental Myrmidon',
    type: 'elemental',
    source: 'conjured',
    maxHp: 102,
    ac: 18,
    speed: '40 ft',
    initiativeMod: 3,
    actionEconomy: {
      actions: 2,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'scimitar',
        name: 'Flame Scimitar',
        toHit: '+7',
        damage: '2d6+4',
        damageType: 'fire',
      }
    ],
    defaultNotes: 'Ignites flammable objects on contact.'
  },

  {
    id: 'water-weird',
    name: 'Water Weird',
    type: 'elemental',
    source: 'conjured',
    maxHp: 58,
    ac: 13,
    speed: '0 ft, swim 60 ft',
    initiativeMod: 3,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'constrict',
        name: 'Constrict',
        toHit: '+5',
        damage: '2d6+3',
        damageType: 'bludgeoning',
        notes: 'grapple escape DC 13',
      }
    ],
    defaultNotes: 'Invisible while fully submerged in water.'
  },

  {
    id: 'gargoyle',
    name: 'Gargoyle',
    type: 'elemental',
    source: 'conjured',
    maxHp: 52,
    ac: 15,
    speed: '30 ft, fly 60 ft',
    initiativeMod: 0,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'bite',
        name: 'Bite',
        toHit: '+4',
        damage: '1d6+2',
        damageType: 'piercing',
      },
      {
        id: 'claws',
        name: 'Claws',
        toHit: '+4',
        damage: '1d6+2',
        damageType: 'slashing',
      }
    ],
    defaultNotes: 'Can remain motionless and appear indistinguishable from stone.'
  },

  {
    id: 'dancing-item',
    name: 'Dancing Item',
    type: 'construct',
    source: 'class-feature',
    maxHp: 16,
    maxHpFormula: '10 + bard level',
    ac: 16,
    speed: '30 ft, fly 30 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 1,
      reactions: 1,
    },
    attacks: [
      {
        id: 'force-attack',
        name: 'Force-Empowered Slam',
        toHit: 'spell attack',
        damage: '1d10+PB',
        damageType: 'force',
      }
    ],
    defaultNotes: 'Created using Performance of Creation.'
  },

  {
    id: 'guardian-of-faith',
    name: 'Guardian of Faith',
    type: 'celestial',
    source: 'spell',
    maxHp: 60,
    ac: 20,
    speed: '0 ft',
    initiativeMod: 0,
    actionEconomy: {
      actions: 0,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'radiant-burst',
        name: 'Radiant Burst',
        toHit: 'Dex save',
        damage: '20',
        damageType: 'radiant',
      }
    ],
    defaultNotes: 'Deals damage when enemies move within 10 ft.'
  },
  {
    id: 'floating-skull',
    name: 'Flaming Skull Spirit',
    type: 'undead',
    source: 'homebrew',
    maxHp: 27,
    ac: 14,
    speed: '0 ft, fly 40 ft',
    initiativeMod: 3,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'fire-bolt',
        name: 'Fire Bolt',
        toHit: '+5',
        damage: '2d10',
        damageType: 'fire',
      }
    ],
    defaultNotes: 'Immune to fire and poison.'
  },

  {
    id: 'air-elemental-spirit',
    name: 'Elemental Spirit (Air)',
    type: 'elemental',
    source: 'spell',
    maxHp: 50,
    maxHpFormula: '50 + 10 for each spell level above 4th',
    ac: 16,
    speed: '40 ft, fly 40 ft',
    initiativeMod: 5,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'slam',
        name: 'Slam',
        toHit: 'spell attack',
        damage: '1d10+4+spell level',
        damageType: 'thunder',
      }
    ],
    defaultNotes: 'Can fly and move through small openings.'
  },

  {
    id: 'fire-elemental-spirit',
    name: 'Elemental Spirit (Fire)',
    type: 'elemental',
    source: 'spell',
    maxHp: 50,
    maxHpFormula: '50 + 10 for each spell level above 4th',
    ac: 13,
    speed: '40 ft',
    initiativeMod: 3,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 0,
    },
    attacks: [
      {
        id: 'touch',
        name: 'Fiery Touch',
        toHit: 'spell attack',
        damage: '1d10+4+spell level',
        damageType: 'fire',
      }
    ],
    defaultNotes: 'Ignites flammable objects not being worn or carried.'
  },

  {
    id: 'fey-spirit-mirthful',
    name: 'Fey Spirit (Mirthful)',
    type: 'fey',
    source: 'spell',
    maxHp: 30,
    maxHpFormula: '30 + 10 for each spell level above 3rd',
    ac: 15,
    speed: '40 ft',
    initiativeMod: 4,
    actionEconomy: {
      actions: 1,
      bonusActions: 1,
      reactions: 1,
    },
    attacks: [
      {
        id: 'shortsword',
        name: 'Shortsword',
        toHit: 'spell attack',
        damage: '1d6+3+spell level',
        damageType: 'force',
      }
    ],
    defaultNotes: 'Can charm nearby creatures with Fey Step.'
  },

  {
    id: 'celestial-avenger',
    name: 'Celestial Spirit (Avenger)',
    type: 'celestial',
    source: 'spell',
    maxHp: 40,
    maxHpFormula: '40 + 10 for each spell level above 5th',
    ac: 16,
    speed: '30 ft, fly 40 ft',
    initiativeMod: 2,
    actionEconomy: {
      actions: 1,
      bonusActions: 0,
      reactions: 1,
    },
    attacks: [
      {
        id: 'radiant-bow',
        name: 'Radiant Bow',
        toHit: 'spell attack',
        damage: '2d6+2+spell level',
        damageType: 'radiant',
        notes: 'range 150/600'
      }
    ],
    defaultNotes: 'Heals allies whenever it casts healing magic.'
  },

  {
    id: 'familiar-imp',
    name: 'Familiar (Imp)',
    type: 'creature',
    source: 'class-feature',
    maxHp: 10,
    ac: 13,
    speed: '20 ft, fly 40 ft',
    initiativeMod: 1,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [
      { id: 'sting', name: 'Sting', toHit: '+5', damage: '1d4+3 piercing + 3d6 poison', damageType: 'piercing' },
    ],
    defaultNotes: 'Pact Chain familiar. Poison damage uses your spell save DC.'
  },

  {
    id: 'familiar-pseudodragon',
    name: 'Familiar (Pseudodragon)',
    type: 'dragon',
    source: 'class-feature',
    maxHp: 7,
    ac: 13,
    speed: '15 ft, fly 60 ft',
    initiativeMod: 2,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [
      { id: 'sting', name: 'Sting', toHit: '+4', damage: '1d4+2 piercing + 3d6 poison', damageType: 'piercing' },
      { id: 'bite', name: 'Bite', toHit: '+4', damage: '1d4+2 piercing', damageType: 'piercing' },
    ],
    defaultNotes: 'Pact Chain familiar. Can sense nearby poison and magic.'
  },

  {
    id: 'familiar-quasit',
    name: 'Familiar (Quasit)',
    type: 'creature',
    source: 'class-feature',
    maxHp: 7,
    ac: 13,
    speed: '40 ft, fly 40 ft',
    initiativeMod: 2,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [
      { id: 'claws', name: 'Claws', toHit: '+4', damage: '1d4+3 slashing + 1d4 poison', damageType: 'slashing' },
    ],
    defaultNotes: 'Pact Chain familiar. Poison damage uses your spell save DC.'
  },

  {
    id: 'familiar-sprite',
    name: 'Familiar (Sprite)',
    type: 'fey',
    source: 'class-feature',
    maxHp: 2,
    ac: 13,
    speed: '10 ft, fly 40 ft',
    initiativeMod: 3,
    actionEconomy: { actions: 1, bonusActions: 0, reactions: 1 },
    attacks: [
      { id: 'longbow', name: 'Longbow', toHit: '+6', damage: '1 piercing + sleep poison', damageType: 'piercing', notes: 'Poison: target must succeed on CON save or fall unconscious for 1 minute' },
    ],
    defaultNotes: 'Pact Chain familiar. Can cast Invisibility on itself.'
  },
]

export let SUMMON_TEMPLATE_BY_ID =
  Object.fromEntries(SUMMON_TEMPLATES.map(t => [t.id, t])) as Record<string, SummonTemplate>

export function setSummonTemplatesData(items: SummonTemplate[]): void {
  SUMMON_TEMPLATES = items
  SUMMON_TEMPLATE_BY_ID =
    Object.fromEntries(items.map(t => [t.id, t])) as Record<string, SummonTemplate>
}

type Source = "builtin" | "custom" | "spell" | "class-feature" | "infusion" | "homebrew" | "celestial" | "conjured" | "other"
