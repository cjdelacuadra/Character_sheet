import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { GEAR_BY_ID, armorAndShields } from '@/shared/data/equipment/gear'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeACFull, computeSpeedFull, computeDarkvision, computeInitiativeFull, applyHpDelta, mod } from '@/shared/data/charCalculations'
import { computeSpellSaveDC, computeSpellAttackBonus } from '@/domain/rules'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { DeathSaveDetailPanel } from '@/features/detail-panel/DeathSaveDetailPanel'
import styles from './VitalsPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  onTempHp: (amount: number) => void
  onDelete?: () => void
}

export function VitalsPanel({ character: char, update, onTempHp, onDelete }: Props) {
  const [hpEdit, setHpEdit] = useState<string | null>(null)
  const [tempHpEdit, setTempHpEdit] = useState<string | null>(null)
  const [armorOpen, setArmorOpen] = useState(false)
  const [fieldEdit, setFieldEdit] = useState<{ field: 'speed'; value: string } | null>(null)
  const [deathDialogOpen, setDeathDialogOpen] = useState(false)
  const [deathDetailOpen, setDeathDetailOpen] = useState(false)

  const hp = char.hitPoints
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0
  const wildShapeHpPct = char.wildShapeForm && char.wildShapeForm.hp.max > 0
    ? Math.max(0, Math.min(100, (char.wildShapeForm.hp.current / char.wildShapeForm.hp.max) * 100))
    : 0
  const eq = char.equipment
  const classDef = CLASS_BY_ID[char.classId]
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const prof = char.proficiencyBonus
  const spellSaveDC = classDef?.spellcastingAbility ? computeSpellSaveDC(char) : null
  const spellAtkBonus = classDef?.spellcastingAbility ? computeSpellAttackBonus(char) : null
  const initiativeNotes = [
    ...(char.feats.includes('alert') ? ['+5 initiative'] : []),
    ...(char.subclass === 'GloomStalker' && char.level >= 3 ? ['+WIS to initiative'] : []),
  ]

  const equippedArmor = eq.armorId ? GEAR_BY_ID[eq.armorId] : null
  const armorStrRequired = equippedArmor?.strRequirement ?? 0
  const armorStrWarning = armorStrRequired > 0 && char.abilityScores.str < armorStrRequired

  const effectiveArmorProfs = [
    ...(classDef?.armorProficiencies ?? []),
    ...(subclassDef?.extraArmorProficiencies ?? []),
  ]
  const allowedArmors = armorAndShields().filter(a =>
    a.kind !== 'shield' && (a.type === 'none' || effectiveArmorProfs.includes(a.type as 'light' | 'medium' | 'heavy'))
  )
  const currentShieldId = eq.shieldId ?? null

  function setArmor(armorId: string | null) {
    const newEq = { ...char.equipment, armorId, hasShield: currentShieldId !== null, shieldId: currentShieldId }
    const newAC = computeACFull({ ...char, equipment: newEq })
    update({ equipment: newEq, armorClass: newAC })
  }

  function commitHpEdit() {
    if (hpEdit === null) return
    const v = parseInt(hpEdit, 10)
    if (!isNaN(v)) update({ hitPoints: { ...hp, current: Math.min(hp.max, Math.max(0, v)) } })
    setHpEdit(null)
  }

  function commitTempHpEdit() {
    if (tempHpEdit === null) return
    const v = parseInt(tempHpEdit, 10)
    if (!isNaN(v)) onTempHp(v)
    setTempHpEdit(null)
  }

  function applyHp(delta: number) {
    if (delta < 0 && char.wildShapeForm) {
      const damage = Math.abs(delta)
      const form = char.wildShapeForm
      const remainingFormHp = form.hp.current - damage
      if (remainingFormHp > 0) {
        update({ wildShapeForm: { ...form, hp: { ...form.hp, current: remainingFormHp } } })
        return
      }
      const overflow = Math.abs(Math.min(0, remainingFormHp))
      const next = applyHpDelta(hp, -overflow)
      update({
        wildShapeForm: undefined,
        hitPoints: { ...hp, current: next.current, temp: next.temp },
      })
      return
    }
    // Compute temp + current together and write them in ONE update, so the temp-HP depletion
    // isn't clobbered by a second write that spreads a stale `hp` (the original double-write bug).
    const next = applyHpDelta(hp, delta)
    const patch: Partial<Character> = { hitPoints: { ...hp, current: next.current, temp: next.temp } }
    // Damage that consumes ALL temp HP ends the spell buffs that provided it
    // (False Life, Armor of Agathys, Heroism, Polymorph, …) — drop them from active buffs.
    if (delta < 0 && hp.temp > 0 && next.temp === 0) {
      const buffs = char.activeBuffSpells ?? []
      const remaining = buffs.filter(id => { const s = SPELL_BY_ID[id]; return !(s?.grantsTempHp || s?.tempHpBuff) })
      if (remaining.length !== buffs.length) patch.activeBuffSpells = remaining
    }
    update(patch)
  }

  function tickSave(type: 'successes' | 'failures') {
    const cur = char.deathSaves[type]
    const newVal = cur >= 3 ? 0 : cur + 1
    if (type === 'failures' && newVal >= 3) {
      update({ deathSaves: { ...char.deathSaves, failures: newVal } })
      setDeathDialogOpen(true)
      return
    }
    if (type === 'successes' && newVal >= 3) {
      update({ deathSaves: { successes: 0, failures: 0 }, hitPoints: { ...hp, current: 1 } })
    } else {
      update({ deathSaves: { ...char.deathSaves, [type]: newVal } })
    }
  }

  function commitFieldEdit() {
    if (!fieldEdit) { setFieldEdit(null); return }
    const v = parseInt(fieldEdit.value, 10)
    if (!isNaN(v)) update({ speed: Math.max(0, v) })
    setFieldEdit(null)
  }

  return (
    <div className={styles.vitals}>
      {/* Top stat row: AC | Initiative | Speed */}
      <div className={styles.topStatRow}>
        <div
          className={`${styles.topStatBox} ${armorStrWarning ? styles.topStatBoxWarn : ''}`}
          onClick={() => setArmorOpen(v => !v)}
          title="Click to manage armor"
        >
          <span className={styles.topStatVal}>{char.armorClass}{armorStrWarning ? ' ⚠' : ''}</span>
          <span className={styles.topStatLabel}>Armor Class</span>
        </div>
        <div className={styles.topStatBox} title="Derived from DEX + feats/class">
          <span className={styles.topStatVal}>{fmtMod(computeInitiativeFull(char))}</span>
          <span className={styles.topStatLabel}>Initiative</span>
          {initiativeNotes.map(note => (
            <span key={note} style={{ color: 'var(--text-muted)', fontSize: 9 }}>{note}</span>
          ))}
        </div>
        <div
          className={`${styles.topStatBox} ${styles.topStatEditable}`}
          onClick={() => fieldEdit?.field !== 'speed' && setFieldEdit({ field: 'speed', value: String(char.speed) })}
          title="Click to edit"
        >
          {fieldEdit?.field === 'speed' ? (
            <input
              className={styles.statEditInput}
              type="number"
              value={fieldEdit.value}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setFieldEdit({ field: 'speed', value: e.target.value })}
              onBlur={commitFieldEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitFieldEdit() }}
            />
          ) : (
            <span className={styles.topStatVal}>{computeSpeedFull(char)} <span className={styles.statUnit}>ft</span></span>
          )}
          <span className={styles.topStatLabel}>Speed</span>
        </div>
      </div>

      {/* Armor picker */}
      {armorOpen && (
        <div className={styles.armorPickerRow}>
          <span className={styles.armorPickerGroup}>Armor</span>
          {allowedArmors.map(a => (
            <button
              key={a.id}
              className={`${styles.armorOpt} ${(eq.armorId ?? 'none') === a.id ? styles.armorOptSel : ''}`}
              onClick={() => setArmor(a.id === 'none' ? null : a.id)}
            >
              {a.name}
            </button>
          ))}
          <button className={styles.armorOpt} onClick={() => setArmorOpen(false)}>Done</button>
        </div>
      )}

      {/* Secondary stats row */}
      <div className={styles.secondaryStatRow}>
        <span className={styles.secondaryStat}><strong>{fmtMod(prof)}</strong> Prof</span>
        {spellSaveDC !== null && <span className={styles.secondaryStat}><strong>{spellSaveDC}</strong> Spell DC</span>}
        {spellAtkBonus !== null && <span className={styles.secondaryStat}><strong>{fmtMod(spellAtkBonus)}</strong> Spell Atk</span>}
        {computeDarkvision(char) > 0 && <span className={styles.secondaryStat}><strong>{computeDarkvision(char)}</strong> Darkvision ft</span>}
      </div>

      {char.wildShapeForm && (
        <>
          <div className={styles.hpRow} style={{ gridTemplateColumns: '1fr auto' }}>
            <div className={styles.hpCurrentSection}>
              <span className={styles.hpMaxLabel}>
                Wild Shape: {char.wildShapeForm.name} · AC {char.wildShapeForm.ac} · CR {char.wildShapeForm.cr} · {char.wildShapeForm.speed}
              </span>
              <span className={styles.hpCurrent}>
                {char.wildShapeForm.hp.current}
              </span>
            </div>
            <div className={styles.hpTempSection}>
              <span className={styles.hpSectionLabel}>Beast HP</span>
              <button
                className={`${styles.tempHpChip} ${styles.tempHpActive}`}
                onClick={() => update({ wildShapeForm: undefined })}
                title="Leave Wild Shape"
              >
                Leave
              </button>
            </div>
          </div>
          <div className={styles.hpBar}>
            <div
              className={styles.hpFill}
              style={{
                width: `${wildShapeHpPct}%`,
                background: wildShapeHpPct > 50 ? 'var(--success)' : wildShapeHpPct > 25 ? 'var(--warning)' : 'var(--danger)',
              }}
            />
          </div>
          {char.concentrationSpellId && (
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Concentration persists on the druid while shaped.
            </span>
          )}
        </>
      )}

      {/* HP section */}
      <div className={styles.hpRow} style={hp.current <= 0 ? undefined : { gridTemplateColumns: '1fr auto' }}>
        <div className={styles.hpCurrentSection}>
          <span className={styles.hpMaxLabel}>Hit Point Maximum: {hp.max}</span>
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
        {hp.current <= 0 && (
          <div className={styles.hpDeathSection}>
            <span
              className={styles.hpSectionLabel}
              style={{ cursor: 'pointer' }}
              onClick={() => setDeathDetailOpen(v => !v)}
              title="Death saving throw details"
            >
              Death Saves ⓘ
            </span>
            {(['successes', 'failures'] as const).map(type => (
              <div key={type} className={styles.deathRow}>
                <span className={styles.deathLabel}>{type === 'successes' ? 'S' : 'F'}</span>
                <div className={styles.deathDots}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      className={`${styles.deathDot} ${i < char.deathSaves[type] ? (type === 'successes' ? styles.dotSuccess : styles.dotFail) : ''}`}
                      onClick={() => tickSave(type)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deathDetailOpen && hp.current <= 0 && (
        <DeathSaveDetailPanel character={char} onClose={() => setDeathDetailOpen(false)} />
      )}

      {/* HP bar */}
      <div className={styles.hpBar}>
        <div
          className={styles.hpFill}
          style={{
            width: `${hpPct}%`,
            background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)',
          }}
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

      {/* Inspiration pips */}
      <div className={styles.inspirationRow}>
        <span className={styles.inspirationLabel}>Inspiration</span>
        {[0, 1, 2].map(i => {
          const cur = char.inspiration
          return (
            <button
              key={i}
              className={`${styles.inspirationPip} ${i < cur ? styles.inspirationPipFilled : ''}`}
              onClick={() => update({ inspiration: i < cur ? Math.max(0, cur - 1) : Math.min(3, i + 1) })}
              title={i < cur ? 'Spend inspiration' : 'Gain inspiration'}
            />
          )
        })}
        <span className={styles.inspirationCount}>{char.inspiration > 0 ? `${char.inspiration}/3` : '—'}</span>
      </div>

      {deathDialogOpen && (
        <div className={styles.deathDialog}>
          <div className={styles.deathDialogBody}>
            <strong>Character Fallen</strong>
            <p>Your character has suffered 3 death save failures. They are dead. Delete this character?</p>
            <div className={styles.deathDialogBtns}>
              <button className={styles.deathDialogDelete}
                onClick={() => { setDeathDialogOpen(false); onDelete?.() }}>Delete Character</button>
              <button className={styles.deathDialogKeep}
                onClick={() => setDeathDialogOpen(false)}>Keep</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
