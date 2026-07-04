/**
 * Machine-local E2E: runs every REAL character save on this machine through
 * the full v14 migration and checks the result — legacy fields gone,
 * featureState populated, and both engines agreeing on derived stats.
 * Reads the live save folder read-only; skipped on machines without saves.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { migrateCharacterV14 } from '@/domain/character/migrations'
import { CURRENT_SCHEMA_VERSION } from '@/domain/character/schema'
import { computeACFull, computeSpeedFull } from '@/shared/data/charCalculations'
import { computeAC } from '@/domain/rules/defense'
import { computeSpeed } from '@/domain/rules/mobility'
import type { Character } from '@/entities/character/types'

const SAVE_DIR = join(process.env.APPDATA ?? '', 'character-sheet', 'characters')

describe.skipIf(!existsSync(SAVE_DIR))('real saves → v14 migration', () => {
  const files = existsSync(SAVE_DIR) ? readdirSync(SAVE_DIR).filter(f => f.endsWith('.json')) : []

  it('found real save files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`migrates ${file}`, () => {
      const raw = JSON.parse(readFileSync(join(SAVE_DIR, file), 'utf-8'))
      const v14 = migrateCharacterV14(raw)
      const asChar = v14 as unknown as Character

      expect(v14.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
      expect(v14.name).toBe(raw.name)
      expect(v14.featureState).toBeTypeOf('object')
      // Legacy one-off fields must be gone from the migrated object.
      for (const legacy of ['isRaging', 'chosenManeuvers', 'warlockInvocations', 'fightingStyle', 'wildShapeForm', 'piercerCritExtraDie']) {
        expect((v14 as unknown as Record<string, unknown>)[legacy], legacy).toBeUndefined()
      }
      // Both engines produce sane derived stats without throwing.
      expect(computeACFull(asChar)).toBeGreaterThanOrEqual(5)
      expect(computeSpeedFull(asChar)).toBeGreaterThanOrEqual(0)
      expect(computeAC({ ...asChar, featureState: v14.featureState })).toBe(computeACFull(asChar))
      expect(computeSpeed({ ...asChar, featureState: v14.featureState })).toBe(computeSpeedFull(asChar))
      // Migrated feature state matches the legacy fields it came from.
      if (raw.chosenManeuvers?.length) {
        expect(v14.featureState['maneuvers']?.known).toEqual(expect.arrayContaining(raw.chosenManeuvers))
      }
      if (raw.warlockInvocations?.length) {
        expect(v14.featureState['invocations']?.known).toEqual(raw.warlockInvocations)
      }
      if (raw.fightingStyle) {
        expect(v14.featureState['fighting-style']?.choice).toBe(raw.fightingStyle)
      }
    })
  }
})
