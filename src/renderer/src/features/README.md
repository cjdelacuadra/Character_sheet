# features/ — UI panels

One folder per panel. Each owns its `*.module.css` (referencing the design tokens in
`app/global.css`) and reads state from the store, delegating **all** derived values to `domain/` and
`shared/`. Features never compute rules inline and never mutate a character directly — they dispatch
store actions.

| Folder | Panel |
|--------|-------|
| `abilities/` | Ability scores, saving throws, skills. Ability mod / save / skill rows open a breakdown card in the third column. |
| `buffs/` | Active buff spells and their runtime (`buffRuntime.ts` handles seed / reset / one-shot consume). |
| `character-header/` | Header + equipment layout (armor/weapon/accessory slot grid, attunement, aggregated stats). |
| `character-select/` | Character list + the creation wizard. |
| `combat-actions/` | Action list, turn header, next-turn checklist, and the decomposed attack breakdown tables + feature-detail pane (`attackRows.ts`, `ActionDetailPanel.tsx`, `FeatureDetails.tsx`). |
| `conditions/` | Standard 5e condition toggles. |
| `detail-panel/` | Third-column detail cards — death saves, and ability/save/skill breakdowns. |
| `dice-roller/` | Dice-expression overlay. |
| `features-panel/` | Class/subclass/racial features list. |
| `inventory/` | Item editor (weapons + gear → user CSV), item card, inventory grid. |
| `level-up/` | Level-up modal (ASI / feat picker) + spell-selection step. |
| `racial-actions/` | Racial action uses. |
| `resources/` | Class resource pip trackers. |
| `rest/` | Short / long rest. |
| `shop/` | Catalog + owned columns, buy/sell flow. |
| `spells/` | Spells panel, slot tracker, metamagic arming, spell visualization. |
| `summons/` | Summon catalog, editor, detail panel, sprite. |
| `vitals/` | HP, temp HP, AC, speed, initiative, death saves, inspiration. |

> `combat/` is a legacy folder retained from v2 and is not wired into the current UI.

Features are composed into the screen by [`../widgets/character-view/`](../widgets/character-view/).
