export type ConditionCategory = 'debuff' | 'buff' | 'neutral'

export interface ConditionEffect {
  affects: 'ac' | 'attack' | 'saving-throw' | 'speed' | 'ability-check' | 'other'
  description: string
}

export interface Condition {
  id: string
  name: string
  category: ConditionCategory
  effects: ConditionEffect[]
  description: string
}
