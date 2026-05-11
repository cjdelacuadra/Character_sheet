import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character } from '@/entities/character/types'
import styles from './CharacterSelectScreen.module.css'

export function CharacterSelectScreen() {
  const { characters, setActiveCharacter, addCharacter } = useAppStore()
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
            <li key={char.id}>
              <button
                className={styles.card}
                onClick={() => setActiveCharacter(char.id)}
              >
                <span className={styles.cardName}>{char.name}</span>
                <span className={styles.cardSub}>
                  Level {char.level} {char.race} {char.classId}
                </span>
                <span className={styles.cardHp}>
                  HP {char.hitPoints.current}/{char.hitPoints.max}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <QuickCreateModal
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

interface QuickCreateModalProps {
  onClose: () => void
  onCreate: (char: Character) => void
}

function QuickCreateModal({ onClose, onCreate }: QuickCreateModalProps) {
  const [name, setName] = useState('')
  const [race, setRace] = useState('Human')
  const [classId, setClassId] = useState('Fighter')
  const [level, setLevel] = useState(1)
  const [maxHp, setMaxHp] = useState(10)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const char: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      race,
      classId,
      background: 'Soldier',
      level,
      experiencePoints: 0,
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      hitPoints: { current: maxHp, max: maxHp, temp: 0 },
      armorClass: 10,
      speed: 30,
      initiative: 0,
      proficiencyBonus: Math.ceil(level / 4) + 1,
      spellIds: [],
      spellSlots: {},
      conditionIds: [],
      resources: {},
      deathSaves: { successes: 0, failures: 0 },
      inspiration: false
    }

    onCreate(char)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>New Character</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span>Race</span>
            <select className={styles.input} value={race} onChange={(e) => setRace(e.target.value)}>
              {RACES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Class</span>
            <select className={styles.input} value={classId} onChange={(e) => setClassId(e.target.value)}>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Level</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span>Max HP</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={maxHp}
                onChange={(e) => setMaxHp(Number(e.target.value))}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.createBtn} disabled={!name.trim()}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const RACES = ['Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Tiefling', 'Dragonborn', 'Half-Orc']
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
