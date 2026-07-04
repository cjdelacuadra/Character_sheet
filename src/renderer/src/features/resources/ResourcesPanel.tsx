import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { getResourceDefaultDefinition } from '@/shared/data/resourceDefaults'
import { RESOURCE_EFFECTS } from '@/shared/data/resourceEffects'
import {
  CREATE_SLOT_COST, SORCERY_POINTS_RESOURCE,
  canConvertSlot, canCreateSlot, convertSlotToPoints, createSlotFromPoints,
} from '@/domain/rules/fontOfMagic'
import { useAppStore } from '@/app/store'
import { Panel } from '@/ui/Panel'
import styles from './ResourcesPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

// Resources whose total exceeds this render as a numeric pool (value + steppers + set-amount)
// instead of a row of pips. Catches HP pools like Lay on Hands (5×level) and high Ki / Sorcery Points.
const POOL_THRESHOLD = 12

export function ResourcesPanel({ character: char, update }: Props) {
  const entries = Object.entries(char.resources)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [fomOpen, setFomOpen] = useState(false)
  const useEconomy = useAppStore(s => s.useEconomy)
  const grantEconomy = useAppStore(s => s.grantEconomy)
  if (entries.length === 0) return null

  function setUsed(name: string, used: number) {
    const res = char.resources[name]
    if (!res) return
    const clamped = Math.min(res.total, Math.max(0, used))
    update({ resources: { ...char.resources, [name]: { ...res, used: clamped } } })
  }

  function useResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used >= res.total) return
    const effect = RESOURCE_EFFECTS.find(entry => entry.resourceKey === name)
    const patch: Partial<Character> = {
      resources: { ...char.resources, [name]: { ...res, used: Math.min(res.total, res.used + 1) } },
    }
    if (effect?.setsFlag) {
      patch[effect.setsFlag] = true
    }
    update(patch)
    if (name === 'Action Surge') {
      grantEconomy(char.id, 'action', 1)
      return
    }
    if (effect?.economy) useEconomy(char.id, effect.economy)
  }

  function recoverResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used === 0) return
    setUsed(name, res.used - 1)
  }

  function commitPool(name: string) {
    const res = char.resources[name]
    const raw = edits[name]
    setEdits(prev => { const next = { ...prev }; delete next[name]; return next })
    if (res && raw !== undefined && raw !== '') {
      const remaining = parseInt(raw, 10)
      if (!isNaN(remaining)) setUsed(name, res.total - remaining)
    }
  }

  // Font of Magic (flexible casting) is available to anyone with the
  // Sorcery Points pool — the buttons explain themselves via canCreate/canConvert.
  const hasSorceryPoints = !!char.resources[SORCERY_POINTS_RESOURCE]

  function fomCreate(level: number) {
    const patch = createSlotFromPoints(char, level)
    if (patch) update(patch)
  }
  function fomConvert(level: number) {
    const patch = convertSlotToPoints(char, level)
    if (patch) update(patch)
  }

  return (
    <Panel label="Resources">
      <div className={styles.resourceList}>
        {entries.map(([name, res]) => {
          const remaining = res.total - res.used
          const resDef = getResourceDefaultDefinition(char.classId, char.subclass, name)
          const isPool = res.total > POOL_THRESHOLD
          return (
            <div key={name} className={styles.resourceRow}>
              <span className={styles.resourceName}>{name}</span>
              {isPool ? (
                <div className={styles.resourcePool}>
                  <button
                    className={styles.poolBtn}
                    onClick={() => useResource(name)}
                    disabled={remaining <= 0}
                    title="Spend 1"
                  >−</button>
                  <input
                    className={styles.poolInput}
                    type="number"
                    min={0}
                    max={res.total}
                    value={edits[name] ?? String(remaining)}
                    onChange={e => setEdits(prev => ({ ...prev, [name]: e.target.value }))}
                    onBlur={() => commitPool(name)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    title="Set remaining"
                  />
                  <span className={styles.poolTotal}>/ {res.total}</span>
                  <button
                    className={styles.poolBtn}
                    onClick={() => recoverResource(name)}
                    disabled={remaining >= res.total}
                    title="Recover 1"
                  >＋</button>
                </div>
              ) : (
                <div className={styles.resourcePips}>
                  {Array.from({ length: res.total }).map((_, i) => (
                    <button
                      key={i}
                      className={`${styles.resourcePip} ${i < remaining ? styles.resourcePipFull : styles.resourcePipEmpty}`}
                      onClick={() => i < remaining ? useResource(name) : recoverResource(name)}
                      title={i < remaining ? 'Use' : 'Recover'}
                    />
                  ))}
                </div>
              )}
              {resDef && (
                <span className={styles.resourceRecovery}>
                  {resDef.recoverOn === 'short' ? 'SR' : resDef.recoverOn === 'long' ? 'LR' : '—'}
                </span>
              )}
              {name === SORCERY_POINTS_RESOURCE && (
                <button
                  className={styles.fomToggle}
                  onClick={() => setFomOpen(v => !v)}
                  title="Font of Magic: convert sorcery points and spell slots"
                >⇄ Slots</button>
              )}
            </div>
          )
        })}

        {hasSorceryPoints && fomOpen && (
          <div className={styles.fomBox}>
            <div className={styles.fomRow}>
              <span className={styles.fomLabel}>Points → slot</span>
              {Object.entries(CREATE_SLOT_COST).map(([lvl, cost]) => {
                const level = Number(lvl)
                const reason = canCreateSlot(char, level)
                return (
                  <button
                    key={lvl}
                    className={styles.fomBtn}
                    disabled={reason !== null}
                    onClick={() => fomCreate(level)}
                    title={reason === null
                      ? `Recover one expended level-${level} slot for ${cost} sorcery points`
                      : reason === 'not-enough-points' ? 'Not enough sorcery points'
                      : reason === 'no-expended-slot' ? 'No expended slot of this level'
                      : reason === 'no-such-slot' ? 'No slots of this level'
                      : 'Unavailable'}
                  >
                    L{lvl} ({cost}pt)
                  </button>
                )
              })}
            </div>
            <div className={styles.fomRow}>
              <span className={styles.fomLabel}>Slot → points</span>
              {Object.keys(char.spellSlots).map(lvl => {
                const level = Number(lvl)
                const reason = canConvertSlot(char, level)
                return (
                  <button
                    key={lvl}
                    className={styles.fomBtn}
                    disabled={reason !== null}
                    onClick={() => fomConvert(level)}
                    title={reason === null
                      ? `Expend a level-${level} slot to gain ${level} sorcery points`
                      : reason === 'no-available-slot' ? 'All slots of this level are spent'
                      : 'Unavailable'}
                  >
                    L{lvl} (+{level}pt)
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
