import { CLASSES } from '@/shared/data/classData'
import { FEATS } from '@/shared/data/featsData'
import { ACTIONS } from '@/shared/data/actionsData'

/**
 * Every resource name the app knows about: class resource pools, pools
 * granted by feats, and pools consumed by actions. Computed on demand so a
 * resource granted in the editor immediately shows up as a consumable
 * option in the Actions view (and vice versa).
 */
export function knownResourceNames(): string[] {
  const names = new Set<string>()
  for (const c of CLASSES) for (const r of c.resources ?? []) names.add(r.name)
  for (const f of FEATS) for (const name of Object.keys(f.grantsResources ?? {})) names.add(name)
  for (const a of ACTIONS) if (a.resourceKey) names.add(a.resourceKey)
  return [...names].sort()
}
