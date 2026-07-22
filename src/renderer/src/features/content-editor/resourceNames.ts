import { CLASSES } from '@/shared/data/classData'
import { FEATS } from '@/shared/data/featsData'
import { ACTIONS, type ActionDef } from '@/shared/data/actionsData'
import { resourceDefaultPoolNames } from '@/shared/data/resourceDefaults'

export type SpendActionMode = 'Action' | 'Bonus Action' | 'Reaction' | 'Inside attack' | 'Inside spell / other'

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

export function grantedResourceNames(): string[] {
  const names = new Set<string>()
  for (const c of CLASSES) for (const r of c.resources ?? []) names.add(r.name)
  for (const name of resourceDefaultPoolNames()) names.add(name)
  for (const f of FEATS) for (const name of Object.keys(f.grantsResources ?? {})) names.add(name)
  return [...names].sort()
}

export function buildSpendAction(name: string, mode: SpendActionMode): ActionDef {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const base = {
    id: `spend-${slug}`,
    name: `Use ${name}`,
    generic: true,
    resourceKey: name,
    resourceCost: 1,
  }

  if (mode === 'Inside attack') {
    return {
      ...base,
      type: 'Free',
      requiresAttackThisTurn: true,
      short: `On an attack: spend 1 ${name}.`,
      full: `Spend one point from your ${name} pool as part of an attack. Edit this action in the Actions view to describe what it does.`,
    }
  }

  if (mode === 'Inside spell / other') {
    return {
      ...base,
      type: 'Free',
      short: `Spend 1 ${name} as part of another effect.`,
      full: `Spend one point from your ${name} pool as part of another effect. Edit this action in the Actions view to describe what it does.`,
    }
  }

  return {
    ...base,
    type: mode,
    short: `Spend 1 ${name}.`,
    full: `Spend one point from your ${name} pool. Edit this action in the Actions view to describe what it does.`,
  }
}
