# electron/main/ — main process

Runs in Node with full OS access. Owns the app window and every privileged operation.

| File | Responsibility |
|------|----------------|
| `index.ts` | App entry: creates the BrowserWindow, wires app lifecycle, and registers IPC handlers — `character:load/save/list/delete`, equipment file read/write, and custom-items persistence. Wraps `JSON.parse` in try/catch so a corrupt save logs and returns `null` instead of crashing. |
| `logger.ts` | Main-process file/console logger used by the handlers. |

Persistence targets the Electron `userData` directory (`%APPDATA%/character-sheet` on Windows and the
platform equivalents). The renderer never touches the filesystem directly — it goes through
[`preload/`](../preload/) → these handlers.
