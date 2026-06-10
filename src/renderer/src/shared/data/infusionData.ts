export interface Infusion {
  id: string
  name: string
  itemTypeRequired: string
  effect: string
  unlockLevel: number
}

export const infusions: Infusion[] = [
  {
    id: 'returning-weapon',
    name: 'Returning Weapon',
    itemTypeRequired: 'simple or martial weapon',
    effect: 'Deals +1 attack/damage and returns to hand immediately after being thrown',
    unlockLevel: 2,
  },
  {
    id: 'repeating-shot',
    name: 'Repeating Shot',
    itemTypeRequired: 'ranged weapon with ammunition',
    effect: 'Ignores loading property; conjures ammunition; +1 attack/damage',
    unlockLevel: 2,
  },
  {
    id: 'replicate-magic-item',
    name: 'Replicate Magic Item',
    itemTypeRequired: 'various',
    effect: 'Replicates a specific common magic item',
    unlockLevel: 2,
  },
  {
    id: 'armor-of-magical-strength',
    name: 'Armor of Magical Strength',
    itemTypeRequired: 'suit of armor',
    effect: 'Add INT mod to Str checks/saves; can use reaction to avoid falling prone',
    unlockLevel: 2,
  },
  {
    id: 'enhanced-arcane-focus',
    name: 'Enhanced Arcane Focus',
    itemTypeRequired: 'rod/staff/wand',
    effect: '+1 (or +2 at lv10) to spell attack/DC',
    unlockLevel: 2,
  },
  {
    id: 'enhanced-defense',
    name: 'Enhanced Defense',
    itemTypeRequired: 'light/medium/heavy armor or shield',
    effect: '+1 (or +2 at lv10) AC',
    unlockLevel: 2,
  },
  {
    id: 'enhanced-weapon',
    name: 'Enhanced Weapon',
    itemTypeRequired: 'simple or martial weapon',
    effect: '+1 (or +2 at lv10) attack/damage',
    unlockLevel: 2,
  },
  {
    id: 'mind-sharpener',
    name: 'Mind Sharpener',
    itemTypeRequired: 'studded leather, scale, or breastplate armor',
    effect: 'Reaction to maintain concentration (target DC = 10; free success)',
    unlockLevel: 2,
  },
]
