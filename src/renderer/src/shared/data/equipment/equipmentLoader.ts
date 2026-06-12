import { equipmentIpc } from '@/services/ipc'
import { weaponsToCsv, csvToWeapons, gearToCsv, csvToGear } from './csvCodec'
import { WEAPONS, setWeaponsData } from './weapons'
import { GEAR, setGearData } from './gear'
import { rebuildCatalogue } from './catalogue'
import { logError } from '@/shared/lib/rendererLogger'
import type { WeaponEquipmentItem, GearEquipmentItem } from './types'

/** Replaces the item with a matching id, or appends it when the id is new. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some(x => x.id === item.id)
    ? list.map(x => x.id === item.id ? item : x)
    : [...list, item]
}

export async function saveWeaponDef(item: WeaponEquipmentItem): Promise<void> {
  const updated = upsert(WEAPONS, item)
  setWeaponsData(updated)
  rebuildCatalogue()
  await equipmentIpc.writeFile('weapons.csv', weaponsToCsv(updated))
}

export async function saveGearDef(item: GearEquipmentItem): Promise<void> {
  const updated = upsert(GEAR, item)
  setGearData(updated)
  rebuildCatalogue()
  await equipmentIpc.writeFile('gear.csv', gearToCsv(updated))
}

export async function deleteWeaponDef(id: string): Promise<void> {
  const updated = WEAPONS.filter(w => w.id !== id)
  setWeaponsData(updated)
  rebuildCatalogue()
  await equipmentIpc.writeFile('weapons.csv', weaponsToCsv(updated))
}

export async function deleteGearDef(id: string): Promise<void> {
  const updated = GEAR.filter(g => g.id !== id)
  setGearData(updated)
  rebuildCatalogue()
  await equipmentIpc.writeFile('gear.csv', gearToCsv(updated))
}

export async function loadEquipmentFromCsv(): Promise<void> {
  // ── Weapons ───────────────────────────────────────────────────────────────
  const weaponsCsv = await equipmentIpc.readFile('weapons.csv')
  if (weaponsCsv === null) {
    await equipmentIpc.writeFile('weapons.csv', weaponsToCsv(WEAPONS))
  } else {
    try {
      setWeaponsData(csvToWeapons(weaponsCsv))
    } catch (e) {
      logError('equipmentLoader', 'Failed to parse weapons.csv, using defaults', e)
    }
  }

  // ── Gear (armor, shields, accessories) ────────────────────────────────────
  const gearCsv = await equipmentIpc.readFile('gear.csv')
  if (gearCsv === null) {
    await equipmentIpc.writeFile('gear.csv', gearToCsv(GEAR))
  } else {
    try {
      setGearData(csvToGear(gearCsv))
    } catch (e) {
      logError('equipmentLoader', 'Failed to parse gear.csv, using defaults', e)
    }
  }

  rebuildCatalogue()
}
