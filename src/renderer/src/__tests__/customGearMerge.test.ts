import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('@/services/ipc', () => ({
  equipmentIpc: {
    readFile: vi.fn(async () => null),
    writeFile: vi.fn(async () => ({ ok: true as const })),
    fileExists: vi.fn(async () => false),
  },
}))

import { mergeCustomGearIntoCatalog } from '@/shared/data/equipment/equipmentLoader'
import { GEAR, GEAR_BY_ID, setGearData } from '@/shared/data/equipment/gear'
import { computeEquipmentStats } from '@/shared/data/charCalculations'
import type { GearEquipmentItem } from '@/shared/data/equipment/types'
import { makeChar } from './helpers'

const ORIGINAL_GEAR = [...GEAR]
afterEach(() => setGearData(ORIGINAL_GEAR))

const customBoots: GearEquipmentItem = {
  id: 'legacy-custom-boots', name: 'Legacy Custom Boots', kind: 'boots', cost: 0,
  stats: { speedBonus: 10 },
}

describe('legacy custom-item migration into the gear catalog', () => {
  it('custom items are invisible to stats until merged, then apply', async () => {
    const char = makeChar({
      schemaVersion: 13,
      equipment: { ...makeChar().equipment, bootsId: 'legacy-custom-boots' },
    })
    expect(computeEquipmentStats(char).speedBonus).toBe(0)   // the round-4 bug
    await mergeCustomGearIntoCatalog([customBoots])
    expect(GEAR_BY_ID['legacy-custom-boots']).toBeTruthy()
    expect(computeEquipmentStats(char).speedBonus).toBe(10)
  })

  it('merge skips weapon-kind customs and ids already in the catalog', async () => {
    const before = GEAR.length
    await mergeCustomGearIntoCatalog([
      { ...customBoots, id: GEAR[0].id },
      { ...customBoots, id: 'custom-weapon-x', kind: 'weapon' },
    ])
    expect(GEAR_BY_ID['custom-weapon-x']).toBeUndefined()
    expect(GEAR.length).toBe(before)
  })
})
