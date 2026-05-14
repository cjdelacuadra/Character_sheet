import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELLS } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import styles from './SpellSelectionStep.module.css'

function spellsKnownAt(level: number, table: Partial<Record<number, number>>): number {
  let count = 0
  for (let l = 1; l <= level; l++) {
    if (table[l] !== undefined) count = table[l]!
  }
  return count
}

interface Props {
  character: Character
  newLevel: number
  onConfirm: (newSpellIds: string[]) => void
  onCancel: () => void
}

export function SpellSelectionStep({ character, newLevel, onConfirm, onCancel }: Props) {
  const classDef = CLASS_BY_ID[character.classId]
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(character.spellIds))

  if (!classDef) return null

  const spellsKnownNew = spellsKnownAt(newLevel, classDef.spellsKnownTable ?? {})
  const cantripsKnownNew = spellsKnownAt(newLevel, classDef.cantripsKnownTable ?? {})

  const currentCantrips = character.spellIds.filter(id => {
    const s = SPELLS.find(sp => sp.id === id)
    return s?.level === 0
  })
  const currentSpells = character.spellIds.filter(id => {
    const s = SPELLS.find(sp => sp.id === id)
    return s && s.level > 0
  })

  const maxCantrips = cantripsKnownNew
  const maxSpells = spellsKnownNew

  const selectedCantrips = [...selected].filter(id => {
    const s = SPELLS.find(sp => sp.id === id)
    return s?.level === 0
  })
  const selectedSpells = [...selected].filter(id => {
    const s = SPELLS.find(sp => sp.id === id)
    return s && s.level > 0
  })

  const classSpells = SPELLS.filter(s => s.classes.includes(character.classId))

  function toggle(id: string, level: number) {
    const isCantrip = level === 0
    const cap = isCantrip ? maxCantrips : maxSpells
    const currentGroup = isCantrip ? selectedCantrips : selectedSpells
    const has = selected.has(id)
    if (!has && currentGroup.length >= cap) return  // at cap
    const next = new Set(selected)
    if (has) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const filteredCantrips = classSpells.filter(s => s.level === 0 && s.name.toLowerCase().includes(search.toLowerCase()))
  const filteredSpells = classSpells.filter(s => s.level > 0 && s.level <= Math.ceil(newLevel / 2) && s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.title}>Level {newLevel} — Pick Your Spells</span>
            <span className={styles.subtitle}>
              {maxCantrips > 0 && `${selectedCantrips.length}/${maxCantrips} cantrips`}
              {maxCantrips > 0 && maxSpells > 0 && ' · '}
              {maxSpells > 0 && `${selectedSpells.length}/${maxSpells} spells`}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>

        <input
          className={styles.search}
          type="search"
          placeholder="Search spells…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />

        <div className={styles.body}>
          {maxCantrips > 0 && filteredCantrips.length > 0 && (
            <>
              <div className={styles.groupLabel}>Cantrips ({selectedCantrips.length}/{maxCantrips})</div>
              {filteredCantrips.map(s => {
                const sel = selected.has(s.id)
                const atCap = !sel && selectedCantrips.length >= maxCantrips
                return (
                  <button
                    key={s.id}
                    className={`${styles.spellRow} ${sel ? styles.spellRowSel : ''} ${atCap ? styles.spellRowDim : ''}`}
                    onClick={() => toggle(s.id, s.level)}
                    disabled={atCap}
                  >
                    <span className={styles.spellName}>{s.name}</span>
                    <span className={styles.spellMeta}>{s.school} · {s.castingTime}</span>
                  </button>
                )
              })}
            </>
          )}
          {maxSpells > 0 && filteredSpells.length > 0 && (
            <>
              <div className={styles.groupLabel}>Spells ({selectedSpells.length}/{maxSpells})</div>
              {filteredSpells.map(s => {
                const sel = selected.has(s.id)
                const atCap = !sel && selectedSpells.length >= maxSpells
                return (
                  <button
                    key={s.id}
                    className={`${styles.spellRow} ${sel ? styles.spellRowSel : ''} ${atCap ? styles.spellRowDim : ''}`}
                    onClick={() => toggle(s.id, s.level)}
                    disabled={atCap}
                  >
                    <span className={styles.spellLevel}>{s.level}</span>
                    <span className={styles.spellName}>{s.name}</span>
                    <span className={styles.spellMeta}>{s.school} · {s.castingTime}</span>
                  </button>
                )
              })}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.confirmBtn} onClick={() => onConfirm([...selected])}>
            Confirm &amp; Level Up
          </button>
        </div>
      </div>
    </div>
  )
}
