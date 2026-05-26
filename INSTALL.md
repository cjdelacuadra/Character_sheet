# Installation & Setup

## Requirements

| Tool | Minimum | Recommended | Notes |
|------|---------|-------------|-------|
| Node.js | 18 LTS | 22 LTS or 26 | [nodejs.org](https://nodejs.org) |
| npm | 9 | 11 | Included with Node |
| Git | any | latest | [git-scm.com](https://git-scm.com) |
| OS | — | Windows 10+, macOS 12+, Ubuntu 22+ | Electron 42 supports all three |

> Check your versions: `node -v` and `npm -v`

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd Character_sheet

# 2. Install dependencies  (~200 MB, takes 1–2 min first time)
npm install

# 3. Launch the development window
npm run dev
```

The Electron window opens automatically. Hot Module Replacement is active — changes
to renderer source reload the window instantly; changes to `electron/main` require
a manual restart.

---

## Windows-Specific Notes

**PowerShell execution policy** — if npm scripts are blocked, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Or prefix every command with `cmd /c`:
```powershell
cmd /c "npm run dev"
```
sometimes power shell throws:
`error during start dev server and electron app:`
`Error: Electron uninstall`

to fix it add electron to path

```powershell
 $env:PATH += ";$env:USERPROFILE\node\bin"    
 node "$PATH\Character_sheet\node_modules\electron\install.js"
```
if doesn't work add the mirror image
                                                                                                
```powershell
 $PATH\Character_sheet> $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"       
 $PATH\Character_sheet\node_modules\electron\install.js"
```

**OneDrive sync** — if the project lives inside an OneDrive folder (as in the default
path `%USERPROFILE%\OneDrive\Escritorio\Character_sheet`), exclude `node_modules` from
sync to avoid file-lock conflicts:

1. Right-click `node_modules` → Properties → Attributes → check "Hidden"
2. Or move the repo outside OneDrive

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server + open Electron window with HMR |
| `npm run build` | Compile renderer + main process into `out/` |
| `npm run preview` | Open a built `out/` in Electron (no HMR) |
| `npm run typecheck` | Type-check all source files (renderer + main + preload) |
| `npm test` | Run Vitest unit tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run gen:csv` | Regenerate equipment CSV files from TypeScript source |

---

## Building a Distributable

The project uses **electron-vite** for bundling. To produce a raw platform build:

```bash
npm run build
```

Output lands in `out/`:
```
out/
  main/        compiled Electron main process
  preload/     compiled context bridge
  renderer/    compiled React app (static assets)
```

To package into an installable binary (`.exe` on Windows, `.app` on macOS,
`.AppImage` on Linux), add **electron-builder**:

```bash
npm install --save-dev electron-builder
```

Then add to `package.json`:

```json
"build": {
  "appId": "com.yourname.charactersheet",
  "productName": "D&D 5e Character Sheet",
  "directories": { "output": "dist" },
  "win": { "target": "nsis" },
  "mac": { "target": "dmg" },
  "linux": { "target": "AppImage" }
},
"scripts": {
  "dist": "electron-vite build && electron-builder"
}
```

Then run:
```bash
npm run dist
```

---

## User Data Location

Character saves, custom equipment CSV files, and settings are stored in:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\character-sheet\` |
| macOS | `~/Library/Application Support/character-sheet/` |
| Linux | `~/.config/character-sheet/` |

These files persist across app updates and uninstalls (Electron does not delete
user data on uninstall).

---

## Troubleshooting

**White screen on launch** — usually a renderer build error. Check the DevTools
console (`Ctrl+Shift+I` or `Cmd+Option+I`) or the terminal where `npm run dev`
is running.

**`ELECTRON_RUN_AS_NODE` error** — the `dev.mjs` script strips this variable.
Run `npm run dev` (not `node electron/main`) to launch correctly.

**Port conflict** — Vite uses port 5173 by default. If something else is running
there, set `VITE_PORT=5174 npm run dev` or edit `vite.config.ts`.

**`node_modules` lock file conflicts** — delete `node_modules/` and
`package-lock.json`, then `npm install` again.
