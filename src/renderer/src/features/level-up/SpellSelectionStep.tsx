import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELLS, SPELL_BY_ID } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeSpellLevelUpConfig } from '@/domain/rules'
import styles from './SpellSelectionStep.module.css'

interface Props {
  character: Character
  newLevel: number
  onConfirm: (newSpellIds: string[]) => void
  onCancel: () => void
  panelMode?: boolean
  title?: string
  forceSpellDelta?: number
  forceCantripDelta?: number
  /**
   * Prepared-caster mode (Cleric/Druid/Paladin/Artificer): pick which spells to PREPARE from the
   * full class list (not "learn"). Pre-selects the currently-prepared leveled spells, caps at the
   * total prepare limit (pass via forceSpellDelta), and onConfirm receives the full prepared set.
   */
  prepareMode?: boolean
}

export function SpellSelectionStep({ character, newLevel, onConfirm, onCancel, panelMode = false, title, forceSpellDelta, forceCantripDelta, prepareMode = false }: Props) {
  const classDef = CLASS_BY_ID[character.classId]
  const [search, setSearch] = useState('')
  // Learn mode: only newly selected spells (merged into spellIds on confirm).
  // Prepare mode: pre-seed with the currently-prepared leveled spells (the full set is replaced).
  const [selected, setSelected] = useState<Set<string>>(
    prepareMode
      ? new Set(character.preparedSpellIds.filter(id => (SPELL_BY_ID[id]?.level ?? 0) > 0))
      : new Set()
  )

  const subclassDef = character.subclass ? SUBCLASS_BY_ID[character.subclass] : undefined
  if (!classDef && !subclassDef?.spellsKnownTable) return null

  const oldLevel = newLevel - 1
  const { spellsDelta, cantripsDelta, maxSlotLevel } = computeSpellLevelUpConfig(classDef!, oldLevel, newLevel, character.subclass ?? undefined)

  // Prepare mode focuses on leveled spells (cantrips are still learned via the normal flow).
  const maxCantrips = prepareMode ? 0 : (forceCantripDelta ?? cantripsDelta)
  const maxSpells = forceSpellDelta ?? spellsDelta

  const selectedCantrips = [...selected].filter(id => SPELLS.find(s => s.id === id)?.level === 0)
  const selectedSpells   = [...selected].filter(id => { const s = SPELLS.find(sp => sp.id === id); return s && s.level > 0 })

  // In learn mode, already-known spells must not appear. In prepare mode the whole class list is
  // selectable (prepared casters prepare from their entire list).
  const spellClassId = subclassDef?.spellListClassId ?? character.classId
  const knownIds = new Set(character.spellIds)
  const classSpells = SPELLS.filter(s => s.classes.includes(spellClassId) && (prepareMode || !knownIds.has(s.id)))

  function toggle(id: string, level: number) {
    const isCantrip = level === 0
    const cap = isCantrip ? maxCantrips : maxSpells
    const currentGroup = isCantrip ? selectedCantrips : selectedSpells
    const has = selected.has(id)
    if (!has && currentGroup.length >= cap) return
    const next = new Set(selected)
    if (has) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const query = search.toLowerCase()
  const filteredCantrips = classSpells.filter(s => s.level === 0 && s.name.toLowerCase().includes(query))
  const filteredSpells   = classSpells.filter(s => s.level > 0 && s.level <= maxSlotLevel && s.name.toLowerCase().includes(query))

  const inner = (
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.title}>{title ?? (prepareMode ? `Prepare Spells — Level ${newLevel}` : `Level ${newLevel} — Pick Your Spells`)}</span>
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
          {maxCantrips === 0 && maxSpells === 0 && (
            <p className={styles.groupLabel}>No new spells to pick at this level.</p>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.confirmBtn} onClick={() => onConfirm([...selected])}>
            {prepareMode ? 'Save Prepared Spells' : 'Confirm & Level Up'}
          </button>
        </div>
      </div>
  )
  return panelMode ? inner : <div className={styles.overlay} onClick={onCancel}>{inner}</div>
}
