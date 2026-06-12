import { equipmentIpc } from '@/services/ipc'
import type { SummonTemplate } from '@/entities/summon/types'
import { SUMMON_TEMPLATES, setSummonTemplatesData } from './summonTemplates'
import { logError } from '@/shared/lib/rendererLogger'

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
      const builtinById = Object.fromEntries(
        SUMMON_TEMPLATES.filter(t => t.source !== 'custom').map(t => [t.id, t])
      )
      // Merge: for built-in templates, fill in any fields added to code since
      // the file was last written (e.g. abilityScores) while preserving user edits.
      // Custom templates are kept as-is. Newly added built-ins are appended.
      const diskIds = new Set(parsed.map(t => t.id))
      const updated = parsed.map(t => {
        const builtin = builtinById[t.id]
        if (!builtin) return t
        return {
          ...builtin,   // new code fields first (provides missing fields)
          ...t,         // disk wins for anything the user may have edited
        }
      })
      const merged = [
        ...updated,
        ...SUMMON_TEMPLATES.filter(t => !diskIds.has(t.id)),
      ]
      setSummonTemplatesData(merged)
      if (merged.length > parsed.length) await persist(merged)
    }
  } catch (e) {
    logError('summonLoader', 'Failed to parse summonTemplates.json, using defaults', e)
  }
}
