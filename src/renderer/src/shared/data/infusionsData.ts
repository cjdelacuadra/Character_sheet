export interface InfusionDef {
  id: string
  name: string
  description: string
  /** Minimum Artificer class level to learn this infusion */
  prerequisiteLevel?: number
  /** Type of item this infusion attaches to (display-only hint) */
  appliesTo?: string
}

export const INFUSIONS: InfusionDef[] = [
  { id: 'enhancedArcaneFocus', name: 'Enhanced Arcane Focus',  prerequisiteLevel: 2,  appliesTo: 'Rod, staff, or wand', description: 'A magic rod, staff, or wand that grants +1 to spell attack rolls and ignores half cover. Bonus rises to +2 at Artificer level 10.' },
  { id: 'enhancedDefense',     name: 'Enhanced Defense',        prerequisiteLevel: 2,  appliesTo: 'Suit of armor or shield', description: 'Armor or shield grants +1 to AC. Bonus rises to +2 at Artificer level 10.' },
  { id: 'enhancedWeapon',      name: 'Enhanced Weapon',         prerequisiteLevel: 2,  appliesTo: 'Simple or martial weapon', description: 'Weapon gains +1 to attack and damage rolls. Bonus rises to +2 at Artificer level 10.' },
  { id: 'bagOfHolding',        name: 'Bag of Holding',          prerequisiteLevel: 2,  appliesTo: 'A bag', description: 'Functions as a Bag of Holding (500 lb / 64 cubic ft capacity).' },
  { id: 'bootsOfWindingPath',  name: 'Boots of the Winding Path', prerequisiteLevel: 6, appliesTo: 'A pair of boots', description: 'As a bonus action, teleport up to 15 ft to an unoccupied space you can see, provided you were standing within 15 ft of that space at the start of your turn.' },
  { id: 'cloakOfProtection',   name: 'Cloak of Protection',     prerequisiteLevel: 2,  appliesTo: 'A cloak', description: 'Grants +1 bonus to AC and to all saving throws while worn.' },
  { id: 'gogglesOfNight',      name: 'Goggles of Night',        prerequisiteLevel: 2,  appliesTo: 'A pair of goggles', description: 'Grants darkvision out to 60 ft while worn.' },
  { id: 'mindSharpener',       name: 'Mind Sharpener',          prerequisiteLevel: 2,  appliesTo: 'Suit of armor or robes', description: 'When the wearer fails a CON save to maintain concentration on a spell, they can succeed instead. Has 4 charges, regains all charges daily at dawn.' },
  { id: 'radiantWeapon',       name: 'Radiant Weapon',          prerequisiteLevel: 6,  appliesTo: 'Simple or martial weapon', description: '+1 to attack and damage rolls; as a bonus action, the weapon sheds bright light in a 30 ft radius for 1 min. 4 charges; spend 1 charge as a reaction when hit to impose disadvantage on the attacker.' },
  { id: 'repeatingShot',       name: 'Repeating Shot',          prerequisiteLevel: 2,  appliesTo: 'Simple or martial ranged weapon with ammunition', description: '+1 to attack and damage. Generates its own ammunition; you ignore the loading property if present.' },
  { id: 'replicateMagicItem',  name: 'Replicate Magic Item',    prerequisiteLevel: 2,  appliesTo: 'Various items', description: 'Choose a magic item from the Replicable Items tables (level-gated). You can pick this infusion multiple times to replicate different items.' },
  { id: 'resistantArmor',      name: 'Resistant Armor',         prerequisiteLevel: 6,  appliesTo: 'A suit of armor', description: 'Grants resistance to one damage type of your choice (acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, or thunder).' },
  { id: 'returningWeapon',     name: 'Returning Weapon',        prerequisiteLevel: 2,  appliesTo: 'Simple or martial weapon with the thrown property', description: '+1 to attack and damage rolls. Returns to the wielder’s hand immediately after a thrown attack.' },
  { id: 'spellRefuelingRing',  name: 'Spell-Refueling Ring',    prerequisiteLevel: 6,  appliesTo: 'A ring', description: 'While wearing the ring, the user can take a short rest to regain one expended spell slot (3rd level or lower). Once used, the ring can’t be used this way again until the next dawn.' },
  { id: 'manyHandedPouch',     name: 'Many-Handed Pouch',       prerequisiteLevel: 2,  appliesTo: 'A pouch (2 are infused as a pair)', description: 'Two infused pouches form a pair. You can reach into one to retrieve an item placed into the other, regardless of distance, provided both are on the same plane.' },
  { id: 'helmOfAwareness',     name: 'Helm of Awareness',       prerequisiteLevel: 10, appliesTo: 'A helmet', description: 'Wearer has advantage on initiative rolls. While wearing the helmet, the wearer and any creature they can see within 30 ft can’t be surprised, except when incapacitated.' },
]

export const INFUSION_BY_ID: Record<string, InfusionDef> =
  Object.fromEntries(INFUSIONS.map(i => [i.id, i]))

/**
 * Number of infusion designs an Artificer knows.
 * Per SRD / Eberron table: 4 at level 2, increasing in steps to 12 at level 20.
 */
export function maxInfusionsKnown(level: number): number {
  if (level < 2)  return 0
  if (level < 6)  return 4
  if (level < 10) return 6
  if (level < 14) return 8
  if (level < 18) return 10
  return 12
}

/**
 * Maximum number of infusions that can be ACTIVE on items simultaneously.
 * Matches the `Infuse Item` class resource progression.
 */
export function maxInfusionsActive(level: number): number {
  if (level < 2)  return 0
  if (level < 6)  return 2
  if (level < 10) return 3
  if (level < 14) return 4
  if (level < 18) return 5
  return 6
}
