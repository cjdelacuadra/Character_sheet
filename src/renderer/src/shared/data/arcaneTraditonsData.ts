export interface ArcaneTraditionDef {
  id: string
  name: string
  description: string
}

export const ARCANE_TRADITIONS: ArcaneTraditionDef[] = [
  { id: 'abjuration',    name: 'School of Abjuration',    description: 'Specialize in protective magic, creating barriers and countering hostile spells.' },
  { id: 'conjuration',   name: 'School of Conjuration',   description: 'Master summoning creatures and transporting objects and people.' },
  { id: 'divination',    name: 'School of Divination',    description: 'Uncover secrets hidden in the past, present, and future.' },
  { id: 'enchantment',   name: 'School of Enchantment',   description: 'Enthrall and control the minds of others.' },
  { id: 'evocation',     name: 'School of Evocation',     description: 'Focus on violent magical energy to deal damage and destroy.' },
  { id: 'illusion',      name: 'School of Illusion',      description: 'Weave elaborate illusions that deceive the senses.' },
  { id: 'necromancy',    name: 'School of Necromancy',    description: 'Manipulate the energies of life and death.' },
  { id: 'transmutation', name: 'School of Transmutation', description: 'Change the properties of objects and creatures.' },
]

export const ARCANE_TRADITION_BY_ID: Record<string, ArcaneTraditionDef> =
  Object.fromEntries(ARCANE_TRADITIONS.map(t => [t.id, t]))
