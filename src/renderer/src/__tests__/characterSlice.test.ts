import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/services/ipc', () => ({
  ipcService: {
    save: vi.fn(),
    load: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  }
}))

import { createStore } from 'zustand/vanilla'
import type { StateCreator } from 'zustand'
import type { CharacterSlice } from '@/app/store/characterSlice'
import { createCharacterSlice } from '@/app/store/characterSlice'
import { computeACFull, computeInitiativeFull } from '@/shared/data/charCalculations'
import { FEATS, setFeatsData } from '@/shared/data/featsData'
import { makeChar } from './helpers'

function makeStore() {
  return createStore<CharacterSlice>(createCharacterSlice as unknown as StateCreator<CharacterSlice, [], [], CharacterSlice>)
}

const ORIGINAL_FEATS = [...FEATS]

afterEach(() => {
  setFeatsData(ORIGINAL_FEATS)
})

describe('updateCharacter', () => {
  it('merges patch into character', () => {
    const store = makeStore()
    const char = makeChar({ name: 'Bob' })
    store.getState().addCharacter(char)
    store.getState().updateCharacter(char.id, { name: 'Alice' })
    expect(store.getState().characters[char.id].name).toBe('Alice')
  })
  it('bumps updatedAt', () => {
    const store = makeStore()
    const char = makeChar()
    store.getState().addCharacter(char)
    const before = store.getState().characters[char.id].updatedAt
    store.getState().updateCharacter(char.id, { notes: 'hi' })
    const after = store.getState().characters[char.id].updatedAt
    expect(after).not.toBe(before)
  })

  it('seeds and deletes buffStates entries with active buff changes', () => {
    const store = makeStore()
    const char = makeChar()
    store.getState().addCharacter(char)

    store.getState().updateCharacter(char.id, { activeBuffSpells: ['aura-of-vitality'] })
    expect(store.getState().characters[char.id].buffStates?.['aura-of-vitality']).toEqual({ trackedTargetLabel: '' })

    store.getState().updateCharacter(char.id, { activeBuffSpells: [] })
    expect(store.getState().characters[char.id].buffStates?.['aura-of-vitality']).toBeUndefined()
  })
})

describe('dropConcentration', () => {
  it('removes concentration state, only the concentrating buff, and recomputes AC', () => {
    const store = makeStore()
    const char = makeChar({
      abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      concentrationSpellId: 'shield-of-faith',
      conditionIds: [{ conditionId: 'concentration' }, { conditionId: 'prone' }],
      activeBuffSpells: ['shield-of-faith', 'mage-armor'],
    })
    store.getState().addCharacter({ ...char, armorClass: computeACFull(char) })

    store.getState().dropConcentration(char.id)

    const updated = store.getState().characters[char.id]
    expect(updated.concentrationSpellId).toBeNull()
    expect(updated.conditionIds).toEqual([{ conditionId: 'prone' }])
    expect(updated.activeBuffSpells).toEqual(['mage-armor'])
    expect(updated.armorClass).toBe(computeACFull(updated))
  })
})

describe('shortRest', () => {
  it('heals roll + CON modifier, capped at max HP', () => {
    const store = makeStore()
    const char = makeChar({
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // CON mod = 0
      hitPoints: { current: 5, max: 20, temp: 0 },
      hitDiceUsed: 0,
    })
    store.getState().addCharacter(char)
    store.getState().shortRest(char.id, 8) // roll 8, CON mod 0
    expect(store.getState().characters[char.id].hitPoints.current).toBe(13)
  })
  it('heals with positive CON modifier', () => {
    const store = makeStore()
    const char = makeChar({
      abilityScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }, // CON mod = +2
      hitPoints: { current: 10, max: 30, temp: 0 },
      hitDiceUsed: 0,
    })
    store.getState().addCharacter(char)
    store.getState().shortRest(char.id, 6) // roll 6, CON mod +2
    expect(store.getState().characters[char.id].hitPoints.current).toBe(18)
  })
  it('does not heal above max HP', () => {
    const store = makeStore()
    const char = makeChar({ hitPoints: { current: 18, max: 20, temp: 0 }, hitDiceUsed: 0 })
    store.getState().addCharacter(char)
    store.getState().shortRest(char.id, 10)
    expect(store.getState().characters[char.id].hitPoints.current).toBe(20)
  })
  it('increments hitDiceUsed by 1', () => {
    const store = makeStore()
    const char = makeChar({ hitPoints: { current: 5, max: 20, temp: 0 }, hitDiceUsed: 0 })
    store.getState().addCharacter(char)
    store.getState().shortRest(char.id, 5)
    expect(store.getState().characters[char.id].hitDiceUsed).toBe(1)
  })
  it('does nothing when no hit dice remain', () => {
    const store = makeStore()
    const char = makeChar({ level: 1, hitPoints: { current: 5, max: 20, temp: 0 }, hitDiceUsed: 1 })
    store.getState().addCharacter(char)
    store.getState().shortRest(char.id, 8)
    expect(store.getState().characters[char.id].hitPoints.current).toBe(5)
  })
})

describe('longRest', () => {
  it('restores HP to max', () => {
    const store = makeStore()
    const char = makeChar({ hitPoints: { current: 3, max: 20, temp: 5 } })
    store.getState().addCharacter(char)
    store.getState().longRest(char.id)
    const hp = store.getState().characters[char.id].hitPoints
    expect(hp.current).toBe(20)
    expect(hp.temp).toBe(0)
  })
  it('resets all spell slots to 0 used', () => {
    const store = makeStore()
    const char = makeChar({
      classId: 'Wizard',
      spellSlots: { 1: { used: 2, total: 4 }, 2: { used: 1, total: 2 } },
    })
    store.getState().addCharacter(char)
    store.getState().longRest(char.id)
    const slots = store.getState().characters[char.id].spellSlots
    expect(slots[1]?.used).toBe(0)
    expect(slots[2]?.used).toBe(0)
  })
  it('clears non-exhaustion conditions', () => {
    const store = makeStore()
    const char = makeChar({
      conditionIds: [{ conditionId: 'poisoned' }, { conditionId: 'exhaustion' }],
    })
    store.getState().addCharacter(char)
    store.getState().longRest(char.id)
    const conditions = store.getState().characters[char.id].conditionIds
    expect(conditions.map(c => c.conditionId)).toEqual(['exhaustion'])
  })
  it('recovers half the character level in hit dice (min 1)', () => {
    const store = makeStore()
    const char = makeChar({ level: 4, hitDiceUsed: 4 })
    store.getState().addCharacter(char)
    store.getState().longRest(char.id)
    // recovers floor(4/2) = 2 hit dice
    expect(store.getState().characters[char.id].hitDiceUsed).toBe(2)
  })
})

describe('levelUp', () => {
  it('increments level by 1', () => {
    const store = makeStore()
    const char = makeChar({ level: 3 })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id)
    expect(store.getState().characters[char.id].level).toBe(4)
  })
  it('applies +2 ASI double choice', () => {
    const store = makeStore()
    const char = makeChar({ level: 3, abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id, { type: 'double', ability: 'str' })
    expect(store.getState().characters[char.id].abilityScores.str).toBe(12)
  })
  it('applies +1/+1 split ASI choice', () => {
    const store = makeStore()
    const char = makeChar({ level: 3, abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id, { type: 'split', ability1: 'str', ability2: 'dex' })
    const { str, dex } = store.getState().characters[char.id].abilityScores
    expect(str).toBe(11)
    expect(dex).toBe(11)
  })
  it('records new level in completedAsiLevels when ASI choice made', () => {
    const store = makeStore()
    const char = makeChar({ level: 3, completedAsiLevels: [] })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id, { type: 'double', ability: 'str' })
    expect(store.getState().characters[char.id].completedAsiLevels).toContain(4)
  })
  it('does NOT add to completedAsiLevels when no ASI choice passed', () => {
    const store = makeStore()
    const char = makeChar({ level: 4, completedAsiLevels: [] })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id) // no ASI
    expect(store.getState().characters[char.id].completedAsiLevels).toEqual([])
  })
  it('caps ability score at 20', () => {
    const store = makeStore()
    const char = makeChar({ level: 3, abilityScores: { str: 19, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)
    store.getState().levelUp(char.id, { type: 'double', ability: 'str' })
    expect(store.getState().characters[char.id].abilityScores.str).toBe(20)
  })
})

describe('applyPendingAsi', () => {
  it('applies ASI choice without changing level', () => {
    const store = makeStore()
    const char = makeChar({ level: 5, abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)
    store.getState().applyPendingAsi(char.id, 4, { type: 'double', ability: 'str' })
    const updated = store.getState().characters[char.id]
    expect(updated.level).toBe(5)
    expect(updated.abilityScores.str).toBe(12)
  })
  it('records the asi level in completedAsiLevels', () => {
    const store = makeStore()
    const char = makeChar({ level: 5, completedAsiLevels: [] })
    store.getState().addCharacter(char)
    store.getState().applyPendingAsi(char.id, 4, { type: 'double', ability: 'str' })
    expect(store.getState().characters[char.id].completedAsiLevels).toEqual([4])
  })
  it('appends to existing completedAsiLevels', () => {
    const store = makeStore()
    const char = makeChar({ level: 9, completedAsiLevels: [4] })
    store.getState().addCharacter(char)
    store.getState().applyPendingAsi(char.id, 8, { type: 'double', ability: 'dex' })
    expect(store.getState().characters[char.id].completedAsiLevels).toEqual([4, 8])
  })
  it('applies feat choice', () => {
    const store = makeStore()
    const char = makeChar({ level: 5, feats: [] })
    store.getState().addCharacter(char)
    store.getState().applyPendingAsi(char.id, 4, { type: 'feat', featId: 'alert' })
    expect(store.getState().characters[char.id].feats).toContain('alert')
  })
})

describe('addFeat/removeFeat', () => {
  it('applies and removes feat-granted skill and save proficiencies', () => {
    setFeatsData([...ORIGINAL_FEATS, {
      id: 'test-proficient',
      name: 'Test Proficient',
      description: 'test',
      grantsProficiencies: { skills: ['stealth'], savingThrows: ['wis'] },
    }])
    const store = makeStore()
    const char = makeChar({ classId: 'Fighter', skillProficiencies: {}, savingThrowProficiencies: ['str', 'con'] })
    store.getState().addCharacter(char)

    store.getState().addFeat(char.id, 'test-proficient')
    let updated = store.getState().characters[char.id]
    expect(updated.skillProficiencies.stealth).toBe('proficient')
    expect(updated.savingThrowProficiencies).toContain('wis')

    store.getState().removeFeat(char.id, 'test-proficient')
    updated = store.getState().characters[char.id]
    expect(updated.skillProficiencies.stealth).toBeUndefined()
    expect(updated.savingThrowProficiencies).not.toContain('wis')
  })

  it('keeps a class saving throw proficiency when removing a feat that also grants it', () => {
    setFeatsData([...ORIGINAL_FEATS, {
      id: 'test-save-overlap',
      name: 'Test Save Overlap',
      description: 'test',
      grantsProficiencies: { savingThrows: ['con'] },
    }])
    const store = makeStore()
    const char = makeChar({ classId: 'Fighter', savingThrowProficiencies: ['str', 'con'] })
    store.getState().addCharacter(char)

    store.getState().addFeat(char.id, 'test-save-overlap')
    store.getState().removeFeat(char.id, 'test-save-overlap')

    expect(store.getState().characters[char.id].savingThrowProficiencies).toContain('con')
  })

  it('adds a fixed ability feat and dedupes repeat adds', () => {
    const store = makeStore()
    const char = makeChar({ abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)

    store.getState().addFeat(char.id, 'actor')
    store.getState().addFeat(char.id, 'actor')

    const updated = store.getState().characters[char.id]
    expect(updated.feats.filter(f => f === 'actor')).toHaveLength(1)
    expect(updated.abilityScores.cha).toBe(11)
    expect(updated.armorClass).toBe(computeACFull(updated))
    expect(updated.initiative).toBe(computeInitiativeFull(updated))
  })

  it('records and reverses an ability-choice feat', () => {
    const store = makeStore()
    const char = makeChar({ abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })
    store.getState().addCharacter(char)

    store.getState().addFeat(char.id, 'piercer', { abilityChoice: 'dex' })
    const withFeat = store.getState().characters[char.id]
    expect(withFeat.abilityScores.dex).toBe(11)
    expect(withFeat.featChoices?.piercer).toBe('dex')
    expect(withFeat.piercerCritExtraDie).toBe(true)

    store.getState().removeFeat(char.id, 'piercer')
    const removed = store.getState().characters[char.id]
    expect(removed.abilityScores.dex).toBe(10)
    expect(removed.featChoices?.piercer).toBeUndefined()
    expect(removed.piercerCritExtraDie).toBe(false)
  })

  it('merges feat-granted spell ids without duplication', () => {
    const store = makeStore()
    const char = makeChar({ spellIds: ['invisibility'] })
    store.getState().addCharacter(char)

    store.getState().addFeat(char.id, 'shadow-touched', { abilityChoice: 'cha', spellIds: ['invisibility'] })

    expect(store.getState().characters[char.id].spellIds.filter(id => id === 'invisibility')).toHaveLength(1)
  })
})
