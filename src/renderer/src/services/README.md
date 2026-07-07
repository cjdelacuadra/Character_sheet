# services/ — persistence & IPC

The seam between the app and its host environment.

| File | Role |
|------|------|
| `storageAdapter.ts` | Chooses a backend: the Electron IPC bridge (`window.characterStore`, from [`electron/preload`](../../../../electron/preload/)) when running in Electron, or a browser/Capacitor fallback otherwise. |
| `ipc.ts` | Typed service functions the app calls — `ipcService` (character load/save/list/delete, custom items) and `equipmentIpc` (CSV read/write). Everything routes through the adapter. |

The store calls these; no feature talks to `window.*` directly. The renderer-side type contract for the
bridge is `src/renderer/src/global.d.ts`.
