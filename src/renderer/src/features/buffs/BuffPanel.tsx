import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { useAppStore } from '@/app/store'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeACFull, mod } from '@/shared/data/charCalculations'
import { rollDiceExpr } from '@/domain/dice'
import {
  BUFF_CONDITION_SPELLS,
  SPELL_BY_ID,
  type BuffCategory,
  getBuffCategory,
  getBuffTarget,
} from '@/shared/data/spellData'
import { Panel, PanelEmptyNote } from '@/ui/Panel'
import { consumeOneShotBuff } from './buffRuntime'
import styles from './BuffPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

const CATEGORY_ORDER: BuffCategory[] = ['damage', 'defense', 'mobility', 'accuracy', 'healing', 'utility']

function groupByCategory<T extends { category: BuffCategory }>(items: T[]): [BuffCategory, T[]][] {
  const map = new Map<BuffCategory, T[]>()
  for (const item of items) {
    const list = map.get(item.category)
    if (list) list.push(item)
    else map.set(item.category, [item])
  }
  return CATEGORY_ORDER
    .filter(category => map.has(category))
    .map(category => [category, map.get(category)!])
}

function spellcastingTempHp(char: Character): number {
  const cls = CLASS_BY_ID[char.classId]
  const sub = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const ability = sub?.spellcastingAbility ?? cls?.spellcastingAbility
  return ability ? Math.max(1, mod(char.abilityScores[ability])) : 1
}

function effectSummary(id: string): string {
  const spell = SPELL_BY_ID[id]
  if (!spell) return id
  if (spell.turnResource?.kind === 'heal') return `${spell.turnResource.formula} heal/turn`
  if (spell.turnResource?.kind === 'tempHp') return 'temp HP/turn'
  if (spell.turnResource?.kind === 'onHitRider') return `+${spell.turnResource.formula} ${spell.turnResource.damageType}`
  if (spell.attackBuff?.bonusDmg) return `+${spell.attackBuff.bonusDmg} ${spell.attackBuff.bonusDmgType ?? ''}`.trim()
  if (spell.attackBuff?.toHitDice) return `+${spell.attackBuff.toHitDice} to hit`
  if (spell.attackBuff?.toHit) return `+${spell.attackBuff.toHit} to hit`
  if (spell.acBonus) return `AC +${spell.acBonus}`
  if (spell.setsBaseAC) return `base AC ${spell.setsBaseAC}`
  if (spell.speedBonus) return `+${spell.speedBonus} ft`
  if (spell.speedMultiplier) return `speed x${spell.speedMultiplier}`
  if (spell.grantsTempHp) return `${spell.grantsTempHp} temp HP`
  return spell.turnResource?.label ?? 'tracked'
}

export function BuffPanel({ character: char, update }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Groups start COLLAPSED; clicking a header expands it.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const dropConcentration = useAppStore(s => s.dropConcentration)

  const isExpanded = (key: string) => expandedGroups.has(key)
  const toggleGroup = (key: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const activeIds = char.activeBuffSpells ?? []
  const activeBuffs = activeIds
    .map(id => {
      const spell = SPELL_BY_ID[id]
      return spell ? { id, spell, category: getBuffCategory(spell) } : null
    })
    .filter((item): item is NonNullable<typeof item> => !!item)
  const activeGroups = groupByCategory(activeBuffs)
  const catalogGroups = groupByCategory(BUFF_CONDITION_SPELLS.map(spell => ({ id: spell.id, spell, category: getBuffCategory(spell) })))

  function removeBuff(id: string) {
    if (id === char.concentrationSpellId) {
      dropConcentration(char.id)
      setSelectedId(null)
      return
    }
    const nextBuffs = activeIds.filter(x => x !== id)
    const nextStates = { ...(char.buffStates ?? {}) }
    delete nextStates[id]
    update({
      activeBuffSpells: nextBuffs,
      buffStates: nextStates,
      armorClass: computeACFull({ ...char, activeBuffSpells: nextBuffs }),
    })
    if (selectedId === id) setSelectedId(null)
  }

  function addBuff(id: string) {
    if (activeIds.includes(id)) return
    const nextBuffs = [...activeIds, id]
    update({
      activeBuffSpells: nextBuffs,
      armorClass: computeACFull({ ...char, activeBuffSpells: nextBuffs }),
    })
  }

  function clearBuffs() {
    if (char.concentrationSpellId) dropConcentration(char.id)
    update({
      activeBuffSpells: [],
      buffStates: {},
      concentrationSpellId: null,
      conditionIds: char.conditionIds.filter(c => c.conditionId !== 'concentration'),
      armorClass: computeACFull({ ...char, activeBuffSpells: [], conditionIds: char.conditionIds.filter(c => c.conditionId !== 'concentration') }),
    })
    setSelectedId(null)
  }

  function patchBuffState(id: string, patch: NonNullable<Character['buffStates']>[string]) {
    update({ buffStates: { ...(char.buffStates ?? {}), [id]: { ...(char.buffStates?.[id] ?? {}), ...patch } } })
  }

  function consumeOneShot(id: string) {
    update(consumeOneShotBuff(char, id))
    setSelectedId(null)
  }

  function spendTurnResource(id: string) {
    const spell = SPELL_BY_ID[id]
    if (!spell?.turnResource) return
    if (spell.turnResource.kind === 'heal' && spell.turnResource.formula) {
      window.alert(`${spell.name}: heal ${rollDiceExpr(spell.turnResource.formula)} HP`)
    }
    if (spell.turnResource.kind === 'tempHp') {
      const temp = spellcastingTempHp(char)
      update({
        hitPoints: { ...char.hitPoints, temp: Math.max(char.hitPoints.temp, temp) },
        buffStates: { ...(char.buffStates ?? {}), [id]: { ...(char.buffStates?.[id] ?? {}), perTurnUsed: true } },
      })
      return
    }
    patchBuffState(id, { perTurnUsed: true })
  }

  function renderDetail(id: string) {
    const spell = SPELL_BY_ID[id]
    if (!spell) return null
    const state = char.buffStates?.[id] ?? {}
    const target = getBuffTarget(spell)
    const resource = spell.turnResource
    return (
      <div className={styles.detail}>
        {target !== 'self' && (
          <input
            className={styles.input}
            value={state.trackedTargetLabel ?? ''}
            placeholder={`${target} label`}
            onClick={event => event.stopPropagation()}
            onChange={event => patchBuffState(id, { trackedTargetLabel: event.target.value })}
          />
        )}
        {resource && <span className={styles.detailText}>{resource.label}</span>}
        {resource?.kind === 'onHitRider' && (
          <button className={styles.detailBtn} onClick={() => consumeOneShot(id)}>Used this hit</button>
        )}
        {(resource?.kind === 'heal' || resource?.kind === 'tempHp' || resource?.kind === 'repeatAttack') && (
          <button className={styles.detailBtn} disabled={state.perTurnUsed} onClick={() => spendTurnResource(id)}>
            {resource.kind === 'heal' ? `Heal ${resource.formula}` : resource.kind === 'tempHp' ? 'Apply temp HP' : 'Use'}
          </button>
        )}
      </div>
    )
  }

  const actions = [
    { label: pickerOpen ? 'Done' : '+ Buff', onClick: () => setPickerOpen(v => !v) },
    ...(activeIds.length > 0 ? [{ label: 'Clear', onClick: clearBuffs }] : []),
  ]

  return (
    <Panel label="Buffs" count={activeIds.length} actions={actions}>
      {pickerOpen && (
        <div className={styles.picker}>
          {catalogGroups.map(([category, items]) => (
            <div key={category} className={styles.group}>
              <button className={styles.groupHeader} onClick={() => toggleGroup(`picker-${category}`)}>
                <span className={styles.groupArrow}>{isExpanded(`picker-${category}`) ? 'v' : '>'}</span>
                <span className={styles.groupName}>{category}</span>
                <span className={styles.groupCount}>{items.length}</span>
              </button>
              {isExpanded(`picker-${category}`) && items.map(({ id, spell }) => (
                <button key={id} className={styles.pickRow} onClick={() => addBuff(id)} disabled={activeIds.includes(id)}>
                  <span>{spell.name}</span>
                  <span className={styles.rowMeta}>{effectSummary(id)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeIds.length === 0 && <PanelEmptyNote>No active buffs</PanelEmptyNote>}
      {activeGroups.map(([category, items]) => (
        <div key={category} className={styles.group}>
          <button className={styles.groupHeader} onClick={() => toggleGroup(category)}>
            <span className={styles.groupArrow}>{isExpanded(category) ? 'v' : '>'}</span>
            <span className={styles.groupName}>{category}</span>
            <span className={styles.groupCount}>{items.length}</span>
          </button>
          {isExpanded(category) && items.map(({ id, spell }) => {
            const selected = selectedId === id
            const target = getBuffTarget(spell)
            return (
              <div key={id} className={`${styles.rowWrap} ${selected ? styles.rowSelected : ''}`}>
                <button className={styles.row} onClick={() => setSelectedId(selected ? null : id)}>
                  <span className={styles.rowTop}>
                    <span className={styles.rowName}>{spell.name}</span>
                    <button className={styles.removeBtn} onClick={(event) => { event.stopPropagation(); removeBuff(id) }}>x</button>
                  </span>
                  <span className={styles.chips}>
                    <span className={styles.chip}>{category}</span>
                    <span className={styles.chip}>{target}</span>
                  </span>
                  <span className={styles.rowMeta}>{effectSummary(id)}</span>
                </button>
                {selected && renderDetail(id)}
              </div>
            )
          })}
        </div>
      ))}
    </Panel>
  )
}
