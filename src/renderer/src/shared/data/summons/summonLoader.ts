import { equipmentIpc } from '@/services/ipc'
import type { SummonTemplate } from '@/entities/summon/types'
import { SUMMON_TEMPLATES, setSummonTemplatesData } from './summonTemplates'

const FILE = 'summonTemplates.json'

/** Replaces the item with a matching id, or appends it when the id is new. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some(x => x.id === item.id)
    ? list.map(x => x.id === item.id ? item : x)
    : [...list, item]
}

async function persist(items: SummonTemplate[]): Promise<void> {
  await equipmentIpc.writeFile(FILE, JSON.stringify(items, null, 2))
}

export async function addSummonTemplate(item: SummonTemplate): Promise<void> {
  const updated = upsert(SUMMON_TEMPLATES, item)
  setSummonTemplatesData(updated)
  await persist(updated)
}

export async function updateSummonTemplate(item: SummonTemplate): Promise<void> {
  const updated = upsert(SUMMON_TEMPLATES, item)
  setSummonTemplatesData(updated)
  await persist(updated)
}

export async function deleteSummonTemplate(id: string): Promise<void> {
  const updated = SUMMON_TEMPLATES.filter(t => t.id !== id)
  setSummonTemplatesData(updated)
  await persist(updated)
}

export async function loadSummonTemplatesFromDisk(): Promise<void> {
  const raw = await equipmentIpc.readFile(FILE)
  if (raw === null) {
    // First run — seed the file from built-in defaults.
    await persist(SUMMON_TEMPLATES)
    return
  }
  try {
    const parsed = JSON.parse(raw) as SummonTemplate[]
    if (Array.isArray(parsed)) {
      // Merge: keep disk entries (preserving user edits), append any new built-in
      // templates that were added to code since the file was last written.
      const diskIds = new Set(parsed.map(t => t.id))
      const merged = [
        ...parsed,
        ...SUMMON_TEMPLATES.filter(t => !diskIds.has(t.id)),
      ]
      setSummonTemplatesData(merged)
      if (merged.length > parsed.length) await persist(merged)
    }
  } catch (e) {
    console.error('[summonLoader] Failed to parse summonTemplates.json, using defaults', e)
  }
}
