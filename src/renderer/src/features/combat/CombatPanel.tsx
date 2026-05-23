import { useState } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { WEAPONS, type WeaponDef } from '@/shared/data/equipment/weapons'
import { computeAttackBonus, computeWeaponDamage, isProficientWithWeapon, getAvailableActions, getSpecialAttacks, SPELL_ATTACK_IDS, type ActionDef } from '@/domain/rules'
import { formatToHit } from '@/shared/lib/diceExpr'
import styles from './CombatPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function CombatPanel({ character: char, update }: Props) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [armoryOpen, setArmoryOpen] = useState(false)
  const [armoryTab, setArmoryTab] = useState<'browse' | 'custom'>('browse')
  const [armorySearch, setArmorySearch] = useState('')
  const [customWeapon, setCustomWeapon] = useState({ name: '', atkBonus: '0', damage: '', damageType: '' })
  const [customWeaponError, setCustomWeaponError] = useState<string | null>(null)

  const availableActions = getAvailableActions(char)
  const specialAttacks = getSpecialAttacks(char)
  const attackSpells = char.spellIds.filter(id => SPELL_ATTACK_IDS.has(id))

  const actionGroups: Array<{ type: ActionDef['type']; label: string; items: ActionDef[] }> = [
    { type: 'Action',       label: 'Actions',         items: availableActions.filter(a => a.type === 'Action') },
    { type: 'Bonus Action', label: 'Bonus Actions',   items: availableActions.filter(a => a.type === 'Bonus Action') },
    { type: 'Reaction',     label: 'Reactions',       items: availableActions.filter(a => a.type === 'Reaction') },
    { type: 'Free',         label: 'Class Abilities', items: availableActions.filter(a => a.type === 'Free') },
  ].filter(g => g.items.length > 0) as typeof actionGroups

  function isActionDepleted(action: ActionDef): boolean {
    if (!action.resourceKey || !action.resourceCost) return false
    const res = char.resources[action.resourceKey]
    if (!res) return false
    return (res.total - res.used) < action.resourceCost
  }

  function addWeaponFromCatalog(w: WeaponDef) {
    const weapon: Weapon = {
      id: crypto.randomUUID(),
      name: w.name,
      atkBonus: 0,
      damage: w.damageDie,
      damageType: w.damageType,
      rangeType: w.rangeType,
      properties: w.properties,
      enchantmentBonus: w.enchantmentBonus || undefined,
      enchantment: w.enchantment,
      bonusDamageDie: w.bonusDamageDie ?? (w.enchantment ? '1d6' : undefined),
      bonusDamageType: w.bonusDamageType ?? w.enchantment ?? undefined,
    }
    const isTwoHanded = w.properties?.some(p => p.toLowerCase().includes('two-handed')) ?? false
    const mainIsTwoHanded = char.weapons[0]?.properties?.some(p => p.toLowerCase().includes('two-handed')) ?? false

    let nextWeapons: Weapon[]
    if (isTwoHanded) {
      // Two-handed takes both hands — clears off-hand
      nextWeapons = [weapon]
    } else if (mainIsTwoHanded) {
      // Can't add off-hand while main hand is two-handed — replace main hand
      nextWeapons = [weapon]
    } else if (char.weapons.length >= 2) {
      // Off-hand already occupied — swap it out
      nextWeapons = [char.weapons[0], weapon]
    } else {
      nextWeapons = [...char.weapons, weapon]
    }
    update({ weapons: nextWeapons })
    setArmoryOpen(false)
  }

  const DAMAGE_PATTERN = /^\d+d\d+([+-]\d+)?$|^\d+$|^—$/

  function saveCustomWeapon() {
    const name = customWeapon.name.trim()
    const damage = customWeapon.damage.trim() || '—'
    if (!name) { setCustomWeaponError('Name is required.'); return }
    if (damage !== '—' && !DAMAGE_PATTERN.test(damage)) {
      setCustomWeaponError('Damage must be like 1d6, 2d6+3, or a plain number.')
      return
    }
    const atkBonus = parseInt(customWeapon.atkBonus, 10)
    if (isNaN(atkBonus)) { setCustomWeaponError('Attack bonus must be a number.'); return }
    setCustomWeaponError(null)
    const w: Weapon = {
      id: crypto.randomUUID(),
      name,
      atkBonus,
      damage,
      damageType: customWeapon.damageType.trim() || undefined,
    }
    update({ weapons: [...char.weapons, w] })
    setArmoryOpen(false)
    setCustomWeapon({ name: '', atkBonus: '0', damage: '', damageType: '' })
  }

  function removeWeapon(id: string) {
    update({ weapons: char.weapons.filter(w => w.id !== id) })
  }

  function labelClass(type: ActionDef['type']) {
    if (type === 'Action') return styles.labelAction
    if (type === 'Bonus Action') return styles.labelBonus
    if (type === 'Reaction') return styles.labelReaction
    return styles.labelFree
  }

  function accentClass(type: ActionDef['type']) {
    if (type === 'Action') return styles.selAction
    if (type === 'Bonus Action') return styles.selBonus
    if (type === 'Reaction') return styles.selReaction
    return styles.selFree
  }

  function badgeClass(type: ActionDef['type']) {
    if (type === 'Action') return styles.badgeAction
    if (type === 'Bonus Action') return styles.badgeBonusAction
    if (type === 'Reaction') return styles.badgeReaction
    return styles.badgeFree
  }

  const selectedActionDef = selectedAction ? availableActions.find(a => a.name === selectedAction) : null

  return (
    <>
      {/* Actions panels */}
      {actionGroups.map(({ type, label, items }) => (
        <section key={type} className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={`${styles.sectionLabel} ${labelClass(type)}`}>{label}</span>
            <span className={styles.actionTypeCount}>{items.length}</span>
          </div>
          <div className={styles.actionList}>
            {items.map(action => {
              const depleted = isActionDepleted(action)
              return (
                <button
                  key={action.name}
                  className={`${styles.actionCompact} ${depleted ? styles.actionDepleted : ''} ${selectedAction === action.name ? `${styles.actionCompactSel} ${accentClass(type)}` : ''}`}
                  onClick={() => setSelectedAction(selectedAction === action.name ? null : action.name)}
                >
                  <span className={styles.actionName}>{action.name}</span>
                  {action.resourceKey && (
                    <span className={styles.actionCost}>
                      {action.resourceCost} {action.resourceKey}
                    </span>
                  )}
                  <span className={styles.actionShort}>{action.short}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {/* Weapons table */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Attacks</span>
          <button className={styles.addBtn} onClick={() => setArmoryOpen(true)}>+ Add</button>
        </div>
        <table className={styles.weaponTable}>
          <thead>
            <tr>
              <th className={styles.wthName}>Name</th>
              <th className={styles.wthAtk}>Atk</th>
              <th className={styles.wthDmg}>Damage</th>
              <th className={styles.wthType}>Type</th>
              <th className={styles.wthRange}>Range</th>
              <th className={styles.wthDel} />
            </tr>
          </thead>
          <tbody>
            {char.weapons.map(w => {
              const computed = computeAttackBonus(char, w)
              const proficient = isProficientWithWeapon(char, w)
              const rangeLabel = w.rangeType === 'Melee' ? 'Melee' : w.rangeType === 'Ranged' ? 'Ranged' : w.rangeType === 'Melee or Ranged' ? 'M/R' : '—'
              return (
                <tr key={w.id} className={styles.weaponRow}>
                  <td className={styles.weaponName}>
                    {w.name}
                    {(w.enchantmentBonus ?? 0) > 0 && <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>}
                  </td>
                  <td className={styles.weaponAtk} style={proficient ? undefined : { opacity: 0.5 }}>
                    {formatToHit(computed, 'n')}
                    {!proficient && <span title="Not proficient"> ⚠</span>}
                  </td>
                  <td className={styles.weaponDmg}>{computeWeaponDamage(char, w)}</td>
                  <td className={styles.weaponDmg}>{w.damageType ?? '—'}</td>
                  <td className={styles.weaponDmg}>{rangeLabel}</td>
                  <td><button className={styles.weaponDel} onClick={() => removeWeapon(w.id)}>×</button></td>
                </tr>
              )
            })}
            {char.weapons.length === 0 && (
              <tr><td colSpan={6} className={styles.weaponEmpty}>No weapons — click + Add</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Action detail pane */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Action Detail</span>
          {selectedAction && <button className={styles.addBtn} onClick={() => setSelectedAction(null)}>Clear</button>}
        </div>
        {selectedActionDef ? (
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selectedActionDef.name}</span>
              <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
                {selectedActionDef.type === 'Bonus Action' ? 'Bonus' : selectedActionDef.type}
              </span>
            </div>
            {selectedActionDef.resourceKey && (
              <div className={styles.detailResource}>
                Cost: {selectedActionDef.resourceCost} {selectedActionDef.resourceKey}
                {char.resources[selectedActionDef.resourceKey] && (
                  <span className={styles.detailResourceRemaining}>
                    ({char.resources[selectedActionDef.resourceKey].total - char.resources[selectedActionDef.resourceKey].used} remaining)
                  </span>
                )}
              </div>
            )}
            <p className={styles.detailFull}>{selectedActionDef.full}</p>

            {/* Weapon attack breakdown when Attack is selected */}
            {selectedAction === 'Attack' && char.weapons.length > 0 && (
              <div className={styles.attackDetailWeapons}>
                {char.weapons.map(w => {
                  const atk = computeAttackBonus(char, w)
                  return (
                    <div key={w.id} className={styles.attackDetailCard}>
                      <div className={styles.attackDetailCardName}>
                        {w.name}
                        {(w.enchantmentBonus ?? 0) > 0 && <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>}
                      </div>
                      <div className={styles.attackDetailCardStats}>
                        <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Hit</span> {formatToHit(atk, 'n')}</span>
                        <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Dmg</span> {computeWeaponDamage(char, w)}</span>
                        <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Range</span> {w.rangeType ?? 'Melee'}</span>
                      </div>
                    </div>
                  )
                })}
                {specialAttacks.length > 0 && (
                  <div className={styles.specialAttackList}>
                    {specialAttacks.map(sa => (
                      <div key={sa.name} className={styles.specialAttackRow}>
                        <span className={styles.specialAttackName}>{sa.name}</span>
                        {sa.dice && <span className={styles.specialAttackDice}>{sa.dice}</span>}
                        <span className={styles.specialAttackNote}>{sa.note}</span>
                      </div>
                    ))}
                  </div>
                )}
                {attackSpells.length > 0 && (
                  <div className={styles.specialAttackList}>
                    <span className={styles.sectionLabel}>Spell Attacks</span>
                    {attackSpells.map(id => (
                      <div key={id} className={styles.specialAttackRow}>
                        <span className={styles.specialAttackName}>{id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.detailEmpty}>Select an action to see its full description.</div>
        )}
      </section>

      {/* Armory modal */}
      {armoryOpen && (
        <div className={styles.modalOverlay} onClick={() => setArmoryOpen(false)}>
          <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
            <div className={styles.armoryHeader}>
              <span className={styles.armoryTitle}>Armory</span>
              <button className={styles.modalClose} onClick={() => setArmoryOpen(false)}>×</button>
            </div>
            <div className={styles.armoryTabs}>
              <button className={`${styles.armoryTab} ${armoryTab === 'browse' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('browse')}>Browse Catalog</button>
              <button className={`${styles.armoryTab} ${armoryTab === 'custom' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('custom')}>Custom</button>
            </div>
            {armoryTab === 'browse' && (
              <>
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search weapons…"
                  value={armorySearch}
                  onChange={e => setArmorySearch(e.target.value)}
                  autoFocus
                />
                <div className={styles.armoryList}>
                  {(['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged', 'Magic'] as const).map(group => {
                    const groupWeapons = WEAPONS.filter(w => {
                      const cat = w.proficiencyCategory === 'Simple' ? 'Simple' : w.proficiencyCategory === 'Martial' ? 'Martial' : null
                      const range = w.rangeType === 'Ranged' ? 'Ranged' : 'Melee'
                      if (group === 'Magic') return (w.enchantmentBonus ?? 0) > 0
                      if (!cat) return false
                      return `${cat} ${range}` === group && (w.enchantmentBonus ?? 0) === 0
                    }).filter(w => w.name.toLowerCase().includes(armorySearch.toLowerCase()))
                    if (groupWeapons.length === 0) return null
                    return (
                      <div key={group} className={styles.armoryGroup}>
                        <div className={styles.armoryGroupLabel}>{group}</div>
                        {groupWeapons.map(w => (
                          <button key={w.id} className={styles.armoryEntry} onClick={() => addWeaponFromCatalog(w)}>
                            <span className={styles.armoryEntryName}>{w.name}</span>
                            <span className={styles.armoryEntryDmg}>{w.damageDie} {w.damageType}</span>
                            <span className={styles.armoryEntryProps}>{w.properties.slice(0, 2).join(', ')}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {armoryTab === 'custom' && (
              <div className={styles.armoryCustomForm}>
                <label className={styles.armoryField}>
                  <span>Name *</span>
                  <input className={styles.input} value={customWeapon.name} autoFocus placeholder="e.g. Flame Tongue" onChange={e => setCustomWeapon({ ...customWeapon, name: e.target.value })} />
                </label>
                <label className={styles.armoryField}>
                  <span>Damage (e.g. 1d6, 2d6+3)</span>
                  <input className={styles.input} value={customWeapon.damage} placeholder="1d6" onChange={e => setCustomWeapon({ ...customWeapon, damage: e.target.value })} />
                </label>
                <label className={styles.armoryField}>
                  <span>Damage type</span>
                  <input className={styles.input} value={customWeapon.damageType} placeholder="slashing" onChange={e => setCustomWeapon({ ...customWeapon, damageType: e.target.value })} />
                </label>
                <label className={styles.armoryField}>
                  <span>Attack bonus modifier</span>
                  <input className={styles.input} type="number" value={customWeapon.atkBonus} onChange={e => setCustomWeapon({ ...customWeapon, atkBonus: e.target.value })} />
                </label>
                {customWeaponError && <span className={styles.armoryError}>{customWeaponError}</span>}
                <button className={styles.armoryAddBtn} onClick={saveCustomWeapon}>Add Weapon</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
