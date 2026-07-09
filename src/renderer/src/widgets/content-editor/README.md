# widgets/content-editor/ — the Content Editor hub

Edit mode, as opposed to playing a character. Reached from the character-select screen
("✎ Content Editor"); `App.tsx` switches between select / character / editor on
`contentEditorOpen` + `activeCharacterId`.

| File | Role |
|------|------|
| `ContentEditorScreen.tsx` | Left nav with the 8 views — Feats, Equipment, Spells, Summons, Conditions, Buffs, Actions (Action/Bonus/Reaction tabs), Races — each a `CatalogShell` + dedicated form from [`features/content-editor/`](../../features/content-editor/). Equipment embeds the full `ItemEditorPanel`; Summons embeds `SummonEditorForm`. |

Every edit persists to the catalog data files (`feats.json`, `conditions.json`, `races.json`,
`actions.json`, `spells.json`, `summonTemplates.json`, equipment CSVs) — the single source of
truth loaded at startup. In-game, definition editing is locked (read-only item viewer, no
summon catalog management); characters still equip/learn/summon normally.
