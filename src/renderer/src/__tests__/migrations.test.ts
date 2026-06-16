import { describe, it, expect } from 'vitest'
import { migrateCharacter } from '@/domain/migrations'

const BASE_V1 = {
  id: 'test-id',
  name: 'Thorin',
  classId: 'Fighter',
  race: 'Dwarf',
  background: 'Soldier',
  level: 5,
  experiencePoints: 6500,
  abilityScores: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 8 },
  hitPoints: { current: 40, max: 40, temp: 0 },
  armorClass: 16,
  speed: 25,
  initiative: 0,
  proficiencyBonus: 3,
  bonusHpPerLevel: 0,
  equipment: { armorId: 'chain-mail', hasShield: false, shieldId: null },
  weapons: [],
}

describe('migrateCharacter', () => {
  describe('v1 → current', () => {
    it('assigns the current schemaVersion', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.schemaVersion).toBe(11)
    })
    it('fills missing activeSummons with empty array', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.activeSummons).toEqual([])
    })
    it('fills missing notes with empty string', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.notes).toBe('')
    })
    it('fills missing preparedSpellIds with empty array', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.preparedSpellIds).toEqual([])
    })
    it('fills missing savingThrowProficiencies with empty array', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.savingThrowProficiencies).toEqual([])
    })
    it('fills missing resources with empty object', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.resources).toEqual({})
    })
    it('fills missing deathSaves with zeros', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.deathSaves).toEqual({ successes: 0, failures: 0 })
    })
    it('populates completedAsiLevels from class definition', () => {
      // Fighter ASI levels: [4, 6, 8, 12, 14, 16, 19]; level 5 → only [4]
      const result = migrateCharacter(BASE_V1)
      expect(result.completedAsiLevels).toEqual([4])
    })
  })

  describe('hasShield migration', () => {
    it('hasShield: true → shieldId: "shield"', () => {
      const raw = { ...BASE_V1, equipment: { armorId: null, hasShield: true } }
      const result = migrateCharacter(raw)
      expect(result.equipment.shieldId).toBe('shield')
    })
    it('hasShield: false → shieldId: null', () => {
      const raw = { ...BASE_V1, equipment: { armorId: null, hasShield: false } }
      const result = migrateCharacter(raw)
      expect(result.equipment.shieldId).toBeNull()
    })
  })

  describe('v2 → v3', () => {
    it('Fighter at level 8 gets completedAsiLevels [4, 6, 8]', () => {
      const raw = { ...BASE_V1, schemaVersion: 2, level: 8, completedAsiLevels: undefined }
      const result = migrateCharacter(raw)
      expect(result.completedAsiLevels).toEqual([4, 6, 8])
    })
    it('Barbarian at level 4 gets completedAsiLevels [4]', () => {
      const raw = { ...BASE_V1, schemaVersion: 2, classId: 'Barbarian', level: 4, completedAsiLevels: undefined }
      const result = migrateCharacter(raw)
      expect(result.completedAsiLevels).toEqual([4])
    })
  })

  describe('v3 passthrough', () => {
    it('does not overwrite existing completedAsiLevels', () => {
      const raw = { ...BASE_V1, schemaVersion: 3, completedAsiLevels: [4] }
      const result = migrateCharacter(raw)
      expect(result.completedAsiLevels).toEqual([4])
    })
  })

  describe('v3 → current', () => {
    it('v3 character migrates to the current schemaVersion', () => {
      const raw = { ...BASE_V1, schemaVersion: 3, completedAsiLevels: [4] }
      const result = migrateCharacter(raw)
      expect(result.schemaVersion).toBe(11)
    })

    it('v1 character also ends up at the current schemaVersion', () => {
      const result = migrateCharacter(BASE_V1)
      expect(result.schemaVersion).toBe(11)
    })

    it('existing character without fightingStyle gets fightingStyle: undefined', () => {
      const raw = { ...BASE_V1, schemaVersion: 3, completedAsiLevels: [4] }
      const result = migrateCharacter(raw)
      expect(result.fightingStyle).toBeUndefined()
    })

    it('character with fightingStyle set preserves it through migration', () => {
      const raw = { ...BASE_V1, schemaVersion: 3, completedAsiLevels: [4], fightingStyle: 'archery' }
      const result = migrateCharacter(raw as Parameters<typeof migrateCharacter>[0])
      expect(result.fightingStyle).toBe('archery')
    })
  })

  describe('v6 → v7 (equipment slots)', () => {
    it('adds new equipment slots as null', () => {
      const raw = { ...BASE_V1, schemaVersion: 6, completedAsiLevels: [4] }
      const result = migrateCharacter(raw)
      expect(result.equipment.helmetId).toBeNull()
      expect(result.equipment.necklaceId).toBeNull()
      expect(result.equipment.capeId).toBeNull()
      expect(result.equipment.legsId).toBeNull()
      expect(result.equipment.bootsId).toBeNull()
      expect(result.equipment.glovesId).toBeNull()
      expect(result.equipment.ring1Id).toBeNull()
      expect(result.equipment.ring2Id).toBeNull()
      expect(result.equipment.amuletId).toBeNull()
    })
    it('preserves existing equipment slot values through migration', () => {
      const raw = {
        ...BASE_V1, schemaVersion: 6, completedAsiLevels: [4],
        equipment: { ...BASE_V1.equipment, helmetId: 'leather-helm' },
      }
      const result = migrateCharacter(raw as Parameters<typeof migrateCharacter>[0])
      expect(result.equipment.helmetId).toBe('leather-helm')
    })
  })

  describe('v10 → v11 (feat flags)', () => {
    it('backfills feat flags from existing feats', () => {
      const raw = { ...BASE_V1, schemaVersion: 10, feats: ['crusher'] }
      const result = migrateCharacter(raw)

      expect(result.schemaVersion).toBe(11)
      expect(result.crusherCritAdvantage).toBe(true)
      expect(result.featChoices).toEqual({})
    })

    it('defaults feat flags false when feat is absent', () => {
      const raw = { ...BASE_V1, schemaVersion: 10, feats: [] }
      const result = migrateCharacter(raw)

      expect(result.crusherCritAdvantage).toBe(false)
      expect(result.featChoices).toEqual({})
    })
  })
})
