export interface ClassFeature {
  name: string
  level: number
  description: string
}

export interface DnDClass {
  id: string
  name: string
  hitDie: number
  primaryAbility: string
  savingThrows: string[]
  spellcastingAbility?: string
  subclasses: { id: string; name: string }[]
  features: ClassFeature[]
}
