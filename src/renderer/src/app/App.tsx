import { useEffect } from 'react'
import { useAppStore } from './store'
import { CharacterSelectScreen } from '@/features/character-select/CharacterSelectScreen'
import { CharacterView } from '@/widgets/character-view/CharacterView'
import { ContentEditorScreen } from '@/widgets/content-editor/ContentEditorScreen'

export function App() {
  const activeCharacterId  = useAppStore((s) => s.activeCharacterId)
  const contentEditorOpen  = useAppStore((s) => s.contentEditorOpen)
  const loaded             = useAppStore((s) => s.loaded)
  const loadFromDisk       = useAppStore((s) => s.loadFromDisk)

  useEffect(() => { loadFromDisk() }, [loadFromDisk])

  if (!loaded) return null

  if (activeCharacterId) return <CharacterView />
  if (contentEditorOpen) return <ContentEditorScreen />
  return <CharacterSelectScreen />
}
