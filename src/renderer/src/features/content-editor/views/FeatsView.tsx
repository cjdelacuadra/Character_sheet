import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { FeatEditorForm } from '../forms/FeatEditorForm'
import { featsAdapter } from '../adapters'
import { FEATS, FEAT_BY_ID, type FeatDef } from '@/shared/data/featsData'
import styles from '../ContentEditor.module.css'

type Bucket = 'race' | 'class' | 'generic'
const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'race', label: 'Race' },
  { key: 'class', label: 'Class' },
  { key: 'generic', label: 'Generic' },
]

/** A feat is race/class-locked by its prerequisites; anything with neither is generic. */
function featBuckets(feat: FeatDef | undefined): Bucket[] {
  if (!feat) return ['generic']
  const out: Bucket[] = []
  if (feat.prerequisites?.races?.length) out.push('race')
  if (feat.prerequisites?.classes?.length) out.push('class')
  return out.length ? out : ['generic']
}

/** Feats view: alphabetical (via featsAdapter), toggle chips exclude buckets. */
export function FeatsView() {
  const [excluded, setExcluded] = useState<Set<Bucket>>(new Set())
  const [source, setSource] = useState('')

  function toggle(b: Bucket) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      return next
    })
  }

  const sources = ['All', ...new Set(FEATS.map(f => f.source ?? 'PHB'))]
    .sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))

  const adapter: CatalogAdapter<FeatDef> = {
    ...featsAdapter,
    list: () => featsAdapter.list().filter(e => {
      const feat = FEAT_BY_ID[e.id]
      if (!featBuckets(feat).some(b => !excluded.has(b))) return false
      if (source && source !== 'All' && (feat?.source ?? 'PHB') !== source) return false
      return true
    }),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <>
          {BUCKETS.map(b => (
            <button
              key={b.key}
              className={`${styles.filterChip} ${!excluded.has(b.key) ? styles.filterChipActive : ''}`}
              onClick={() => toggle(b.key)}
            >{b.label}</button>
          ))}
          <select className={styles.filterSelect} value={source || 'All'} onChange={e => setSource(e.target.value)}>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </>
      }
      renderForm={(draft, setDraft) => <FeatEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
