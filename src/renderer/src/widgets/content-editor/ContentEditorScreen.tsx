import { useState } from 'react'
import { useAppStore } from '@/app/store'
import { FeatsView } from '@/features/content-editor/views/FeatsView'
import { EquipmentView } from '@/features/content-editor/views/EquipmentView'
import { SpellsView } from '@/features/content-editor/views/SpellsView'
import { SummonsView } from '@/features/content-editor/views/SummonsView'
import { WildShapeView } from '@/features/content-editor/views/WildShapeView'
import { ConditionsView } from '@/features/content-editor/views/ConditionsView'
import { ActionsView } from '@/features/content-editor/views/ActionsView'
import { RacesView } from '@/features/content-editor/views/RacesView'
import { CatalogShell } from '@/features/content-editor/CatalogShell'
import { buffsAdapter } from '@/features/content-editor/adapters'
import { SpellEditorForm } from '@/features/content-editor/forms/SpellEditorForm'
import styles from '@/features/content-editor/ContentEditor.module.css'

const VIEWS = [
  'Feats', 'Equipment', 'Spells', 'Summons', 'Wild Shape', 'Conditions', 'Buffs', 'Actions', 'Races',
] as const
type ViewKey = typeof VIEWS[number]

export function ContentEditorScreen() {
  const setContentEditorOpen = useAppStore(s => s.setContentEditorOpen)
  const [view, setView] = useState<ViewKey>('Feats')

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => setContentEditorOpen(false)}>← Characters</button>
        <h1 className={styles.title}>Content Editor</h1>
      </header>
      <div className={styles.body}>
        <nav className={styles.nav}>
          {VIEWS.map(v => (
            <button
              key={v}
              className={`${styles.navBtn} ${v === view ? styles.navBtnActive : ''}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className={styles.view}>
          {view === 'Feats' && <FeatsView />}
          {view === 'Equipment' && <EquipmentView />}
          {view === 'Spells' && <SpellsView />}
          {view === 'Summons' && <SummonsView />}
          {view === 'Wild Shape' && <WildShapeView />}
          {view === 'Conditions' && <ConditionsView />}
          {view === 'Buffs' && (
            <CatalogShell adapter={buffsAdapter}
              renderForm={(draft, setDraft) => <SpellEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
          {view === 'Actions' && <ActionsView />}
          {view === 'Races' && <RacesView />}
        </div>
      </div>
    </div>
  )
}
