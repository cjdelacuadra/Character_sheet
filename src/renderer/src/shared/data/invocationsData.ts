export interface InvocationDef {
  id: string
  name: string
  description: string
  prerequisiteLevel?: number
  prerequisite?: string
}

export const INVOCATIONS: InvocationDef[] = [
  { id: 'agonizingBlast',       name: 'Agonizing Blast',         prerequisiteLevel: 2,  description: 'Add your CHA modifier to the damage of your Eldritch Blast.' },
  { id: 'armorOfShadows',       name: 'Armor of Shadows',        prerequisiteLevel: 2,  description: 'Cast Mage Armor on yourself at will, without expending a spell slot.' },
  { id: 'beastSpeech',          name: 'Beast Speech',            prerequisiteLevel: 2,  description: 'Cast Speak with Animals at will, without expending a spell slot.' },
  { id: 'beguilingInfluence',   name: 'Beguiling Influence',     prerequisiteLevel: 2,  description: 'Gain proficiency in the Deception and Persuasion skills.' },
  { id: 'devilsSight',          name: "Devil's Sight",           prerequisiteLevel: 2,  description: 'See normally in darkness, both magical and nonmagical, to a distance of 120 ft.' },
  { id: 'eldritchMind',         name: 'Eldritch Mind',           prerequisiteLevel: 2,  description: 'Advantage on CON saving throws to maintain concentration on a spell.' },
  { id: 'eldritchSpear',        name: 'Eldritch Spear',          prerequisiteLevel: 2,  description: 'The range of your Eldritch Blast becomes 300 ft.' },
  { id: 'eyesOfTheRuneKeeper',  name: 'Eyes of the Rune Keeper', prerequisiteLevel: 2,  description: 'You can read all writing.' },
  { id: 'fiendishVigor',        name: 'Fiendish Vigor',          prerequisiteLevel: 2,  description: 'Cast False Life on yourself at will as a 1st-level spell, without expending a spell slot.' },
  { id: 'graspOfHadar',         name: 'Grasp of Hadar',          prerequisiteLevel: 2,  description: 'Once per turn when you hit a creature with Eldritch Blast, you can move that creature in a straight line 10 ft closer to you.' },
  { id: 'lanceOfLethargy',      name: 'Lance of Lethargy',       prerequisiteLevel: 2,  description: 'Once per turn when you hit a creature with Eldritch Blast, you can reduce that creature\'s speed by 10 ft until the end of your next turn.' },
  { id: 'maskOfManyFaces',      name: 'Mask of Many Faces',      prerequisiteLevel: 2,  description: 'Cast Disguise Self at will, without expending a spell slot.' },
  { id: 'mistyVisions',         name: 'Misty Visions',           prerequisiteLevel: 2,  description: 'Cast Silent Image at will, without expending a spell slot.' },
  { id: 'repellingBlast',       name: 'Repelling Blast',         prerequisiteLevel: 2,  description: 'When you hit a creature with Eldritch Blast, you can push the creature up to 10 ft away in a straight line.' },
  { id: 'thirstingBlade',       name: 'Thirsting Blade',         prerequisiteLevel: 5,  prerequisite: 'Pact of the Blade', description: 'Attack twice, instead of once, whenever you take the Attack action on your turn with your pact weapon.' },
  { id: 'bookOfAncientSecrets', name: 'Book of Ancient Secrets',  prerequisiteLevel: 5,  prerequisite: 'Pact of the Tome', description: 'Inscribe ritual spells into your Book of Shadows and cast them as rituals.' },
  { id: 'oneWithShadows',       name: 'One with Shadows',        prerequisiteLevel: 5,  description: 'When you are in an area of dim light or darkness, use your action to become invisible until you move or take an action or a reaction.' },
  { id: 'lifedrinker',          name: 'Lifedrinker',             prerequisiteLevel: 12, prerequisite: 'Pact of the Blade', description: 'When you hit a creature with your pact weapon, the creature takes extra necrotic damage equal to your CHA modifier (minimum 1).' },
  { id: 'witchSight',           name: 'Witch Sight',             prerequisiteLevel: 15, description: 'See the true form of any shapechanger or creature concealed by illusion or transmutation magic while the creature is within 30 ft and within line of sight.' },
]

export const INVOCATION_BY_ID: Record<string, InvocationDef> =
  Object.fromEntries(INVOCATIONS.map(i => [i.id, i]))

export function maxInvocations(level: number): number {
  if (level < 2)  return 0
  if (level < 5)  return 2
  if (level < 7)  return 3
  if (level < 9)  return 4
  if (level < 12) return 5
  if (level < 15) return 6
  if (level < 18) return 7
  return 8
}
