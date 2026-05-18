import { useState } from 'react'
import type { Character, AbilityScore } from '@/entities/character/types'
import { FEATS, FEAT_BY_ID, type FeatDef } from '@/shared/data/featsData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASSES_BY_CLASS } from '@/shared/data/subclassData'
import { computeSpellLevelUpConfig } from '@/domain/rules'
import { SpellSelectionStep } from './SpellSelectionStep'
import styles from './LevelUpModal.module.css'

export type AsiChoice =
  | { type: 'double'; ability: AbilityScore }
  | { type: 'split'; ability1: AbilityScore; ability2: AbilityScore }
  | { type: 'feat'; featId: string; featAbilityChoice?: AbilityScore }

interface Props {
  character: Character
  newLevel: number
  showSpellSelection: boolean
  onConfirm: (choice: AsiChoice | null, newSpellIds?: string[], subclassId?: string) => void
  onCancel: () => void
  /** When true, renders without overlay backdrop (for embedding in a column) */
  panelMode?: boolean
}

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}
type Mode = 'double' | 'split' | 'feat'
type Step = 'subclass' | 'asi' | 'spells'

export function LevelUpModal({ character, newLevel, showSpellSelection, onConfirm, onCancel, panelMode = false }: Props) {
  const subclassUnlockLevel = SUBCLASSES_BY_CLASS[character.classId]?.[0]?.unlocksAtLevel
  const needsSubclass = newLevel === subclassUnlockLevel && !character.subclass

  const [mode, setMode] = useState<Mode>('double')
  const [doubleAbility, setDoubleAbility] = useState<AbilityScore>('str')
  const [splitA1, setSplitA1] = useState<AbilityScore>('str')
  const [splitA2, setSplitA2] = useState<AbilityScore>('dex')
  const [featSearch, setFeatSearch] = useState('')
  const [selectedFeat, setSelectedFeat] = useState<string | null>(null)
  const [featAbilityChoice, setFeatAbilityChoice] = useState<AbilityScore | null>(null)
  const [step, setStep] = useState<Step>(needsSubclass ? 'subclass' : 'asi')
  const [pendingChoice, setPendingChoice] = useState<AsiChoice | null>(null)
  const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null)

  const classDef = CLASS_BY_ID[character.classId]
  const isSpellcaster = classDef?.isSpellcaster && classDef.spellcastingAbility
  const spellConfig = classDef ? computeSpellLevelUpConfig(classDef, newLevel - 1, newLevel) : null
  const needsSpellSelection = showSpellSelection && isSpellcaster && !!spellConfig &&
    (spellConfig.spellsDelta > 0 || spellConfig.cantripsDelta > 0)
  const isAsiLevel = classDef?.asiLevels?.includes(newLevel) ?? false

  function isValid(): boolean {
    if (mode === 'double') return character.abilityScores[doubleAbility] < 20
    if (mode === 'split') return splitA1 !== splitA2 &&
      character.abilityScores[splitA1] < 20 && character.abilityScores[splitA2] < 20
    if (!selectedFeat) return false
    const featDef = FEAT_BY_ID[selectedFeat]
    if (featDef?.abilityChoice && !featAbilityChoice) return false
    return true
  }

  function handleSubclassConfirm() {
    if (!selectedSubclass) return
    if (isAsiLevel) {
      setStep('asi')
    } else if (needsSpellSelection) {
      setPendingChoice(null)
      setStep('spells')
    } else {
      onConfirm(null, undefined, selectedSubclass)
    }
  }

  function handleAsiConfirm() {
    if (!isValid()) return
    let choice: AsiChoice
    if (mode === 'double') choice = { type: 'double', ability: doubleAbility }
    else if (mode === 'split') choice = { type: 'split', ability1: splitA1, ability2: splitA2 }
    else choice = { type: 'feat', featId: selectedFeat!, featAbilityChoice: featAbilityChoice ?? undefined }

    if (needsSpellSelection) {
      setPendingChoice(choice)
      setStep('spells')
    } else {
      onConfirm(choice, undefined, selectedSubclass ?? undefined)
    }
  }

  function handleSpellsDone(newSpellIds: string[]) {
    onConfirm(pendingChoice!, newSpellIds, selectedSubclass ?? undefined)
  }

  if (step === 'spells' && needsSpellSelection) {
    return (
      <SpellSelectionStep
        character={character}
        newLevel={newLevel}
        onConfirm={handleSpellsDone}
        onCancel={onCancel}
        panelMode={panelMode}
      />
    )
  }

  if (step === 'subclass') {
    const subclassOptions = SUBCLASSES_BY_CLASS[character.classId] ?? []
    const inner = (
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.title}>Level Up — Level {newLevel}</span>
            <span className={styles.subtitle}>Choose your {character.classId} subclass</span>
          </div>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>
        <div className={styles.body}>
          <div className={styles.featPicker}>
            <div className={styles.featList}>
              {subclassOptions.map(sc => (
                <button
                  key={sc.id}
                  className={`${styles.featRow} ${selectedSubclass === sc.id ? styles.featRowSel : ''}`}
                  onClick={() => setSelectedSubclass(sc.id)}
                >
                  <span className={styles.featName}>{sc.label}</span>
                  {sc.description && <span className={styles.featDesc}>{sc.description}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            className={styles.confirmBtn}
            onClick={handleSubclassConfirm}
            disabled={!selectedSubclass}
          >
            {isAsiLevel ? 'Next: Ability Scores →' : needsSpellSelection ? 'Next: Pick Spells →' : 'Confirm & Level Up'}
          </button>
        </div>
      </div>
    )
    return panelMode ? inner : <div className={styles.overlay} onClick={onCancel}>{inner}</div>
  }

  const filteredFeats: FeatDef[] = FEATS.filter(f =>
    f.name.toLowerCase().includes(featSearch.toLowerCase())
  )

  const asiInner = (
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.title}>Level Up — Level {newLevel}</span>
            <span className={styles.subtitle}>Choose an Ability Score Improvement or Feat</span>
          </div>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>

        <div className={styles.modeTabs}>
          {(['double', 'split', 'feat'] as Mode[]).map(m => (
            <button
              key={m}
              className={`${styles.modeTab} ${mode === m ? styles.modeTabActive : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'double' ? '+2 to One Ability' : m === 'split' ? '+1/+1 to Two Abilities' : 'Take a Feat'}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {mode === 'double' && (
            <div className={styles.abilityPicker}>
              <p className={styles.modeDesc}>Add +2 to one ability score (max 20).</p>
              {ABILITY_KEYS.map(ab => {
                const current = character.abilityScores[ab]
                const capped = current >= 20
                return (
                  <button
                    key={ab}
                    className={`${styles.abilityRow} ${doubleAbility === ab ? styles.abilityRowSel : ''} ${capped ? styles.abilityRowCapped : ''}`}
                    onClick={() => !capped && setDoubleAbility(ab)}
                    disabled={capped}
                  >
                    <span className={styles.abName}>{ABILITY_LABELS[ab]}</span>
                    <span className={styles.abScore}>{current} → {Math.min(20, current + 2)}</span>
                    {capped && <span className={styles.cappedNote}>MAX</span>}
                  </button>
                )
              })}
            </div>
          )}

          {mode === 'split' && (
            <div className={styles.splitPicker}>
              <p className={styles.modeDesc}>Add +1 to two different abilities (max 20 each).</p>
              <div className={styles.splitCols}>
                {([['First ability (+1)', splitA1, setSplitA1, null], ['Second ability (+1)', splitA2, setSplitA2, splitA1]] as const).map(([label, selected, setSelected, exclude]) => (
                  <div key={label} className={styles.splitCol}>
                    <span className={styles.splitColLabel}>{label}</span>
                    {ABILITY_KEYS.map(ab => {
                      const current = character.abilityScores[ab]
                      const capped = current >= 20
                      const sameAsOther = ab === exclude
                      return (
                        <button
                          key={ab}
                          className={`${styles.abilityRow} ${selected === ab ? styles.abilityRowSel : ''} ${(capped || sameAsOther) ? styles.abilityRowCapped : ''}`}
                          onClick={() => !capped && !sameAsOther && setSelected(ab)}
                          disabled={capped || sameAsOther}
                        >
                          <span className={styles.abName}>{ABILITY_LABELS[ab]}</span>
                          <span className={styles.abScore}>{current} → {Math.min(20, current + 1)}</span>
                          {sameAsOther && <span className={styles.cappedNote}>same</span>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              {splitA1 === splitA2 && <p className={styles.errorNote}>The two abilities must be different.</p>}
            </div>
          )}

          {mode === 'feat' && (
            <div className={styles.featPicker}>
              <p className={styles.modeDesc}>Choose a feat to gain its benefits permanently.</p>
              <input
                className={styles.featSearch}
                type="search"
                placeholder="Search feats…"
                value={featSearch}
                onChange={e => setFeatSearch(e.target.value)}
                autoFocus
              />
              <div className={styles.featList}>
                {filteredFeats.map(feat => (
                  <button
                    key={feat.id}
                    className={`${styles.featRow} ${selectedFeat === feat.id ? styles.featRowSel : ''}`}
                    onClick={() => { setSelectedFeat(feat.id); setFeatAbilityChoice(null) }}
                  >
                    <span className={styles.featName}>{feat.name}</span>
                    <span className={styles.featDesc}>{feat.description}</span>
                  </button>
                ))}
              </div>
              {selectedFeat && FEAT_BY_ID[selectedFeat]?.abilityChoice && (
                <div className={styles.featAbilityPicker}>
                  <span className={styles.featAbilityLabel}>Choose ability to gain +1:</span>
                  <div className={styles.featAbilityBtns}>
                    {FEAT_BY_ID[selectedFeat]!.abilityChoice!.map(ab => (
                      <button
                        key={ab}
                        className={`${styles.featAbilityBtn} ${featAbilityChoice === ab ? styles.featAbilityBtnSel : ''}`}
                        onClick={() => setFeatAbilityChoice(ab)}
                      >
                        {ABILITY_LABELS[ab]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.confirmBtn} onClick={handleAsiConfirm} disabled={!isValid()}>
            {needsSpellSelection ? 'Next: Pick Spells →' : 'Confirm & Level Up'}
          </button>
        </div>
      </div>
  )
  return panelMode ? asiInner : <div className={styles.overlay} onClick={onCancel}>{asiInner}</div>
}
