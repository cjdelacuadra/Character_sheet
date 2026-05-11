import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'

const DATA_DIR = join(app.getPath('userData'), 'characters')

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function characterPath(id: string): string {
  return join(DATA_DIR, `${id}.json`)
}

function registerIpc(): void {
  ipcMain.handle('character:save', (_e, id: string, data: unknown) => {
    ensureDataDir()
    writeFileSync(characterPath(id), JSON.stringify(data, null, 2), 'utf-8')
    return { ok: true }
  })

  ipcMain.handle('character:load', (_e, id: string) => {
    const p = characterPath(id)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8'))
  })

  ipcMain.handle('character:list', () => {
    ensureDataDir()
    return readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5))
  })

  ipcMain.handle('character:delete', (_e, id: string) => {
    const p = characterPath(id)
    if (existsSync(p)) unlinkSync(p)
    return { ok: true }
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
