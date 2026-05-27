import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { initLogger, writeEntry } from './logger'

let DATA_DIR: string
let EQUIPMENT_DIR: string

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function ensureEquipmentDir(): void {
  if (!existsSync(EQUIPMENT_DIR)) mkdirSync(EQUIPMENT_DIR, { recursive: true })
}

function characterPath(id: string): string {
  return join(DATA_DIR, `${id}.json`)
}

function equipmentPath(filename: string): string {
  return join(EQUIPMENT_DIR, filename)
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

  ipcMain.handle('log:error', (_e, source: string, message: string) => {
    writeEntry(source, message)
  })

  ipcMain.handle('equipment:readFile', (_e, filename: string) => {
    const p = equipmentPath(filename)
    if (!existsSync(p)) return null
    return readFileSync(p, 'utf-8')
  })

  ipcMain.handle('equipment:writeFile', (_e, filename: string, content: string) => {
    ensureEquipmentDir()
    writeFileSync(equipmentPath(filename), content, 'utf-8')
    return { ok: true }
  })

  ipcMain.handle('equipment:fileExists', (_e, filename: string) => {
    return existsSync(equipmentPath(filename))
  })

  ipcMain.handle('assets:listFiles', (_e, folderPath: string) => {
    const assetsDir = !app.isPackaged
      ? join(__dirname, '../../src/renderer/public/assets')
      : join(app.getPath('userData'), 'assets')
    const fullPath = join(assetsDir, folderPath)
    if (!existsSync(fullPath)) return []
    try {
      return readdirSync(fullPath)
        .filter(f => /\.(png|gif)$/i.test(f))
        .sort()
    } catch {
      return []
    }
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
  initLogger(app.getPath('userData'))
  DATA_DIR = join(app.getPath('userData'), 'characters')
  EQUIPMENT_DIR = !app.isPackaged
    ? join(__dirname, '../../src/renderer/public/equipment_data')
    : join(app.getPath('userData'), 'equipment')
  console.log('[equipment] dir:', EQUIPMENT_DIR)
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
