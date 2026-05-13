import { useState } from 'react'
import type { Character, AbilityScore } from '@/entities/character/types'
import { FEATS, type FeatDef } from '@/shared/data/featsData'
import styles from './LevelUpModal.module.css'

export type AsiChoice =
  | { type: 'double'; ability: AbilityScore }
  | { type: 'split'; ability1: AbilityScore; ability2: AbilityScore }
  | { type: 'feat'; featId: string }

interface Props {
  character: Character
  newLevel: number
  onConfirm: (choice: AsiChoice) => void
  onCancel: () => void
}

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

type Mode = 'double' | 'split' | 'feat'

export function LevelUpModal({ character, newLevel, onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('double')
  const [doubleAbility, setDoubleAbility] = useState<AbilityScore>('str')
  const [splitA1, setSplitA1] = useState<AbilityScore>('str')
  const [splitA2, setSplitA2] = useState<AbilityScore>('dex')
  const [featSearch, setFeatSearch] = useState('')
  const [selectedFeat, setSelectedFeat] = useState<string | null>(null)

  function isValid(): boolean {
    if (mode === 'double') return character.abilityScores[doubleAbility] < 20
    if (mode === 'split') return splitA1 !== splitA2 &&
      character.abilityScores[splitA1] < 20 && character.abilityScores[splitA2] < 20
    return selectedFeat !== null
  }

  function handleConfirm() {
    if (!isValid()) return
    if (mode === 'double') onConfirm({ type: 'double', ability: doubleAbility })
    else if (mode === 'split') onConfirm({ type: 'split', ability1: splitA1, ability2: splitA2 })
    else if (selectedFeat) onConfirm({ type: 'feat', featId: selectedFeat })
  }

  const filteredFeats: FeatDef[] = FEATS.filter(f =>
    f.name.toLowerCase().includes(featSearch.toLowerCase())
  )

  return (
    <div className={styles.overlay} onClick={onCancel}>
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
                <div className={styles.splitCol}>
                  <span className={styles.splitColLabel}>First ability (+1)</span>
                  {ABILITY_KEYS.map(ab => {
                    const current = character.abilityScores[ab]
                    const capped = current >= 20
                    return (
                      <button
                        key={ab}
                        className={`${styles.abilityRow} ${splitA1 === ab ? styles.abilityRowSel : ''} ${capped ? styles.abilityRowCapped : ''}`}
                        onClick={() => !capped && setSplitA1(ab)}
                        disabled={capped}
                      >
                        <span className={styles.abName}>{ABILITY_LABELS[ab]}</span>
                        <span className={styles.abScore}>{current} → {Math.min(20, current + 1)}</span>
                      </button>
                    )
                  })}
                </div>
                <div className={styles.splitCol}>
                  <span className={styles.splitColLabel}>Second ability (+1)</span>
                  {ABILITY_KEYS.map(ab => {
                    const current = character.abilityScores[ab]
                    const capped = current >= 20
                    const sameAsFirst = ab === splitA1
                    return (
                      <button
                        key={ab}
                        className={`${styles.abilityRow} ${splitA2 === ab ? styles.abilityRowSel : ''} ${(capped || sameAsFirst) ? styles.abilityRowCapped : ''}`}
                        onClick={() => !capped && !sameAsFirst && setSplitA2(ab)}
                        disabled={capped || sameAsFirst}
                      >
                        <span className={styles.abName}>{ABILITY_LABELS[ab]}</span>
                        <span className={styles.abScore}>{current} → {Math.min(20, current + 1)}</span>
                        {sameAsFirst && <span className={styles.cappedNote}>same</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              {splitA1 === splitA2 && (
                <p className={styles.errorNote}>The two abilities must be different.</p>
              )}
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
                    onClick={() => setSelectedFeat(feat.id)}
                  >
                    <span className={styles.featName}>{feat.name}</span>
                    <span className={styles.featDesc}>{feat.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!isValid()}
          >
            Confirm &amp; Level Up
          </button>
        </div>
      </div>
    </div>
  )
}
