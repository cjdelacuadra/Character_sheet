export interface WildSurgeEntry {
  roll: number
  name: string
  description: string
}

export const wildSurgeTable: WildSurgeEntry[] = [
  { roll: 1, name: 'Shadowy tendrils', description: 'Psychic damage aura radiates from you' },
  { roll: 2, name: 'Surge of vitality', description: 'You regain HP equal to 2d6 + Con mod' },
  { roll: 3, name: 'Orb of fire', description: 'A fiery orb appears and damages a nearby creature' },
  { roll: 4, name: 'Teleport', description: 'You teleport up to 30ft to an unoccupied space' },
  { roll: 5, name: 'Intangibility', description: 'You gain resistance to bludgeoning/piercing/slashing' },
  { roll: 6, name: 'Ghostly body', description: 'You gain a fly speed equal to your walking speed' },
  { roll: 7, name: 'Brambles', description: 'Thorns sprout from you; creatures that hit you take 2d6 piercing' },
  { roll: 8, name: 'Invisible', description: 'You turn invisible until start of your next turn or until you attack' },
]
