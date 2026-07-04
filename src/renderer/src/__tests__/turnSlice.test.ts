import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { StateCreator } from 'zustand'
import { createTurnSlice, type TurnSlice } from '@/app/store/turnSlice'
import type { CharacterSlice } from '@/app/store/characterSlice'
import { formatToHitParts as panelFormatToHitParts, formatToHitRider } from '@/features/combat-actions/attackRows'
import { makeChar } from './helpers'

function makeStore() {
  type TestStore = TurnSlice & Pick<CharacterSlice, 'characters' | 'updateCharacter' | 'clearAllSummons'>
  return createStore<TestStore>()(((set, get, api) => ({
    characters: {},
    updateCharacter: vi.fn((id, patch) => {
      set(state => ({
        characters: { ...state.characters, [id]: { ...state.characters[id], ...patch } },
      }))
    }),
    clearAllSummons: vi.fn(),
    ...createTurnSlice(
      set as Parameters<StateCreator<CharacterSlice & TurnSlice, [], [], TurnSlice>>[0],
      get as Parameters<StateCreator<CharacterSlice & TurnSlice, [], [], TurnSlice>>[1],
      api as Parameters<StateCreator<CharacterSlice & TurnSlice, [], [], TurnSlice>>[2],
    ),
  })) as StateCreator<TestStore, [], [], TestStore>)
}

// Pure helper matching the ActionDetailPanel implementation
function formatToHitParts(toHit: number | null, diceParts: string[]): string {
  const flat =
    toHit !== null && toHit !== 0
      ? toHit > 0 ? `+ ${toHit}` : `- ${Math.abs(toHit)}`
      : null
  const parts = ['1d20', ...diceParts.map(d => `+ ${d}`), flat].filter(Boolean)
  return parts.join(' ') || '—'
}

describe('formatToHitParts', () => {
  it('orders dice before flat modifier', () => {
    expect(formatToHitParts(9, ['1d10'])).toBe('1d20 + 1d10 + 9')
  })
  it('works with flat only', () => {
    expect(formatToHitParts(5, [])).toBe('1d20 + 5')
  })
  it('returns just 1d20 for null with no dice', () => {
    expect(formatToHitParts(null, [])).toBe('1d20')
  })
  it('omits flat when toHit is 0', () => {
    expect(formatToHitParts(0, ['1d6'])).toBe('1d20 + 1d6')
  })
  it('handles negative flat', () => {
    expect(formatToHitParts(-2, [])).toBe('1d20 - 2')
  })
  it('keeps exported base and total rows on a d20 roll', () => {
    expect(panelFormatToHitParts(9, [])).toBe('1d20 + 9')
  })
})

describe('formatToHitRider', () => {
  it('formats flat to-hit riders without a d20', () => {
    expect(formatToHitRider(1, [])).toBe('+ 1')
  })
  it('returns an em dash when a rider adds no to-hit value', () => {
    expect(formatToHitRider(null, [])).toBe('\u2014')
  })
  it('formats to-hit dice riders without a d20', () => {
    expect(formatToHitRider(null, ['1d4'])).toBe('+ 1d4')
  })
})

describe('turn effects', () => {
  it('sets turn-effect flags and resets them on confirmNextTurn', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({
      characters: { [char.id]: char },
    })

    store.getState().setMoved(char.id, true)
    store.getState().setAttacked(char.id, true)
    store.getState().setAdvantageNextAttack(char.id, 'adv')
    store.getState().setSpeedZero(char.id, true)
    store.getState().setDisengaged(char.id, true)

    expect(store.getState().turnStates[char.id]).toMatchObject({
      movedThisTurn: true,
      attackedThisTurn: true,
      advantageNextAttack: 'adv',
      speedZeroUntilTurnEnd: true,
      disengaged: true,
    })

    store.getState().confirmNextTurn(char.id, {
      conditionsToDrop: [],
      dropConcentration: false,
    })

    expect(store.getState().turnStates[char.id]).toMatchObject({
      movedThisTurn: false,
      attackedThisTurn: false,
      advantageNextAttack: 'none',
      speedZeroUntilTurnEnd: false,
      disengaged: false,
    })
  })

  it('resets active turnResource buff per-turn usage on confirmNextTurn', () => {
    const store = makeStore()
    const char = makeChar({
      activeBuffSpells: ['aura-of-vitality'],
      buffStates: { 'aura-of-vitality': { trackedTargetLabel: 'Ally', perTurnUsed: true } },
    })
    store.setState({ characters: { [char.id]: char } })

    store.getState().confirmNextTurn(char.id, {
      conditionsToDrop: [],
      dropConcentration: false,
    })

    expect(store.getState().characters[char.id].buffStates?.['aura-of-vitality']?.perTurnUsed).toBe(false)
  })
})

describe('markActionUsed / unmarkActionUsed', () => {
  it('adds and dedupes action names', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({ characters: { [char.id]: char } })
    store.getState().markActionUsed(char.id, 'Dodge')
    store.getState().markActionUsed(char.id, 'Dodge')
    expect(store.getState().turnStates[char.id]?.usedActionNames).toEqual(['Dodge'])
  })

  it('removes action names', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({ characters: { [char.id]: char } })
    store.getState().markActionUsed(char.id, 'Dodge')
    store.getState().markActionUsed(char.id, 'Dash')
    store.getState().unmarkActionUsed(char.id, 'Dodge')
    expect(store.getState().turnStates[char.id]?.usedActionNames).toEqual(['Dash'])
  })

  it('resets usedActionNames on confirmNextTurn', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({ characters: { [char.id]: char } })
    store.getState().markActionUsed(char.id, 'Dodge')
    store.getState().confirmNextTurn(char.id, { conditionsToDrop: [], dropConcentration: false })
    expect(store.getState().turnStates[char.id]?.usedActionNames).toEqual([])
  })
})

describe('useAttack / recoverAttack', () => {
  it('increments and decrements attacksUsed', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({ characters: { [char.id]: char } })
    store.getState().useAttack(char.id)
    store.getState().useAttack(char.id)
    expect(store.getState().turnStates[char.id]?.attacksUsed).toBe(2)
    store.getState().recoverAttack(char.id)
    expect(store.getState().turnStates[char.id]?.attacksUsed).toBe(1)
  })

  it('does not go below 0 on recoverAttack', () => {
    const store = makeStore()
    const char = makeChar()
    store.setState({ characters: { [char.id]: char } })
    store.getState().recoverAttack(char.id)
    expect(store.getState().turnStates[char.id]?.attacksUsed ?? 0).toBe(0)
  })
})
