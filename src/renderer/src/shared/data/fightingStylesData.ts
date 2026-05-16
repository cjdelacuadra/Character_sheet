export interface FightingStyleDef {
  id: string
  name: string
  description: string
}

export const FIGHTING_STYLES: FightingStyleDef[] = [
  { id: 'archery', name: 'Archery', description: '+2 bonus to attack rolls with ranged weapons.' },
  { id: 'defense', name: 'Defense', description: '+1 to AC while you are wearing armor.' },
  { id: 'dueling', name: 'Dueling', description: '+2 to damage rolls when wielding a melee weapon in one hand and no other weapons.' },
  { id: 'great-weapon-fighting', name: 'Great Weapon Fighting', description: 'When you roll a 1 or 2 on a damage die for an attack with a two-handed or versatile weapon, you can reroll the die and must use the new roll.' },
  { id: 'protection', name: 'Protection', description: 'When a creature you can see attacks a target other than you within 5 ft, use your reaction to impose disadvantage on the attack roll (requires shield).' },
  { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting', description: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.' },
]

export const FIGHTING_STYLE_BY_ID: Record<string, FightingStyleDef> = Object.fromEntries(
  FIGHTING_STYLES.map(s => [s.id, s])
)

/** Classes that unlock a fighting style and at which level */
export const FIGHTING_STYLE_CLASSES: Record<string, number> = {
  Fighter: 1,
  Paladin: 2,
  Ranger: 2,
}
