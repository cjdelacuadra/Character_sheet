# Assets needed: effects/counter/

Sprites for reaction-based intercept spells. Requires a phantom "incoming spell" to be visualized alongside the player's counter.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `counter_beam.gif` | gif | 8 one-shot, ~400ms | A beam from the player's tile extending toward the incoming spell, fizzling on contact. |
| `incoming_spell.gif` | gif | 8 looped | A generic enemy-cast spell visual (purple sparkle ball) flying toward the player — purely a visualization aid so Counterspell has something to intercept. |

All files target **22×22 px** (counter_beam may stretch horizontally to bridge tiles), image-rendering: pixelated.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| counterspell | counter_beam.gif + incoming_spell.gif (phantom) | `vizCategory: 'counter'` (new template) |

## Reuse rules

- `incoming_spell.gif` is a **visualization aid only** — it represents whatever spell is being countered, but is generic. Don't add per-damage-type incoming variants.
- The render template should fire `incoming_spell` flying toward the player → `counter_beam` interception → both vanish at the midpoint. One-shot, then loops.
- If a future Dispel Magic visualization is added, it can reuse `counter_beam` (the intercept is conceptually identical).
