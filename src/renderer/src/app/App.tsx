import { useEffect } from 'react'
import { useAppStore } from './store'
import { CharacterSelectScreen } from '@/features/character-select/CharacterSelectScreen'
import { CharacterView } from '@/widgets/character-view/CharacterView'

export function App() {
  const activeCharacterId = useAppStore((s) => s.activeCharacterId)
  const loadFromDisk = useAppStore((s) => s.loadFromDisk)

  useEffect(() => { loadFromDisk() }, [loadFromDisk])

  return activeCharacterId ? <CharacterView /> : <CharacterSelectScreen />
}
