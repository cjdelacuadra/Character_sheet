import { describe, it, expect } from 'vitest'
import { migrateCharacter } from '@/domain/migrations'

describe('migrateCharacter — ownedItemIds is always an array', () => {
  it('backfills ownedItemIds for a current-version character that is missing it', () => {
    // A character already at the current schema version but without ownedItemIds
    // (the version-gated v7→v8 backfill is skipped for v8+), which crashed InventoryGrid.
    const raw = { schemaVersion: 10, classId: 'fighter', level: 1 }
    const migrated = migrateCharacter(raw)
    expect(Array.isArray(migrated.ownedItemIds)).toBe(true)
  })

  it('preserves an existing ownedItemIds array', () => {
    const migrated = migrateCharacter({ schemaVersion: 10, ownedItemIds: ['leather'] })
    expect(migrated.ownedItemIds).toEqual(['leather'])
  })
})
