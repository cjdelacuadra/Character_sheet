import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/app/store'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { SUBCLASSES_BY_CLASS, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { xpForNextLevel, computeSpellLevelUpConfig, spellsKnownAt, computePreparedSpellCount } from '@/domain/rules'
import { SPELLS, SPELL_BY_ID } from '@/shared/data/spellData'

import { CharacterHeader } from '@/features/character-header/CharacterHeader'
import { RestPanel } from '@/features/rest/RestPanel'
import { VitalsPanel } from '@/features/vitals/VitalsPanel'
import { AbilitiesPanel } from '@/features/abilities/AbilitiesPanel'
import { ConditionsPanel } from '@/features/conditions/ConditionsPanel'
import { BuffPanel } from '@/features/buffs/BuffPanel'
import { SummonsPanel } from '@/features/summons/SummonsPanel'
import { SummonDetailPanel } from '@/features/summons/SummonDetailPanel'
import { FeaturesPanel } from '@/features/features-panel/FeaturesPanel'
import { RacialActionsPanel } from '@/features/racial-actions/RacialActionsPanel'
import { ActionListPanel } from '@/features/combat-actions/ActionListPanel'
import { ActionDetailPanel } from '@/features/combat-actions/ActionDetailPanel'
import { TurnHeader } from '@/features/combat-actions/TurnHeader'
import { NextTurnChecklist } from '@/features/combat-actions/NextTurnChecklist'
import { SkillSaveDetailPanel } from '@/features/detail-panel/SkillSaveDetailPanel'
import { EquipmentLayout } from '@/features/character-header/EquipmentLayout'
import { ShopPanel } from '@/features/shop/ShopPanel'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { LevelUpModal } from '@/features/level-up/LevelUpModal'
import type { AsiChoice } from '@/features/level-up/LevelUpModal'
import { SpellSelectionStep } from '@/features/level-up/SpellSelectionStep'
import { DiceRollerOverlay } from '@/features/dice-roller/DiceRollerOverlay'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'

import styles from './CharacterView.module.css'

/** The single occupant of the right column (level-up/spell flows overlay it). */
type RightPane =
  | { kind: 'nextTurn' }
  | { kind: 'equip'; shopOpen: boolean }
  | { kind: 'action'; name: string }
  | { kind: 'feature'; entry: FeatureEntry }
  | { kind: 'skillSave'; detail: { type: 'save' | 'skill'; key: string } }
  | { kind: 'summon'; id: string }
  | null

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, deleteCharacter, updateCharacter, addFeat, removeFeat, shortRest, longRest, levelUp, applyPendingAsi, setTempHp, summonFromTemplate, removeSummon, updateSummonState, newSummonTurn, clearAllSummons } = useAppStore()

  const [restOpen, setRestOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The right column shows exactly one pane at a time. One discriminated
  // union replaces the six mutually-clearing selection states the previous
  // version juggled (each onSelect had to null out five others).
  const [pane, setPane] = useState<RightPane>(null)
  const [sharedFilter, setSharedFilter] = useState<ShopItemKind | null>(null)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [pendingAsiQueue, setPendingAsiQueue] = useState<number[]>([])
  const [targetNewLevel, setTargetNewLevel] = useState<number>(0)
  const [spellOnlyOpen, setSpellOnlyOpen] = useState(false)
  const [spellValidationDeficit, setSpellValidationDeficit] = useState<{ spells: number; cantrips: number } | null>(null)
  const [newSpellTierNotice, setNewSpellTierNotice] = useState<string | null>(null)
  // ASI levels the character passed (e.g. created at level 7) but never got to choose. Drives a catch-up prompt.
  const [asiCatchUpQueue, setAsiCatchUpQueue] = useState<number[]>([])
  // Prepared casters (Cleric/Druid/Paladin/Artificer) who can prepare more spells than they have.
  const [prepareStepOpen, setPrepareStepOpen] = useState(false)

  // Derived views of the pane — names match the previous individual states so
  // the render conditions below read the same.
  const nextTurnOpen = pane?.kind === 'nextTurn'
  const equipOpen = pane?.kind === 'equip'
  const shopOpen = pane?.kind === 'equip' && pane.shopOpen
  const selectedAction = pane?.kind === 'action' ? pane.name : null
  const selectedFeature = pane?.kind === 'feature' ? pane.entry : null
  const selectedDetail = pane?.kind === 'skillSave' ? pane.detail : null
  const selectedSummonId = pane?.kind === 'summon' ? pane.id : null

  // Validate known-spell count when selecting a character (handles post-update migrations)
  useEffect(() => {
    if (!activeCharacterId) return
    const c = characters[activeCharacterId]
    if (!c) return
    const cls = CLASS_BY_ID[c.classId]
    const sub = c.subclass ? SUBCLASS_BY_ID[c.subclass] : undefined

    // Prepared casters without a known-spells table prepare from the full class list in SpellsPanel.
    // They are not forced through a leveled-spell picker.
    const castAbility = sub?.spellcastingAbility ?? cls?.spellcastingAbility
    const hasSlots = Object.values(c.spellSlots).some(s => (s as { total: number }).total > 0)
    if (cls?.prepareSpells && cls.spellsKnownTable && castAbility && hasSlots) {
      const limit = computePreparedSpellCount(c.classId, c.level, c.abilityScores[castAbility])
      const preparedLeveled = c.preparedSpellIds.filter(id => (SPELL_BY_ID[id]?.level ?? 0) > 0).length
      if (preparedLeveled < limit) { setPrepareStepOpen(true); return }
    }

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

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1000) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const char = activeCharacterId ? characters[activeCharacterId] : null
  if (!char) return null

  const classDef = CLASS_BY_ID[char.classId]
  // ASIs owed by the current level but not yet resolved (e.g. a character created above an ASI level).
  const outstandingAsi = (classDef?.asiLevels ?? []).filter(
    l => l <= char.level && !(char.completedAsiLevels ?? []).includes(l)
  )
  const xpNext = xpForNextLevel(char.level)
  const canLevelUp = xpNext !== null && char.experiencePoints >= xpNext

  function queuePreparedTierNotice(currentChar: NonNullable<typeof char>, newLevel: number) {
    if (!classDef?.prepareSpells || classDef.spellsKnownTable) return
    const oldMax = computeSpellLevelUpConfig(classDef, Math.max(1, currentChar.level - 1), currentChar.level, currentChar.subclass ?? undefined).maxSlotLevel
    const newMax = computeSpellLevelUpConfig(classDef, currentChar.level, newLevel, currentChar.subclass ?? undefined).maxSlotLevel
    if (newMax > oldMax) {
      setNewSpellTierNotice(`New spells available - you can now prepare level-${newMax} spells.`)
    }
  }

  void canLevelUp

  return (
    <div className={styles.view}>
      <CharacterHeader
        character={char}
        update={update}
        drawerOpen={drawerOpen}
        onDrawerToggle={() => setDrawerOpen(v => !v)}
        onLevelUp={() => {
          const newLevel = char.level + 1
          queuePreparedTierNotice(char, newLevel)
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
        onEquipToggle={() => setPane(equipOpen ? null : { kind: 'equip', shopOpen: false })}
        equipOpen={equipOpen}
      />

      {outstandingAsi.length > 0 && asiCatchUpQueue.length === 0 && (
        <button className={styles.asiBanner} onClick={() => setAsiCatchUpQueue(outstandingAsi)}>
          ⚑ {outstandingAsi.length} unspent Ability Score Improvement{outstandingAsi.length > 1 ? 's' : ''} (level{outstandingAsi.length > 1 ? 's' : ''} {outstandingAsi.join(', ')}) — click to resolve
        </button>
      )}

      {newSpellTierNotice && (
        <button className={styles.asiBanner} onClick={() => setNewSpellTierNotice(null)}>
          {newSpellTierNotice}
        </button>
      )}

      {restOpen && (
        <RestPanel
          character={char}
          onShortRest={(hdRolled) => { shortRest(char.id, hdRolled); setRestOpen(false) }}
          onLongRest={() => { longRest(char.id); setRestOpen(false) }}
          onClose={() => setRestOpen(false)}
        />
      )}

      {drawerOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className={styles.columns}>
        <aside className={`${styles.leftCol}${drawerOpen ? ` ${styles.leftColOpen}` : ''}`}>
          <VitalsPanel character={char} update={update} onTempHp={(amt) => setTempHp(char.id, amt)} onDelete={() => { deleteCharacter(char.id); exitCharacter() }} />
          <ConditionsPanel character={char} update={update} />
          <BuffPanel character={char} update={update} />
          <SummonsPanel
            character={char}
            selectedSummonId={selectedSummonId}
            onSelectSummon={(id) => setPane(id ? { kind: 'summon', id } : null)}
            onSummon={(templateId, count, source) => summonFromTemplate(char.id, templateId, count, source)}
            onClearAll={() => { clearAllSummons(char.id); setPane(p => p?.kind === 'summon' ? null : p) }}
          />
          <AbilitiesPanel
            character={char}
            update={update}
            selectedDetail={selectedDetail}
            onSelectDetail={(d) => setPane(d ? { kind: 'skillSave', detail: d } : null)}
          />
          <RacialActionsPanel character={char} update={update} />
          <FeaturesPanel
            character={char}
            update={update}
            addFeat={(featId, opts) => addFeat(char.id, featId, opts)}
            removeFeat={(featId) => removeFeat(char.id, featId)}
            selectedFeature={selectedFeature}
            onSelectFeature={(f) => setPane(f ? { kind: 'feature', entry: f } : null)}
          />
        </aside>

        <div className={styles.centerCol}>
          <TurnHeader
            charId={char.id}
            nextTurnOpen={nextTurnOpen}
            onToggleNextTurn={() => setPane(nextTurnOpen ? null : { kind: 'nextTurn' })}
          />
          <div className={styles.centerScroll}>
            <ActionListPanel
              character={char}
              selectedAction={selectedAction}
              onSelectAction={(name) => setPane(name ? { kind: 'action', name } : null)}
              update={update}
            />
          </div>
        </div>

        <div className={styles.rightCol}>
          {nextTurnOpen && (
            <NextTurnChecklist
              character={char}
              onClose={() => setPane(null)}
            />
          )}
          {!nextTurnOpen && levelUpOpen && (
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
          {prepareStepOpen && (() => {
            const sub = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
            const castAbility = sub?.spellcastingAbility ?? classDef?.spellcastingAbility
            const limit = castAbility ? computePreparedSpellCount(char.classId, char.level, char.abilityScores[castAbility]) : 0
            return (
              <SpellSelectionStep
                prepareMode
                character={char}
                newLevel={char.level}
                title={`${char.classId} Level ${char.level} — Prepare Spells`}
                forceSpellDelta={limit}
                onConfirm={(preparedIds) => {
                  // Keep prepared cantrips/non-leveled entries, replace the leveled prepared set.
                  const keptCantrips = char.preparedSpellIds.filter(id => (SPELL_BY_ID[id]?.level ?? 0) === 0)
                  update({ preparedSpellIds: [...new Set([...keptCantrips, ...preparedIds])] })
                  setPrepareStepOpen(false)
                }}
                onCancel={() => setPrepareStepOpen(false)}
              />
            )
          })()}
          {!nextTurnOpen && !levelUpOpen && !spellOnlyOpen && equipOpen && (
            <>
              <EquipmentLayout
                character={char}
                onOpenShop={() => setPane({ kind: 'equip', shopOpen: true })}
                onCloseShop={() => setPane({ kind: 'equip', shopOpen: false })}
                isShopOpen={shopOpen}
                onInventorySelectItem={(id) => { if (id) setPane({ kind: 'equip', shopOpen: false }) }}
                onFilterChange={setSharedFilter}
              />
              {shopOpen && (
                <ShopPanel
                  character={char}
                  onClose={() => setPane({ kind: 'equip', shopOpen: false })}
                  filterKind={sharedFilter}
                />
              )}
            </>
          )}
          {/* Feature selections render through ActionDetailPanel's rich feature
              details (Wild Shape, Channel Divinity, invocation/infusion/rune
              pickers, toggles…). These were unreachable dead UI before: the old
              guard required an action, while the feature region required no
              action — every feature click fell back to a plain-text panel. */}
          {!nextTurnOpen && !levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && (selectedAction !== null || selectedFeature !== null) && (
            <ActionDetailPanel
              character={char}
              update={update}
              selectedAction={selectedAction}
              onSelectAction={(name) => setPane(name ? { kind: 'action', name } : null)}
              selectedFeature={selectedFeature}
              onSummon={(templateId, count, source) => summonFromTemplate(char.id, templateId, count, source)}
              onConcentrationBroken={() => clearAllSummons(char.id, { concentrationOnly: true })}
            />
          )}
          {!nextTurnOpen && !levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && !selectedAction && !selectedFeature && selectedDetail && (
            <SkillSaveDetailPanel
              character={char}
              detail={selectedDetail}
              onClose={() => setPane(null)}
            />
          )}
          {!nextTurnOpen && !levelUpOpen && !spellOnlyOpen && !shopOpen && !equipOpen && !selectedAction && !selectedFeature && !selectedDetail && selectedSummonId && (() => {
            const summon = char.activeSummons.find(s => s.id === selectedSummonId)
            return summon ? (
              <SummonDetailPanel
                summon={summon}
                onUpdate={(patch) => updateSummonState(char.id, summon.id, patch)}
                onRemove={() => { removeSummon(char.id, summon.id); setPane(null) }}
                onNewTurn={() => newSummonTurn(char.id, summon.id)}
                onClose={() => setPane(null)}
              />
            ) : null
          })()}
        </div>
      </div>

      {diceOpen && <DiceRollerOverlay onClose={() => setDiceOpen(false)} />}

      {asiCatchUpQueue.length > 0 && (
        <LevelUpModal
          key={asiCatchUpQueue[0]}
          character={char}
          newLevel={asiCatchUpQueue[0]}
          showSpellSelection={false}
          onConfirm={(choice) => {
            const [head, ...tail] = asiCatchUpQueue
            if (choice) applyPendingAsi(char.id, head, choice)
            setAsiCatchUpQueue(tail)
          }}
          onCancel={() => setAsiCatchUpQueue([])}
        />
      )}
    </div>
  )
}
