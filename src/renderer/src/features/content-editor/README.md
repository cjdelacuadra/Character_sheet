# features/content-editor/ — catalog CRUD building blocks

The edit-mode machinery behind the Content Editor hub (see
[`../../widgets/content-editor/`](../../widgets/content-editor/)). In-game panels never import
from here — definition editing is edit-mode only.

| File | Role |
|------|------|
| `CatalogShell.tsx` | Generic list + form layout with New / Save / Save As / Delete over a `CatalogAdapter<T>` (`list/get/blank/save/remove`). |
| `adapters.ts` | One adapter per catalog: feats, conditions, races, actions, spells (+ Buffs = spells filtered to `isBuffConditionSpell`), summon templates. Save/remove route to `shared/data/contentCatalogs.ts` loaders (JSON files) or `summonLoader`. |
| `forms/` | Dedicated field forms: `FeatEditorForm`, `ConditionEditorForm`, `ActionEditorForm`, `RaceEditorForm`, `SpellEditorForm` (Spells + Buffs). |
| `formFields.tsx` | Shared form primitives (Section, Row, Text/Number/Select/Checkbox, ability-bonus grid, validated id lists). |
| `statBlock.ts` | The stat-rows encoding (`STAT_OPTIONS`, `statsToRows`, `rowsToStats`) shared by ItemEditorPanel and StatBlockEditor. |
| `StatBlockEditor.tsx` | Controlled "how it wires" editor over one `AccessoryStats` block — used by the feat and race forms; the same vocabulary items use. |
| `JsonForm.tsx` | Raw-JSON fallback editor (kept for escape hatches like the spell form's Advanced section). |
| `ContentEditor.module.css` | Hub/shell/form styling from the global tokens. |

Feat/race `stats` blocks are folded by `computeEquipmentStats` (one aggregator), so anything
authored here reaches both calculation paths automatically.
