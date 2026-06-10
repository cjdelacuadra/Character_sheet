export interface ArcaneShot {
  id: string
  name: string
  effectSummary: string
  saveType: string | null
  onHitBehavior: string
}

export const arcaneShots: ArcaneShot[] = [
  { id: 'banishing-arrow', name: 'Banishing Arrow', effectSummary: 'Force the target to succeed on a Cha save or be banished to a harmless demiplane until end of your next turn', saveType: 'Cha', onHitBehavior: 'Target makes a Charisma save; on failure, it is banished until the end of your next turn' },
  { id: 'beguiling-arrow', name: 'Beguiling Arrow', effectSummary: 'The target takes an extra 2d6 psychic damage; Wis save or charmed until start of your next turn', saveType: 'Wis', onHitBehavior: 'Add 2d6 psychic damage; target makes a Wisdom save or is charmed until the start of your next turn' },
  { id: 'bursting-arrow', name: 'Bursting Arrow', effectSummary: 'The target and all creatures within 10ft take force damage equal to the superiority die', saveType: null, onHitBehavior: 'Target and creatures within 10ft take force damage equal to the superiority die' },
  { id: 'enfeebling-arrow', name: 'Enfeebling Arrow', effectSummary: 'The target takes 2d6 necrotic; Con save or its weapon attacks deal only half damage until end of your next turn', saveType: 'Con', onHitBehavior: 'Add 2d6 necrotic damage; target makes a Constitution save or its weapon attacks deal half damage until the end of your next turn' },
  { id: 'grasping-arrow', name: 'Grasping Arrow', effectSummary: 'The target takes 2d6 poison; grasping vines slow movement by 10ft and deal 2d6 slashing if it moves (Str save to escape)', saveType: 'Str', onHitBehavior: 'Add 2d6 poison damage; vines reduce speed by 10ft and deal 2d6 slashing when the target moves until it escapes with a Strength save' },
  { id: 'piercing-arrow', name: 'Piercing Arrow', effectSummary: "Draw a 1ft-wide, 30ft-long line through space; targets in line take the arrow's damage (Dex save for half; no attack roll)", saveType: 'Dex', onHitBehavior: 'Resolve a 1ft-wide, 30ft-long line; creatures in the line make a Dexterity save, taking arrow damage or half on success' },
  { id: 'seeking-arrow', name: 'Seeking Arrow', effectSummary: "Choose a creature you've seen in the past minute; the arrow seeks it; compare attack roll vs AC; if hit, applies full damage", saveType: null, onHitBehavior: 'Arrow seeks a creature seen in the past minute; compare attack roll to AC and apply full damage on hit' },
  { id: 'shadow-arrow', name: 'Shadow Arrow', effectSummary: "The target takes 2d6 psychic; Wis save or can't see beyond 5ft until end of your next turn", saveType: 'Wis', onHitBehavior: 'Add 2d6 psychic damage; target makes a Wisdom save or cannot see beyond 5ft until the end of your next turn' },
]
