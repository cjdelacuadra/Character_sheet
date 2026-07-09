import { equipmentIpc } from '@/services/ipc'
import { logError } from '@/shared/lib/rendererLogger'

export interface CatalogLoader<T extends { id: string }> {
  /** Seed the file from defaults on first run; after that disk wins, with
   *  built-ins missing from disk merged back in (new app content still
   *  reaches old installs). Applies the result via setData. */
  load(): Promise<void>
  /** Upsert one entry (by id), apply via setData, rewrite the JSON file. */
  save(entry: T): Promise<void>
  /** Remove one entry by id, apply via setData, rewrite the JSON file. */
  remove(id: string): Promise<void>
}

/**
 * Generic catalog persistence over the content-file channel — the same
 * semantics summonLoader established for summonTemplates.json, reusable by
 * every catalog that becomes an editable data file (feats, conditions,
 * races, actions, spells).
 */
export function createCatalogLoader<T extends { id: string }>(
  filename: string,
  defaults: () => T[],
  setData: (items: T[]) => void,
  getData: () => T[],
): CatalogLoader<T> {
  async function persist(items: T[]): Promise<void> {
    await equipmentIpc.writeFile(filename, JSON.stringify(items, null, 2))
  }

  return {
    async load() {
      const raw = await equipmentIpc.readFile(filename)
      if (raw === null) {
        const seed = defaults()
        setData(seed)
        await persist(seed)
        return
      }
      try {
        const disk = JSON.parse(raw) as T[]
        const diskIds = new Set(disk.map(e => e.id))
        const missing = defaults().filter(d => !diskIds.has(d.id))
        const merged = [...disk, ...missing]
        setData(merged)
        if (missing.length > 0) await persist(merged)
      } catch (err) {
        logError('contentLoader', `Failed to parse ${filename}, using defaults`, err)
        setData(defaults())
      }
    },

    async save(entry) {
      const items = getData()
      const updated = items.some(e => e.id === entry.id)
        ? items.map(e => (e.id === entry.id ? entry : e))
        : [...items, entry]
      setData(updated)
      await persist(updated)
    },

    async remove(id) {
      const updated = getData().filter(e => e.id !== id)
      setData(updated)
      await persist(updated)
    },
  }
}
