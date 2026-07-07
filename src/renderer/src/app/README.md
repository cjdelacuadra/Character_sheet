# app/ — application shell & global state

Wires React to the Zustand store and the theme, and owns the app-wide stylesheet.

| File / folder | Role |
|---------------|------|
| `App.tsx` | Top-level component: loads characters, renders the character-select screen or `CharacterView`. |
| `store/` | The Zustand store — character + turn slices. See [store/README.md](store/README.md). |
| `store.ts` | Re-export shim for the store (stable import path). |
| `ThemeContext.tsx` | Dark/light theme provider; stamps `data-theme` on the root. |
| `global.css` | Design tokens (Viking-dark / parchment-light palettes, fonts, textures) — the visual source of truth, ported verbatim from v2. Feature `*.module.css` files reference these tokens. |

Depends on `domain/` and `shared/` for logic, `features/` + `widgets/` for UI. Nothing depends back on
`app/` except through the store hook.
