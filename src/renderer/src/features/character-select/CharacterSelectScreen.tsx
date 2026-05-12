import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character, AbilityScores } from '@/entities/character/types'
import { defaultSpellSlots, defaultSpeedForRace, defaultAC, proficiencyBonus } from '@/shared/data/spellSlots'
import styles from './CharacterSelectScreen.module.css'

const RACES = ['Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Tiefling', 'Dragonborn', 'Half-Orc']
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export function CharacterSelectScreen() {
  const { characters, setActiveCharacter, addCharacter, deleteCharacter } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)

  const characterList = Object.values(characters)

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Characters</h1>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          + New Character
        </button>
      </header>

      {characterList.length === 0 ? (
        <div className={styles.empty}>
          <p>No characters yet.</p>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            Create your first character
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {characterList.map((char) => (
            <li key={char.id} className={styles.listItem}>
              <button
                className={styles.card}
                onClick={() => setActiveCharacter(char.id)}
              >
                <div className={styles.cardLeft}>
                  <span className={styles.cardName}>{char.name}</span>
                  <span className={styles.cardSub}>
                    Level {char.level} {char.race} {char.classId}
                    {char.subclass ? ` (${char.subclass})` : ''}
                  </span>
                </div>
                <div className={styles.cardStats}>
                  <span className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>HP</span>
                    <span className={styles.cardStatValue} style={{ color: hpColor(char.hitPoints.current, char.hitPoints.max) }}>
                      {char.hitPoints.current}/{char.hitPoints.max}
                    </span>
                  </span>
                  <span className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>AC</span>
                    <span className={styles.cardStatValue}>{char.armorClass}</span>
                  </span>
                </div>
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => { if (confirm(`Delete ${char.name}?`)) deleteCharacter(char.id) }}
                title="Delete character"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(char) => {
            addCharacter(char)
            setActiveCharacter(char.id)
          }}
        />
      )}
    </div>
  )
}

function hpColor(current: number, max: number) {
  const pct = current / max
  if (pct > 0.5) return 'var(--success)'
  if (pct > 0.25) return 'var(--warning)'
  return 'var(--danger)'
}

interface CreateModalProps {
  onClose: () => void
  onCreate: (char: Character) => void
}

type Step = 'basics' | 'scores'

function CreateModal({ onClose, onCreate }: CreateModalProps) {
  const [step, setStep] = useState<Step>('basics')
  const [name, setName] = useState('')
  const [race, setRace] = useState('Human')
  const [classId, setClassId] = useState('Fighter')
  const [level, setLevel] = useState(1)
  const [maxHp, setMaxHp] = useState(10)

  // ability score assignment (standard array)
  const [assignments, setAssignments] = useState<Partial<Record<keyof AbilityScores, number>>>({})

  const usedValues = Object.values(assignments)
  const availableValues = STANDARD_ARRAY.filter(v => !usedValues.includes(v))
  const allAssigned = ABILITY_KEYS.every(k => assignments[k] !== undefined)

  function assign(key: keyof AbilityScores, value: number | undefined) {
    setAssignments(prev => {
      const next = { ...prev }
      if (value === undefined) {
        delete next[key]
      } else {
        // unassign any key that currently has this value
        for (const k of ABILITY_KEYS) {
          if (next[k] === value) delete next[k]
        }
        next[key] = value
      }
      return next
    })
  }

  function handleCreate() {
    const scores: AbilityScores = {
      str: assignments.str ?? 10,
      dex: assignments.dex ?? 10,
      con: assignments.con ?? 10,
      int: assignments.int ?? 10,
      wis: assignments.wis ?? 10,
      cha: assignments.cha ?? 10,
    }
    const dexMod = Math.floor((scores.dex - 10) / 2)
    const char: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      race,
      classId,
      background: 'Soldier',
      level,
      experiencePoints: 0,
      abilityScores: scores,
      hitPoints: { current: maxHp, max: maxHp, temp: 0 },
      armorClass: defaultAC(classId),
      speed: defaultSpeedForRace(race),
      initiative: dexMod,
      proficiencyBonus: proficiencyBonus(level),
      spellIds: [],
      spellSlots: defaultSpellSlots(classId, level),
      conditionIds: [],
      resources: {},
      deathSaves: { successes: 0, failures: 0 },
      inspiration: false
    }
    onCreate(char)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Character</h2>
          <div className={styles.stepIndicator}>
            <span className={`${styles.stepDot} ${step === 'basics' ? styles.stepDotActive : styles.stepDotDone}`} />
            <span className={styles.stepLine} />
            <span className={`${styles.stepDot} ${step === 'scores' ? styles.stepDotActive : ''}`} />
          </div>
        </div>

        {step === 'basics' && (
          <div className={styles.stepContent}>
            <div className={styles.form}>
              <label className={styles.field}>
                <span>Name</span>
                <input
                  className={styles.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Character name"
                  autoFocus
                />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Race</span>
                  <select className={styles.input} value={race} onChange={e => setRace(e.target.value)}>
                    {RACES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Class</span>
                  <select className={styles.input} value={classId} onChange={e => setClassId(e.target.value)}>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Level</span>
                  <input
                    className={styles.input}
                    type="number" min={1} max={20}
                    value={level}
                    onChange={e => setLevel(Math.min(20, Math.max(1, Number(e.target.value))))}
                  />
                </label>
                <label className={styles.field}>
                  <span>Max HP</span>
                  <input
                    className={styles.input}
                    type="number" min={1}
                    value={maxHp}
                    onChange={e => setMaxHp(Math.max(1, Number(e.target.value)))}
                  />
                </label>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                type="button"
                className={styles.nextBtn}
                disabled={!name.trim()}
                onClick={() => setStep('scores')}
              >
                Ability Scores →
              </button>
            </div>
          </div>
        )}

        {step === 'scores' && (
          <div className={styles.stepContent}>
            <p className={styles.scoresHint}>
              Assign the standard array ({STANDARD_ARRAY.join(', ')}) to your six ability scores.
            </p>
            <div className={styles.scoresGrid}>
              {ABILITY_KEYS.map(key => (
                <div key={key} className={styles.scoreRow}>
                  <span className={styles.scoreKey}>{key.toUpperCase()}</span>
                  <div className={styles.scorePips}>
                    {STANDARD_ARRAY.map(val => {
                      const assigned = assignments[key] === val
                      const taken = usedValues.includes(val) && !assigned
                      return (
                        <button
                          key={val}
                          className={`${styles.scorePip}
                            ${assigned ? styles.scorePipSelected : ''}
                            ${taken ? styles.scorePipTaken : ''}`}
                          disabled={taken}
                          onClick={() => assign(key, assigned ? undefined : val)}
                        >
                          {val}
                        </button>
                      )
                    })}
                  </div>
                  {assignments[key] !== undefined ? (
                    <span className={styles.scoreValue}>{assignments[key]}</span>
                  ) : (
                    <span className={styles.scorePlaceholder}>—</span>
                  )}
                  <span className={styles.scoreMod}>
                    {assignments[key] !== undefined ? modifier(assignments[key]!) : ''}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.scoresNote}>
              {allAssigned
                ? `Available scores: ${availableValues.length > 0 ? availableValues.join(', ') : 'all assigned ✓'}`
                : `Available: ${availableValues.join(', ')} — ${ABILITY_KEYS.filter(k => !assignments[k]).length} remaining`}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setStep('basics')}>← Back</button>
              <button
                type="button"
                className={styles.createBtn}
                onClick={handleCreate}
              >
                Create Character
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function modifier(score: number) {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}
