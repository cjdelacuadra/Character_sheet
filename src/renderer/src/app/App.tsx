import { useEffect } from 'react'
import { useAppStore } from './store'
import { CharacterSelectScreen } from '@/features/character-select/CharacterSelectScreen'
import { CharacterView } from '@/widgets/character-view/CharacterView'

export function App() {
  const activeCharacterId = useAppStore((s) => s.activeCharacterId)
  const loaded            = useAppStore((s) => s.loaded)
  const loadFromDisk      = useAppStore((s) => s.loadFromDisk)

  useEffect(() => { loadFromDisk() }, [loadFromDisk])

  if (!loaded) return null

  return activeCharacterId ? <CharacterView /> : <CharacterSelectScreen />
}
