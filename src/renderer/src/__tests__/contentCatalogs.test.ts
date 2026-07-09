import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory content dir; each test controls what "disk" holds.
const files = new Map<string, string>()
vi.mock('@/services/ipc', () => ({
  equipmentIpc: {
    readFile: vi.fn(async (name: string) => files.get(name) ?? null),
    writeFile: vi.fn(async (name: string, content: string) => { files.set(name, content); return { ok: true as const } }),
    fileExists: vi.fn(async (name: string) => files.has(name)),
  },
}))

vi.mock('@/shared/lib/rendererLogger', () => ({
  logError: vi.fn(),
}))

import { createCatalogLoader } from '@/shared/data/contentLoader'
import { FEATS } from '@/shared/data/featsData'
import { CONDITIONS } from '@/shared/data/conditionsData'
import { RACES } from '@/shared/data/raceData'
import { ACTIONS } from '@/shared/data/actionsData'
import { SPELLS } from '@/shared/data/spellData'
import { WILD_SHAPE_BEASTS } from '@/shared/data/wildShapeBeasts'

interface Item { id: string; name: string; value?: number }

describe('createCatalogLoader', () => {
  let data: Item[] = []
  const defaults = () => [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }]
  const loader = createCatalogLoader<Item>('test.json', defaults, items => { data = items }, () => data)

  beforeEach(() => { files.clear(); data = [] })

  it('first run seeds the file from defaults', async () => {
    await loader.load()
    expect(data.map(i => i.id)).toEqual(['a', 'b'])
    expect(JSON.parse(files.get('test.json')!)).toHaveLength(2)
  })

  it('disk wins; new built-ins merge back in and persist', async () => {
    files.set('test.json', JSON.stringify([{ id: 'a', name: 'Alpha EDITED' }]))
    await loader.load()
    expect(data.find(i => i.id === 'a')!.name).toBe('Alpha EDITED')   // user edit kept
    expect(data.map(i => i.id)).toEqual(['a', 'b'])                   // missing built-in restored
    expect(JSON.parse(files.get('test.json')!)).toHaveLength(2)       // merged list persisted
  })

  it('corrupt file falls back to defaults without rewriting', async () => {
    files.set('test.json', '{nope')
    await loader.load()
    expect(data.map(i => i.id)).toEqual(['a', 'b'])
    expect(files.get('test.json')).toBe('{nope')   // user file left for inspection
  })

  it('save upserts and persists; remove deletes and persists', async () => {
    await loader.load()
    await loader.save({ id: 'c', name: 'Gamma', value: 3 })
    expect(data).toHaveLength(3)
    await loader.save({ id: 'c', name: 'Gamma v2' })
    expect(data.find(i => i.id === 'c')!.name).toBe('Gamma v2')
    await loader.remove('a')
    expect(JSON.parse(files.get('test.json')!).map((i: Item) => i.id)).toEqual(['b', 'c'])
  })
})

describe('catalog JSON round-trip fidelity', () => {
  // Every externalized catalog must survive serialize -> parse unchanged —
  // functions or class instances in entries would silently vanish.
  it.each([
    ['feats', FEATS],
    ['conditions', CONDITIONS],
    ['races', RACES],
    ['actions', ACTIONS],
    ['spells', SPELLS],
    ['wildShapeBeasts', WILD_SHAPE_BEASTS],
  ] as const)('%s entries are plain serializable data', (_name, catalog) => {
    const back = JSON.parse(JSON.stringify(catalog))
    expect(back).toEqual(catalog)
  })
})
