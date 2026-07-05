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

/**
 * The bundled CSVs (public/equipment_data) are the authoritative catalog —
 * the in-code WEAPONS/GEAR defaults carry stale sprite paths and exist only
 * as a last-resort fallback (AUDIT P0).
 */
async function readBundledCsv(name: string): Promise<string | null> {
  try {
    const res = await fetch(`/equipment_data/${name}`)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

export async function loadEquipmentFromCsv(): Promise<void> {
  // ── Weapons ───────────────────────────────────────────────────────────────
  const weaponsCsv = await equipmentIpc.readFile('weapons.csv')
  if (weaponsCsv === null) {
    // First run: seed userData from the bundled CSV, not the TS defaults.
    const bundled = await readBundledCsv('weapons.csv')
    if (bundled !== null) {
      try { setWeaponsData(csvToWeapons(bundled)) } catch (e) {
        logError('equipmentLoader', 'Failed to parse bundled weapons.csv, using defaults', e)
      }
      await equipmentIpc.writeFile('weapons.csv', bundled)
    } else {
      await equipmentIpc.writeFile('weapons.csv', weaponsToCsv(WEAPONS))
    }
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
    const bundled = await readBundledCsv('gear.csv')
    if (bundled !== null) {
      try { setGearData(csvToGear(bundled)) } catch (e) {
        logError('equipmentLoader', 'Failed to parse bundled gear.csv, using defaults', e)
      }
      await equipmentIpc.writeFile('gear.csv', bundled)
    } else {
      await equipmentIpc.writeFile('gear.csv', gearToCsv(GEAR))
    }
  } else {
    try {
      setGearData(csvToGear(gearCsv))
    } catch (e) {
      logError('equipmentLoader', 'Failed to parse gear.csv, using defaults', e)
    }
  }

  rebuildCatalogue()
}
