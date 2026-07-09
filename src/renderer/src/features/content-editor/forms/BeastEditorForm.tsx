import type { WildShapeBeast, BeastAttack } from '@/shared/data/wildShapeBeasts'
import { Section, TextField, NumberField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

const DAMAGE_TYPES = ['slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force']

interface Props {
  draft: WildShapeBeast
  onChange: (next: WildShapeBeast) => void
}

export function BeastEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<WildShapeBeast>) => onChange({ ...draft, ...patch })
  const setAttack = (i: number, patch: Partial<BeastAttack>) =>
    set({ attacks: draft.attacks.map((a, j) => (j === i ? { ...a, ...patch } : a)) })

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <Row label="CR">
        <input
          className={`${styles.formInput} ${styles.formInputSm}`}
          type="number" step={0.25} min={0} max={6}
          value={draft.cr}
          onChange={e => set({ cr: Number(e.target.value) })}
        />
        <span className={styles.formHint}>0.25 = ¼, 0.5 = ½ — gates which druid levels can take the form</span>
      </Row>
      <NumberField label="HP" value={draft.hp} onChange={hp => set({ hp: hp ?? 1 })} min={1} max={200} />
      <NumberField label="AC" value={draft.ac} onChange={ac => set({ ac: ac ?? 10 })} min={5} max={25} />
      <TextField label="Speed" value={draft.speed} onChange={speed => set({ speed })} placeholder="40 ft, climb 30" />
      <TextField label="Multiattack" value={draft.multiattack ?? ''} onChange={v => set({ multiattack: v || undefined })} placeholder="Bite + Claws" />

      <Section>Attacks</Section>
      {draft.attacks.map((atk, i) => (
        <div key={i} className={styles.subRow} style={{ flexWrap: 'wrap' }}>
          <input className={styles.formInput} style={{ flex: '0 0 110px' }} value={atk.name} placeholder="Bite"
            onChange={e => setAttack(i, { name: e.target.value })} />
          <input className={`${styles.formInput} ${styles.formInputSm}`} type="number" min={-5} max={15} title="to hit"
            value={atk.toHit} onChange={e => setAttack(i, { toHit: Number(e.target.value) })} />
          <input className={`${styles.formInput} ${styles.formInputSm}`} value={atk.dmg} placeholder="2d4+2" title="damage"
            onChange={e => setAttack(i, { dmg: e.target.value })} />
          <select className={styles.formSelect} style={{ flex: '0 0 110px' }} value={atk.dmgType}
            onChange={e => setAttack(i, { dmgType: e.target.value })}>
            {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
          </select>
          <input className={styles.formInput} value={atk.note ?? ''} placeholder="rider note (save DC, prone…)"
            onChange={e => setAttack(i, { note: e.target.value || undefined })} />
          <button className={styles.subRemove} onClick={() => set({ attacks: draft.attacks.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button
        className={styles.subAdd}
        onClick={() => set({ attacks: [...draft.attacks, { name: 'Bite', toHit: 4, dmg: '1d6+2', dmgType: 'piercing' }] })}
      >+ attack</button>
    </div>
  )
}
