import type { AbilityScore } from '@/entities/character/types'

export type ConditionCategory = 'debuff' | 'buff' | 'neutral'

export interface ConditionEffect {
  affects: 'ac' | 'attack' | 'saving-throw' | 'speed' | 'ability-check' | 'other'
  description: string
  mechanic?:
    | { kind: 'speedMultiplier'; value: number }
    | { kind: 'acDelta'; value: number }
    | { kind: 'flatSaveDelta'; ability: AbilityScore; value: number }
    | { kind: 'flag' }
}

export interface Condition {
  id: string
  name: string
  category: ConditionCategory
  effects: ConditionEffect[]
  description: string
}
