import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/app/store'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { xpForNextLevel } from '@/domain/rules'

import { CharacterHeader } from '@/features/character-header/CharacterHeader'
import { RestPanel } from '@/features/rest/RestPanel'
import { VitalsPanel } from '@/features/vitals/VitalsPanel'
import { AbilitiesPanel } from '@/features/abilities/AbilitiesPanel'
import { ConditionsPanel } from '@/features/conditions/ConditionsPanel'
import { FeaturesPanel } from '@/features/features-panel/FeaturesPanel'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import { CombatPanel } from '@/features/combat/CombatPanel'
import { SpellsPanel } from '@/features/spells/SpellsPanel'
import { LevelUpModal } from '@/features/level-up/LevelUpModal'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { DiceRollerOverlay } from '@/features/dice-roller/DiceRollerOverlay'

import styles from './CharacterView.module.css'

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, updateCharacter, shortRest, longRest, levelUp, setTempHp } = useAppStore()

  const [restOpen, setRestOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)

  const char = activeCharacterId ? characters[activeCharacterId] : null
  if (!char) return null

  const update = useCallback(
    (patch: Parameters<typeof updateCharacter>[1]) => updateCharacter(char.id, patch),
    [char.id, updateCharacter]
  )

  const classDef = CLASS_BY_ID[char.classId]
  const xpNext = xpForNextLevel(char.level)
  const canLevelUp = xpNext !== null && char.experiencePoints >= xpNext
  const nextLevelIsAsi = classDef?.asiLevels?.includes(char.level + 1) ?? false

  function handleLevelUp() {
    if (nextLevelIsAsi) setLevelUpOpen(true)
    else levelUp(char.id)
  }

  function handleAsiConfirm(choice: AsiChoice, newSpellIds?: string[]) {
    levelUp(char.id, choice, newSpellIds)
    setLevelUpOpen(false)
  }

  // 'R' key toggles dice roller
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') setDiceOpen(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // suppress unused canLevelUp warning — used by CharacterHeader via onLevelUp
  void canLevelUp

  return (
    <div className={styles.view}>
      <CharacterHeader
        character={char}
        update={update}
        onLevelUp={handleLevelUp}
        onRestToggle={() => setRestOpen(v => !v)}
        onBack={exitCharacter}
      />

      {restOpen && (
        <RestPanel
          character={char}
          onShortRest={(hdRolled) => { shortRest(char.id, hdRolled); setRestOpen(false) }}
          onLongRest={() => { longRest(char.id); setRestOpen(false) }}
          onClose={() => setRestOpen(false)}
        />
      )}

      <div className={styles.columns}>
        {/* Left column: vitals + abilities */}
        <aside className={styles.leftCol}>
          <VitalsPanel character={char} update={update} onTempHp={(amt) => setTempHp(char.id, amt)} />
          <ConditionsPanel character={char} update={update} />
          <AbilitiesPanel character={char} update={update} />
        </aside>

        {/* Center column: features + resources + combat */}
        <div className={styles.centerCol}>
          <FeaturesPanel character={char} />
          <ResourcesPanel character={char} update={update} />
          <CombatPanel character={char} update={update} />
        </div>

        {/* Right column: spells */}
        <div className={styles.rightCol}>
          <SpellsPanel character={char} update={update} />
        </div>
      </div>

      {/* Overlays */}
      {levelUpOpen && (
        <LevelUpModal
          character={char}
          newLevel={char.level + 1}
          onConfirm={handleAsiConfirm}
          onCancel={() => setLevelUpOpen(false)}
        />
      )}

      {diceOpen && <DiceRollerOverlay onClose={() => setDiceOpen(false)} />}
    </div>
  )
}
