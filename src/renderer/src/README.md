# renderer/src — application source

The React app. Layered so **dependencies point inward**: UI → rules → data → nothing. Each layer has its
own README; start here for the map.

```
main.tsx            React entry — mounts <App/>
env.d.ts            Vite/asset ambient types
global.d.ts         Typed contract for the preload IPC bridge (window.*)

app/                Store (Zustand), ThemeContext, App shell, global.css   → app/README.md
domain/             Pure game logic — the rules engine, zero React         → domain/README.md
entities/           Shared type contracts (Character, Spell, …)            → entities/README.md
features/           One folder per UI panel, each with its module.css      → features/README.md
services/           IPC + storage adapter (Electron ⇄ browser/Capacitor)   → services/README.md
shared/             Static SRD data, equipment catalog, dice lib, helpers  → shared/README.md
ui/                 Look-preserving primitives (Panel, Modal)              → ui/README.md
widgets/            CharacterView — the sheet layout + panel router        → widgets/character-view/
__tests__/          Vitest suites for domain, migrations, equipment, …     → __tests__/README.md
```

## Layer rules

- **`domain/`** imports no React and no Zustand — it is pure and unit-tested. Everything mechanical lives
  here (or in `shared/data/charCalculations.ts`, the older calculation path kept live during the
  transition — see [domain/README.md](domain/README.md)).
- **`features/`** are presentational panels. They read the character from the store, call `domain`/`shared`
  functions for every derived value, and dispatch store actions to mutate. No feature computes rules
  inline.
- **`entities/`** holds only types — no logic — so any layer can depend on it without cycles.
- **`widgets/`** compose features into the full screen. `CharacterView` is the right-column panel router.

## State

`app/store` exposes a Zustand store with a character slice and a turn slice. Characters are v14
(`featureState`-based); a v13→v14 migration runs on load. UI never mutates a character object directly —
it calls a store action, which clones, recomputes derived stats, and persists via `services/`.
