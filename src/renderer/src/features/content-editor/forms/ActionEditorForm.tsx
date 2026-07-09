import type { ActionDef } from '@/shared/data/actionsData'
import { CLASSES } from '@/shared/data/classData'
import { Section, TextField, TextAreaField, SelectField, NumberField, CheckboxField, Row } from '../formFields'
import styles from '../ContentEditor.module.css'

interface Props {
  draft: ActionDef
  onChange: (next: ActionDef) => void
}

export function ActionEditorForm({ draft, onChange }: Props) {
  const set = (patch: Partial<ActionDef>) => onChange({ ...draft, ...patch })

  return (
    <div>
      <TextField label="Id" value={draft.id} onChange={id => set({ id })} />
      <TextField label="Name" value={draft.name} onChange={name => set({ name })} />
      <SelectField
        label="Economy" value={draft.type}
        onChange={type => set({ type: type as ActionDef['type'] })}
        options={['Action', 'Bonus Action', 'Reaction', 'Free'].map(t => ({ value: t, label: t }))}
      />
      <TextField label="Short" value={draft.short} onChange={short => set({ short })} placeholder="one-line summary shown in the list" />
      <TextAreaField label="Full" rows={4} value={draft.full} onChange={full => set({ full })} />

      <Section>Gating & cost</Section>
      <SelectField
        label="Class" value={draft.classOnly ?? ''}
        onChange={v => set({ classOnly: v || undefined, generic: v ? undefined : draft.generic })}
        options={[{ value: '', label: 'anyone' }, ...CLASSES.map(c => ({ value: c.id, label: c.id }))]}
      />
      <NumberField label="Min level" value={draft.requiresLevel} onChange={requiresLevel => set({ requiresLevel })} min={1} max={20} />
      <Row label="Resource">
        <input
          className={styles.formInput}
          value={draft.resourceKey ?? ''}
          placeholder="resource name (Ki, Rage, Sorcery Points…)"
          onChange={e => set({ resourceKey: e.target.value || undefined })}
        />
        <input
          className={`${styles.formInput} ${styles.formInputSm}`}
          type="number" min={1} max={10} title="cost"
          value={draft.resourceCost ?? ''}
          onChange={e => set({ resourceCost: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </Row>
      <CheckboxField label="Needs attack first" value={draft.requiresAttackThisTurn ?? false}
        onChange={v => set({ requiresAttackThisTurn: v || undefined })} />
      <CheckboxField label="Always available" value={draft.generic ?? false}
        onChange={v => set({ generic: v || undefined, classOnly: v ? undefined : draft.classOnly })} />
      <div className={styles.formHint}>
        "Always available" actions show for every character; class-gated ones need the class and level.
        A resource name makes the action spend from that pool when used.
      </div>
    </div>
  )
}
