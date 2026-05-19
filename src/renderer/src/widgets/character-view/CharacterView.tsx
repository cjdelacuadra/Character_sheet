import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/app/store'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASSES_BY_CLASS } from '@/shared/data/subclassData'
import { xpForNextLevel, computeSpellLevelUpConfig } from '@/domain/rules'

import { CharacterHeader } from '@/features/character-header/CharacterHeader'
import { RestPanel } from '@/features/rest/RestPanel'
import { VitalsPanel } from '@/features/vitals/VitalsPanel'
import { AbilitiesPanel } from '@/features/abilities/AbilitiesPanel'
import { ConditionsPanel } from '@/features/conditions/ConditionsPanel'
import { FeaturesPanel } from '@/features/features-panel/FeaturesPanel'
import { ActionListPanel } from '@/features/combat-actions/ActionListPanel'
import { ActionDetailPanel } from '@/features/combat-actions/ActionDetailPanel'
import { EquipmentLayout } from '@/features/character-header/EquipmentLayout'
import { ShopPanel } from '@/features/shop/ShopPanel'
import { LevelUpModal } from '@/features/level-up/LevelUpModal'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { SpellSelectionStep } from '@/features/level-up/SpellSelectionStep'
import { DiceRollerOverlay } from '@/features/dice-roller/DiceRollerOverlay'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'

import styles from './CharacterView.module.css'

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, deleteCharacter, updateCharacter, shortRest, longRest, levelUp, applyPendingAsi, setTempHp } = useAppStore()

  const [restOpen, setRestOpen] = useState(false)
  const [equipOpen, setEquipOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<FeatureEntry | null>(null)
  const [pendingAsiQueue, setPendingAsiQueue] = useState<number[]>([])
  const [targetNewLevel, setTargetNewLevel] = useState<number>(0)
  const [spellOnlyOpen, setSpellOnlyOpen] = useState(false)

  // All hooks must appear before any conditional return
  const update = useCallback(
    (patch: Parameters<typeof updateCharacter>[1]) => {
      if (activeCharacterId) updateCharacter(activeCharacterId, patch)
    },
    [activeCharacterId, updateCharacter]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') setDiceOpen(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const char = activeCharacterId ? characters[activeCharacterId] : null
  if (!char) return null

  const classDef = CLASS_BY_ID[char.classId]
  const xpNext = xpForNextLevel(char.level)
  const canLevelUp = xpNext !== null && char.experiencePoints >= xpNext

  void canLevelUp

  return (
    <div className={styles.view}>
      <CharacterHeader
        character={char}
        update={update}
        onLevelUp={() => {
          const newLevel = char.level + 1
          const subclassUnlockLevel = SUBCLASSES_BY_CLASS[char.classId]?.[0]?.unlocksAtLevel
          const needsSubclass = newLevel === subclassUnlockLevel && !char.subclass
          const completed = char.completedAsiLevels ?? []
          const catchUps = (classDef?.asiLevels ?? []).filter(l => l <= char.level && !completed.includes(l))
          const newLevelIsAsi = classDef?.asiLevels?.includes(newLevel) ?? false
          const queue = newLevelIsAsi ? [...catchUps, newLevel] : [...catchUps]
          setTargetNewLevel(newLevel)
          if (queue.length > 0 || needsSubclass) {
            setPendingAsiQueue(queue)
            setLevelUpOpen(true)
          } else {
            const cfg = classDef ? computeSpellLevelUpConfig(classDef, char.level, newLevel) : null
            if (cfg && (cfg.spellsDelta > 0 || cfg.cantripsDelta > 0)) {
              setSpellOnlyOpen(true)
            } else {
              levelUp(char.id)
            }
          }
        }}
        onRestToggle={() => setRestOpen(v => !v)}
        onBack={exitCharacter}
        onEquipToggle={() => { setEquipOpen(p => !p); setSelectedAction(null); setShopOpen(false) }}
        equipOpen={equipOpen}
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
        <aside className={styles.leftCol}>
          <VitalsPanel character={char} update={update} onTempHp={(amt) => setTempHp(char.id, amt)} onDelete={() => { deleteCharacter(char.id); exitCharacter() }} />
          <ConditionsPanel character={char} update={update} />
          <AbilitiesPanel character={char} update={update} />
          <FeaturesPanel
            character={char}
            selectedFeature={selectedFeature}
            onSelectFeature={(f) => { setSelectedFeature(f); setSelectedAction(null); setEquipOpen(false); setShopOpen(false) }}
          />
        </aside>

        <div className={styles.centerCol}>
          <ActionListPanel
            character={char}
            selectedAction={selectedAction}
            onSelectAction={(name) => { setSelectedAction(name); if (name) { setSelectedFeature(null); setEquipOpen(false); setShopOpen(false) } }}
            update={update}
          />
        </div>

        <div className={styles.rightCol}>
          {levelUpOpen && (
            <LevelUpModal
              panelMode
              character={char}
              newLevel={targetNewLevel}
              showSpellSelection={pendingAsiQueue[0] === targetNewLevel}
              onConfirm={(choice: AsiChoice | null, newSpellIds?: string[], subclassId?: string) => {
                if (subclassId) update({ subclass: subclassId, subclassLocked: true })
                const [head, ...tail] = pendingAsiQueue
                setPendingAsiQueue(tail)
                if (head !== undefined && head < targetNewLevel) {
                  applyPendingAsi(char.id, head, choice!)
                  if (tail.length === 0) {
                    const cfg = classDef ? computeSpellLevelUpConfig(classDef, char.level, targetNewLevel) : null
                    if (cfg && (cfg.spellsDelta > 0 || cfg.cantripsDelta > 0)) {
                      setLevelUpOpen(false)
                      setSpellOnlyOpen(true)
                    } else {
                      levelUp(char.id)
                      setLevelUpOpen(false)
                    }
                  }
                } else {
                  levelUp(char.id, choice ?? undefined, newSpellIds)
                  setLevelUpOpen(false)
                  setPendingAsiQueue([])
                }
              }}
              onCancel={() => { setLevelUpOpen(false); setPendingAsiQueue([]) }}
            />
          )}
          {spellOnlyOpen && (
            <SpellSelectionStep
              panelMode
              character={char}
              newLevel={targetNewLevel}
              onConfirm={(newSpellIds) => {
                levelUp(char.id, undefined, newSpellIds)
                setSpellOnlyOpen(false)
              }}
              onCancel={() => setSpellOnlyOpen(false)}
            />
          )}
          {!levelUpOpen && !spellOnlyOpen && equipOpen && (
            <>
              <EquipmentLayout
                character={char}
                onOpenShop={() => setShopOpen(true)}
              />
              {shopOpen && (
                <ShopPanel
                  character={char}
                  onClose={() => setShopOpen(false)}
                />
              )}
            </>
          )}
          {!levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && selectedAction !== null && (
            <ActionDetailPanel
              character={char}
              update={update}
              selectedAction={selectedAction}
              onSelectAction={(name) => { setSelectedAction(name); if (name) { setSelectedFeature(null); setEquipOpen(false); setShopOpen(false) } }}
              selectedFeature={selectedFeature}
            />
          )}
        </div>
      </div>

      {diceOpen && <DiceRollerOverlay onClose={() => setDiceOpen(false)} />}
    </div>
  )
}
