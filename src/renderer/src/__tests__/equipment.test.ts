import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/services/ipc', () => ({
  ipcService: {
    save: vi.fn(),
    load: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  }
}))

import { createStore } from 'zustand/vanilla'
import type { CharacterSlice } from '@/app/store/characterSlice'
import { createCharacterSlice } from '@/app/store/characterSlice'
import { getWeaponAttackActions } from '@/domain/rules'
import { makeChar } from './helpers'

function makeStore() {
  return createStore<CharacterSlice>(createCharacterSlice)
}

// ── SC1: Item Persistence on Unequip ────────────────────────────────────────

describe('SC1 — Item Persistence on Unequip', () => {
  it('unequipping a slot item NOT in ownedItemIds adds it to ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, armorId: 'leather' },
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'armorId')
    const updated = store.getState().characters[char.id]
    expect(updated.equipment.armorId).toBeNull()
    expect(updated.ownedItemIds).toContain('leather')
  })

  it('unequipping starting armor leaves it visible (in ownedItemIds)', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, armorId: 'chainMail' },
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'armorId')
    expect(store.getState().characters[char.id].ownedItemIds).toContain('chainMail')
  })

  it('re-equipping after unequip works correctly', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, armorId: 'leather' },
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'armorId')
    store.getState().equipItemToSlot(char.id, 'armorId', 'leather')
    expect(store.getState().characters[char.id].equipment.armorId).toBe('leather')
  })

  it('unequipWeapon keeps weapon id in ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({
      weapons: [{ id: 'longsword', name: 'Longsword', atkBonus: 0, damage: '1d8', damageType: 'slashing' }],
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipWeapon(char.id, 0)
    const updated = store.getState().characters[char.id]
    expect(updated.weapons).toHaveLength(0)
    expect(updated.ownedItemIds).toContain('longsword')
  })
})

// ── SC2: Weapon Equip from "All Items" view ──────────────────────────────────

describe('SC2 — Weapon Equip from "All Items" view', () => {
  it('equipWeaponFromId slots the weapon into index 0', () => {
    const store = makeStore()
    const char = makeChar({ ownedItemIds: ['shortsword'] })
    store.getState().addCharacter(char)
    store.getState().equipWeaponFromId(char.id, 'shortsword', 0)
    const updated = store.getState().characters[char.id]
    expect(updated.weapons[0].id).toBe('shortsword')
    expect(updated.weapons[0].name).toBe('Shortsword')
  })

  it('equipWeaponFromId into slot 1 fills off-hand', () => {
    const store = makeStore()
    const char = makeChar({
      weapons: [{ id: 'shortsword', name: 'Shortsword', atkBonus: 0, damage: '1d6', damageType: 'piercing' }],
      ownedItemIds: ['shortsword', 'dagger'],
    })
    store.getState().addCharacter(char)
    store.getState().equipWeaponFromId(char.id, 'dagger', 1)
    const updated = store.getState().characters[char.id]
    expect(updated.weapons[1].id).toBe('dagger')
  })

  it('two-handed weapon in slot 0 removes any off-hand', () => {
    const store = makeStore()
    const char = makeChar({
      weapons: [
        { id: 'shortsword', name: 'Shortsword', atkBonus: 0, damage: '1d6', damageType: 'piercing' },
        { id: 'dagger', name: 'Dagger', atkBonus: 0, damage: '1d4', damageType: 'piercing' },
      ],
      ownedItemIds: ['shortsword', 'dagger', 'greatsword'],
    })
    store.getState().addCharacter(char)
    store.getState().equipWeaponFromId(char.id, 'greatsword', 0)
    expect(store.getState().characters[char.id].weapons).toHaveLength(1)
    expect(store.getState().characters[char.id].weapons[0].id).toBe('greatsword')
  })

  it('equipWeaponFromId for a weapon not in ownedItemIds still equips (no guard)', () => {
    const store = makeStore()
    const char = makeChar({ ownedItemIds: [] })
    store.getState().addCharacter(char)
    store.getState().equipWeaponFromId(char.id, 'mace', 0)
    expect(store.getState().characters[char.id].weapons[0].id).toBe('mace')
  })
})

// ── SC3: Shop Transactions ───────────────────────────────────────────────────

describe('SC3 — Shop Transactions', () => {
  it('buyItem deducts gold and adds item to ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({ gold: 50 })
    store.getState().addCharacter(char)
    store.getState().buyItem(char.id, 'leather', 10)
    const updated = store.getState().characters[char.id]
    expect(updated.gold).toBe(40)
    expect(updated.ownedItemIds).toContain('leather')
  })

  it('cannot buy when gold is insufficient — state unchanged', () => {
    const store = makeStore()
    const char = makeChar({ gold: 5 })
    store.getState().addCharacter(char)
    store.getState().buyItem(char.id, 'leather', 10)
    const updated = store.getState().characters[char.id]
    expect(updated.gold).toBe(5)
    expect(updated.ownedItemIds).not.toContain('leather')
  })

  it('sellItem adds gold and removes from ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({ gold: 0, ownedItemIds: ['leather'] })
    store.getState().addCharacter(char)
    store.getState().sellItem(char.id, 'leather', 5)
    const updated = store.getState().characters[char.id]
    expect(updated.gold).toBe(5)
    expect(updated.ownedItemIds).not.toContain('leather')
  })

  it('sellItem also unequips the item from its equipment slot', () => {
    const store = makeStore()
    const char = makeChar({
      gold: 0,
      ownedItemIds: ['leather'],
      equipment: { ...makeChar().equipment, armorId: 'leather' },
    })
    store.getState().addCharacter(char)
    store.getState().sellItem(char.id, 'leather', 5)
    expect(store.getState().characters[char.id].equipment.armorId).toBeNull()
  })
})

// ── SC4: Unequip via Drag (store-level) ──────────────────────────────────────

describe('SC4 — Unequip via Drag (store-level)', () => {
  it('unequipSlot sets the equipment slot to null', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, helmetId: 'someHelmet' },
      ownedItemIds: ['someHelmet'],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'helmetId')
    expect(store.getState().characters[char.id].equipment.helmetId).toBeNull()
  })

  it('unequipSlot adds item to ownedItemIds when missing', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, helmetId: 'someHelmet' },
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'helmetId')
    expect(store.getState().characters[char.id].ownedItemIds).toContain('someHelmet')
  })

  it('unequipSlot does NOT duplicate an item already in ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({
      equipment: { ...makeChar().equipment, armorId: 'leather' },
      ownedItemIds: ['leather'],
    })
    store.getState().addCharacter(char)
    store.getState().unequipSlot(char.id, 'armorId')
    const owned = store.getState().characters[char.id].ownedItemIds
    expect(owned.filter(id => id === 'leather')).toHaveLength(1)
  })

  it('unequipWeapon removes weapon from weapons array and preserves ownedItemIds', () => {
    const store = makeStore()
    const char = makeChar({
      weapons: [
        { id: 'shortsword', name: 'Shortsword', atkBonus: 0, damage: '1d6', damageType: 'piercing' },
        { id: 'dagger', name: 'Dagger', atkBonus: 0, damage: '1d4', damageType: 'piercing' },
      ],
      ownedItemIds: [],
    })
    store.getState().addCharacter(char)
    store.getState().unequipWeapon(char.id, 1)
    const updated = store.getState().characters[char.id]
    expect(updated.weapons).toHaveLength(1)
    expect(updated.weapons[0].id).toBe('shortsword')
    expect(updated.ownedItemIds).toContain('dagger')
  })
})

// ── SC5: Weapon-Derived Action List ─────────────────────────────────────────

describe('SC5 — Weapon-Derived Action List', () => {
  it('no weapons equipped → "Unarmed Strike" appears as an Action', () => {
    const char = makeChar({ weapons: [] })
    const actions = getWeaponAttackActions(char)
    const unarmed = actions.find(a => a.name === 'Unarmed Strike')
    expect(unarmed).toBeDefined()
    expect(unarmed?.type).toBe('Action')
  })

  it('one melee weapon → weapon name appears as an Action', () => {
    const char = makeChar({
      weapons: [{ id: 'longsword', name: 'Longsword', atkBonus: 3, damage: '1d8', damageType: 'slashing' }],
    })
    const actions = getWeaponAttackActions(char)
    const mainAtk = actions.find(a => a.name === 'Longsword')
    expect(mainAtk).toBeDefined()
    expect(mainAtk?.type).toBe('Action')
    expect(actions.find(a => a.name === 'Unarmed Strike')).toBeUndefined()
  })

  it('two light weapons → off-hand weapon appears as a Bonus Action', () => {
    const char = makeChar({
      weapons: [
        { id: 'shortsword', name: 'Shortsword', atkBonus: 0, damage: '1d6', damageType: 'piercing', properties: ['Finesse', 'Light'] },
        { id: 'dagger', name: 'Dagger', atkBonus: 0, damage: '1d4', damageType: 'piercing', properties: ['Finesse', 'Light', 'Thrown (range 20/60)'] },
      ],
    })
    const actions = getWeaponAttackActions(char)
    const offHand = actions.find(a => a.type === 'Bonus Action')
    expect(offHand).toBeDefined()
    expect(offHand?.name).toContain('Dagger')
  })

  it('off-hand without Light property → no Bonus Action', () => {
    const char = makeChar({
      weapons: [
        { id: 'longsword', name: 'Longsword', atkBonus: 0, damage: '1d8', damageType: 'slashing', properties: ['Versatile (1d10)'] },
        { id: 'rapier', name: 'Rapier', atkBonus: 0, damage: '1d8', damageType: 'piercing', properties: ['Finesse'] },
      ],
    })
    const actions = getWeaponAttackActions(char)
    expect(actions.find(a => a.type === 'Bonus Action')).toBeUndefined()
  })
})
