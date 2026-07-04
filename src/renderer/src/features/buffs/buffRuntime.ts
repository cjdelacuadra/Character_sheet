import type { Character } from '@/entities/character/types'

export function consumeOneShotBuff(char: Pick<Character, 'activeBuffSpells' | 'buffStates'>, spellId: string): Pick<Character, 'activeBuffSpells' | 'buffStates'> {
  const nextStates = { ...(char.buffStates ?? {}), [spellId]: { ...(char.buffStates?.[spellId] ?? {}), oneShotUsed: true } }
  delete nextStates[spellId]
  return {
    activeBuffSpells: (char.activeBuffSpells ?? []).filter(id => id !== spellId),
    buffStates: nextStates,
  }
}
