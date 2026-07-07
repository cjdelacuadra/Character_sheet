# widgets/character-view/ — the character sheet

The top-level composition: assembles every feature panel into the sheet and routes the right-hand
(third) column.

| File | Role |
|------|------|
| `CharacterView.tsx` | The sheet layout. Holds the `pane` discriminated union that decides which detail/editor panel the third column shows (action, feature, skill/save/ability breakdown, summon, equipment, shop, level-up, next-turn, …), and renders the left/center feature panels. |
| `CharacterView.module.css` | Layout styling. |

A widget composes features; it does not implement rules. All mechanics come from `domain/` and `shared/`,
all mutations go through the store.
