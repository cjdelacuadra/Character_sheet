# electron/ — native desktop shell

The Electron platform layer. Untouched by the renderer rewrite — it hosts the React app in a
BrowserWindow and brokers file-system access the sandboxed renderer cannot do directly.

| Folder | Role |
|--------|------|
| [`main/`](main/) | Main process — window creation, lifecycle, and all IPC handlers (character load/save/list/delete, equipment CSV read/write, custom items). |
| [`preload/`](preload/) | Context bridge — the only channel between renderer and main; exposes a typed `window.*` API. |

**Data flow:** renderer → `window.characterStore.*` (preload) → `ipcRenderer.invoke` → handler in
`main/index.ts` → JSON/CSV files under the OS user-data dir. Corrupt character files are caught and
logged (return `null`) rather than crashing startup.

The build config (`electron.vite.config.ts`), Capacitor config, and static assets are outside this
folder; see the repo root and `src/renderer/public/`.
