# electron/preload/ — context bridge

The security boundary between renderer and main. Runs before the renderer with `contextIsolation`, and
exposes a small, typed surface on `window` via `contextBridge` — nothing else crosses.

| File | Responsibility |
|------|----------------|
| `index.ts` | Defines `window.characterStore` and the equipment/custom-item APIs, each method forwarding to `ipcRenderer.invoke` of a channel handled in [`../main/index.ts`](../main/index.ts). |

The renderer's typed view of this bridge lives in `src/renderer/src/global.d.ts`; the runtime adapter
that calls it (and falls back to browser storage off-Electron) is `src/renderer/src/services/`.
