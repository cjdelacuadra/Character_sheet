import { useState } from 'react'
import type { ActiveSummon, ActiveSummonRuntime } from '@/entities/summon/types'
import styles from './SummonDetailPanel.module.css'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
  'Stunned', 'Unconscious',
]

const ECONOMY: { key: keyof ActiveSummon['economyUsed']; label: string }[] = [
  { key: 'actions', label: 'Action' },
  { key: 'bonusActions', label: 'Bonus' },
  { key: 'reactions', label: 'Reaction' },
]

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

interface Props {
  summon: ActiveSummon
  onUpdate: (patch: Partial<ActiveSummonRuntime>) => void
  onRemove: () => void
  onNewTurn: () => void
  onClose: () => void
}

export function SummonDetailPanel({ summon: s, onUpdate, onRemove, onNewTurn, onClose }: Props) {
  const [hpEdit, setHpEdit] = useState<string | null>(null)
  const [tempHpEdit, setTempHpEdit] = useState<string | null>(null)
  const [labelEdit, setLabelEdit] = useState<string | null>(null)
  const [condOpen, setCondOpen] = useState(false)

  const hp = s.hp
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0
  const dead = hp.current <= 0

  function commitHpEdit() {
    if (hpEdit === null) return
    const v = parseInt(hpEdit, 10)
    if (!isNaN(v)) onUpdate({ hp: { ...hp, current: Math.min(hp.max, Math.max(0, v)) } })
    setHpEdit(null)
  }

  function commitTempHpEdit() {
    if (tempHpEdit === null) return
    const v = parseInt(tempHpEdit, 10)
    if (!isNaN(v)) onUpdate({ hp: { ...hp, temp: Math.max(0, v) } })
    setTempHpEdit(null)
  }

  function applyHp(delta: number) {
    if (delta < 0 && hp.temp > 0) {
      const remaining = hp.temp + delta
      if (remaining >= 0) { onUpdate({ hp: { ...hp, temp: remaining } }); return }
      onUpdate({ hp: { ...hp, temp: 0, current: Math.max(0, hp.current + remaining) } })
    } else {
      onUpdate({ hp: { ...hp, current: Math.min(hp.max, Math.max(0, hp.current + delta)) } })
    }
  }

  function commitLabel() {
    if (labelEdit === null) return
    const v = labelEdit.trim()
    if (v) onUpdate({ label: v })
    setLabelEdit(null)
  }

  function toggleCondition(name: string) {
    const id = name.toLowerCase()
    const has = s.conditionIds.some(c => c.conditionId === id)
    onUpdate({
      conditionIds: has
        ? s.conditionIds.filter(c => c.conditionId !== id)
        : [...s.conditionIds, { conditionId: id }],
    })
  }

  function rollInitiative() {
    const roll = Math.floor(Math.random() * 20) + 1 + s.base.initiativeMod
    onUpdate({ initiativeRoll: roll })
  }

  function spendEconomy(key: keyof ActiveSummon['economyUsed']) {
    const max = s.base.actionEconomy[key]
    const cur = s.economyUsed[key]
    const next = cur >= max ? 0 : cur + 1
    onUpdate({ economyUsed: { ...s.economyUsed, [key]: next } })
  }

  return (
    <section className={`${styles.panel} ${dead ? styles.panelDead : ''}`}>
      <div className={styles.header}>
        {labelEdit !== null ? (
          <input
            className={styles.labelInput}
            value={labelEdit}
            autoFocus
            onChange={e => setLabelEdit(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setLabelEdit(null) }}
          />
        ) : (
          <span className={styles.label} onClick={() => setLabelEdit(s.label)} title="Click to rename">
            {s.label}
          </span>
        )}
        <div className={styles.headerBadges}>
          <span className={styles.typeBadge}>{s.base.type}</span>
          {s.concentration && <span className={styles.concBadge}>concentration</span>}
          <button className={styles.closeBtn} onClick={onClose} title="Close">×</button>
        </div>
      </div>

      {/* Locked top stats */}
      <div className={styles.statRow}>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{s.base.ac}</span>
          <span className={styles.statLabel}>Armor Class</span>
        </div>
        <div className={`${styles.statBox} ${styles.statBoxClickable}`} onClick={rollInitiative} title="Roll d20 + initiative mod">
          <span className={styles.statVal}>{s.initiativeRoll !== null ? s.initiativeRoll : fmtMod(s.base.initiativeMod)}</span>
          <span className={styles.statLabel}>{s.initiativeRoll !== null ? 'Initiative' : 'Roll Init'}</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{s.base.speed}</span>
          <span className={styles.statLabel}>Speed</span>
        </div>
      </div>

      {/* HP */}
      <div className={styles.hpRow}>
        <div className={styles.hpCurrentSection}>
          <span className={styles.hpMaxLabel}>HP Max: {hp.max}</span>
          {hpEdit !== null ? (
            <input
              className={styles.hpEditInput}
              type="number"
              value={hpEdit}
              autoFocus
              min={0} max={hp.max}
              onChange={e => setHpEdit(e.target.value)}
              onBlur={commitHpEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitHpEdit(); if (e.key === 'Escape') setHpEdit(null) }}
            />
          ) : (
            <span className={styles.hpCurrent} onClick={() => setHpEdit(String(hp.current))} title="Click to edit">
              {hp.current}
            </span>
          )}
        </div>
        <div className={styles.hpTempSection}>
          <span className={styles.hpSectionLabel}>Temp HP</span>
          {tempHpEdit !== null ? (
            <input
              className={styles.tempHpInput}
              type="number"
              min={0}
              value={tempHpEdit}
              autoFocus
              onChange={e => setTempHpEdit(e.target.value)}
              onBlur={commitTempHpEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitTempHpEdit(); if (e.key === 'Escape') setTempHpEdit(null) }}
            />
          ) : (
            <button
              className={`${styles.tempHpChip} ${hp.temp > 0 ? styles.tempHpActive : styles.tempHpMuted}`}
              onClick={() => setTempHpEdit(String(hp.temp))}
              title="Click to set"
            >
              {hp.temp > 0 ? `+${hp.temp}` : '—'}
            </button>
          )}
        </div>
      </div>
      <div className={styles.hpBar}>
        <div
          className={styles.hpFill}
          style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)' }}
        />
      </div>
      <div className={styles.hpBtns}>
        {[-10, -5, -1].map(d => (
          <button key={d} className={styles.dmgBtn} onClick={() => applyHp(d)}>{d}</button>
        ))}
        {[1, 5, 10].map(d => (
          <button key={d} className={styles.healBtn} onClick={() => applyHp(d)}>+{d}</button>
        ))}
      </div>

      {/* Action economy */}
      <div className={styles.economyRow}>
        {ECONOMY.map(({ key, label }) => {
          const max = s.base.actionEconomy[key]
          if (max === 0) return null
          const used = s.economyUsed[key]
          return (
            <div key={key} className={styles.economyGroup}>
              <span className={styles.economyLabel}>{label}</span>
              <div className={styles.economyPips}>
                {Array.from({ length: max }).map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.economyPip} ${i < used ? styles.economyPipUsed : ''}`}
                    onClick={() => spendEconomy(key)}
                    title={i < used ? 'Used' : 'Available'}
                  />
                ))}
              </div>
            </div>
          )
        })}
        <button className={styles.newTurnBtn} onClick={onNewTurn}>New Turn</button>
      </div>

      {/* Conditions */}
      <div className={styles.condSection}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Conditions</span>
          <button className={styles.smallBtn} onClick={() => setCondOpen(v => !v)}>{condOpen ? 'Done' : '+ Add'}</button>
        </div>
        {condOpen && (
          <div className={styles.condPicker}>
            {CONDITIONS.map(name => {
              const active = s.conditionIds.some(c => c.conditionId === name.toLowerCase())
              return (
                <button
                  key={name}
                  className={`${styles.condOpt} ${active ? styles.condOptActive : ''}`}
                  onClick={() => toggleCondition(name)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
        <div className={styles.condTags}>
          {s.conditionIds.length === 0 && !condOpen && <span className={styles.emptyNote}>None</span>}
          {s.conditionIds.map(c => (
            <button key={c.conditionId} className={styles.condTag} onClick={() => toggleCondition(c.conditionId)} title="Click to remove">
              {c.conditionId} ×
            </button>
          ))}
        </div>
      </div>

      {/* Attacks (locked) */}
      {s.base.attacks.length > 0 && (
        <div className={styles.attacksSection}>
          <span className={styles.sectionLabel}>Attacks</span>
          <table className={styles.attackTable}>
            <thead>
              <tr><th>Name</th><th>Hit</th><th>Damage</th><th>Type</th></tr>
            </thead>
            <tbody>
              {s.base.attacks.map(a => (
                <tr key={a.id}>
                  <td className={styles.atkName}>{a.name}{a.notes && <span className={styles.atkNote}> · {a.notes}</span>}</td>
                  <td>{a.toHit || '—'}</td>
                  <td>{a.damage}</td>
                  <td>{a.damageType ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spells (locked) */}
      {s.base.spells && s.base.spells.length > 0 && (
        <div className={styles.spellsSection}>
          <span className={styles.sectionLabel}>Spells</span>
          <div className={styles.spellList}>
            {s.base.spells.map((sp, i) => <span key={i} className={styles.spellChip}>{sp}</span>)}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className={styles.notesSection}>
        <span className={styles.sectionLabel}>Notes</span>
        <textarea
          className={styles.notes}
          value={s.notes}
          rows={2}
          placeholder="Anything else to track…"
          onChange={e => onUpdate({ notes: e.target.value })}
        />
      </div>

      <button className={styles.removeBtn} onClick={onRemove}>Dismiss Summon</button>
    </section>
  )
}
