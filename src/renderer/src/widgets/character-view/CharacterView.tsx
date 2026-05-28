import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/app/store'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { SUBCLASSES_BY_CLASS, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { xpForNextLevel, computeSpellLevelUpConfig, spellsKnownAt } from '@/domain/rules'
import { SPELLS, SPELL_BY_ID } from '@/shared/data/spellData'

import { CharacterHeader } from '@/features/character-header/CharacterHeader'
import { RestPanel } from '@/features/rest/RestPanel'
import { VitalsPanel } from '@/features/vitals/VitalsPanel'
import { AbilitiesPanel } from '@/features/abilities/AbilitiesPanel'
import { ConditionsPanel } from '@/features/conditions/ConditionsPanel'
import { SummonsPanel } from '@/features/summons/SummonsPanel'
import { SummonDetailPanel } from '@/features/summons/SummonDetailPanel'
import { FeaturesPanel } from '@/features/features-panel/FeaturesPanel'
import { ActionListPanel } from '@/features/combat-actions/ActionListPanel'
import { ActionDetailPanel } from '@/features/combat-actions/ActionDetailPanel'
import { FeatureDetailPanel } from '@/features/detail-panel/FeatureDetailPanel'
import { SkillSaveDetailPanel } from '@/features/detail-panel/SkillSaveDetailPanel'
import { EquipmentLayout } from '@/features/character-header/EquipmentLayout'
import { ShopPanel } from '@/features/shop/ShopPanel'
import { LevelUpModal } from '@/features/level-up/LevelUpModal'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { SpellSelectionStep } from '@/features/level-up/SpellSelectionStep'
import { DiceRollerOverlay } from '@/features/dice-roller/DiceRollerOverlay'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'

import styles from './CharacterView.module.css'

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, deleteCharacter, updateCharacter, shortRest, longRest, levelUp, applyPendingAsi, setTempHp, summonFromTemplate, removeSummon, updateSummonState, newSummonTurn, clearAllSummons } = useAppStore()

  const [restOpen, setRestOpen] = useState(false)
  const [equipOpen, setEquipOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<FeatureEntry | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'save' | 'skill'; key: string } | null>(null)
  const [selectedSummonId, setSelectedSummonId] = useState<string | null>(null)
  const [pendingAsiQueue, setPendingAsiQueue] = useState<number[]>([])
  const [targetNewLevel, setTargetNewLevel] = useState<number>(0)
  const [spellOnlyOpen, setSpellOnlyOpen] = useState(false)
  const [spellValidationDeficit, setSpellValidationDeficit] = useState<{ spells: number; cantrips: number } | null>(null)

  // Validate known-spell count when selecting a character (handles post-update migrations)
  useEffect(() => {
    if (!activeCharacterId) return
    const c = characters[activeCharacterId]
    if (!c) return
    const cls = CLASS_BY_ID[c.classId]
    const sub = c.subclass ? SUBCLASS_BY_ID[c.subclass] : undefined
    const spellTable = sub?.spellsKnownTable ?? cls?.spellsKnownTable
    const cantripTable = sub?.cantripsKnownTable ?? cls?.cantripsKnownTable
    if (!spellTable && !cantripTable) return

    const spellListClassId = sub?.spellListClassId ?? c.classId
    const classSpellSet = new Set(SPELLS.filter(s => s.classes.includes(spellListClassId)).map(s => s.id))

    const raceDef = RACE_BY_ID[c.race]
    const racialSpellSet = new Set<string>()
    if (raceDef?.racialSpells) {
      for (const [lvl, ids] of Object.entries(raceDef.racialSpells)) {
        if (Number(lvl) <= c.level) ids?.forEach(id => racialSpellSet.add(id))
      }
    }

    const expectedSpells   = spellTable   ? spellsKnownAt(c.level, spellTable)   : 0
    const expectedCantrips = cantripTable ? spellsKnownAt(c.level, cantripTable) : 0
    const knownSpells   = c.spellIds.filter(id => { const s = SPELL_BY_ID[id]; return s && s.level > 0  && classSpellSet.has(id) && !racialSpellSet.has(id) }).length
    const knownCantrips = c.spellIds.filter(id => { const s = SPELL_BY_ID[id]; return s && s.level === 0 && classSpellSet.has(id) && !racialSpellSet.has(id) }).length

    const spellDeficit   = Math.max(0, expectedSpells   - knownSpells)
    const cantripDeficit = Math.max(0, expectedCantrips - knownCantrips)
    if (spellDeficit > 0 || cantripDeficit > 0) {
      setSpellValidationDeficit({ spells: spellDeficit, cantrips: cantripDeficit })
      setSpellOnlyOpen(true)
    }
  }, [activeCharacterId]) // eslint-disable-line react-hooks/exhaustive-deps

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
            const cfg = classDef ? computeSpellLevelUpConfig(classDef, char.level, newLevel, char.subclass ?? undefined) : null
            if (cfg && (cfg.spellsDelta > 0 || cfg.cantripsDelta > 0)) {
              setSpellOnlyOpen(true)
            } else {
              levelUp(char.id)
            }
          }
        }}
        onRestToggle={() => setRestOpen(v => !v)}
        onBack={exitCharacter}
        onEquipToggle={() => { setEquipOpen(p => !p); setSelectedAction(null); setShopOpen(false); setSelectedSummonId(null) }}
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
          <SummonsPanel
            character={char}
            selectedSummonId={selectedSummonId}
            onSelectSummon={(id) => {
              setSelectedSummonId(id)
              if (id) { setSelectedAction(null); setSelectedFeature(null); setSelectedDetail(null); setEquipOpen(false); setShopOpen(false) }
            }}
            onSummon={(templateId, count, source) => summonFromTemplate(char.id, templateId, count, source)}
            onClearAll={() => { clearAllSummons(char.id); setSelectedSummonId(null) }}
          />
          <AbilitiesPanel
            character={char}
            update={update}
            selectedDetail={selectedDetail}
            onSelectDetail={(d) => { setSelectedDetail(d); if (d) { setSelectedAction(null); setSelectedFeature(null); setEquipOpen(false); setShopOpen(false); setSelectedSummonId(null) } }}
          />
          <FeaturesPanel
            character={char}
            selectedFeature={selectedFeature}
            onSelectFeature={(f) => { setSelectedFeature(f); setSelectedAction(null); setSelectedDetail(null); setEquipOpen(false); setShopOpen(false); setSelectedSummonId(null) }}
          />
        </aside>

        <div className={styles.centerCol}>
          <ActionListPanel
            character={char}
            selectedAction={selectedAction}
            onSelectAction={(name) => { setSelectedAction(name); if (name) { setSelectedFeature(null); setSelectedDetail(null); setEquipOpen(false); setShopOpen(false); setSelectedSummonId(null) } }}
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
                    const cfg = classDef ? computeSpellLevelUpConfig(classDef, char.level, targetNewLevel, char.subclass ?? undefined) : null
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
              newLevel={spellValidationDeficit ? char.level : targetNewLevel}
              title={spellValidationDeficit ? `${char.classId} Level ${char.level} — Pick Missing Spells` : undefined}
              forceSpellDelta={spellValidationDeficit?.spells}
              forceCantripDelta={spellValidationDeficit?.cantrips}
              onConfirm={(newSpellIds) => {
                if (spellValidationDeficit) {
                  update({ spellIds: [...new Set([...char.spellIds, ...newSpellIds])] })
                  setSpellValidationDeficit(null)
                } else {
                  levelUp(char.id, undefined, newSpellIds)
                }
                setSpellOnlyOpen(false)
              }}
              onCancel={() => { setSpellOnlyOpen(false); setSpellValidationDeficit(null) }}
            />
          )}
          {!levelUpOpen && !spellOnlyOpen && equipOpen && (
            <>
              <EquipmentLayout
                character={char}
                onOpenShop={() => setShopOpen(true)}
                onCloseShop={() => setShopOpen(false)}
                isShopOpen={shopOpen}
                onInventorySelectItem={(id) => { if (id) setShopOpen(false) }}
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
              onSelectAction={(name) => { setSelectedAction(name); if (name) { setSelectedFeature(null); setSelectedDetail(null); setEquipOpen(false); setShopOpen(false); setSelectedSummonId(null) } }}
              selectedFeature={selectedFeature}
              onSummon={(templateId, count, source) => summonFromTemplate(char.id, templateId, count, source)}
              onConcentrationBroken={() => clearAllSummons(char.id, { concentrationOnly: true })}
            />
          )}
          {!levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && !selectedAction && selectedFeature && (
            <FeatureDetailPanel
              character={char}
              feature={selectedFeature}
              update={update}
              onClose={() => setSelectedFeature(null)}
            />
          )}
          {!levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && !selectedAction && !selectedFeature && selectedDetail && (
            <SkillSaveDetailPanel
              character={char}
              detail={selectedDetail}
              onClose={() => setSelectedDetail(null)}
            />
          )}
          {!levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && !selectedAction && !selectedFeature && !selectedDetail && selectedSummonId && (() => {
            const summon = char.activeSummons.find(s => s.id === selectedSummonId)
            return summon ? (
              <SummonDetailPanel
                summon={summon}
                onUpdate={(patch) => updateSummonState(char.id, summon.id, patch)}
                onRemove={() => { removeSummon(char.id, summon.id); setSelectedSummonId(null) }}
                onNewTurn={() => newSummonTurn(char.id, summon.id)}
                onClose={() => setSelectedSummonId(null)}
              />
            ) : null
          })()}
        </div>
      </div>

      {diceOpen && <DiceRollerOverlay onClose={() => setDiceOpen(false)} />}
    </div>
  )
}
