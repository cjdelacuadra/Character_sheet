import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

export interface StorageAdapter {
  saveCharacter(id: string, data: unknown): Promise<void>
  loadCharacter(id: string): Promise<unknown>
  listCharacters(): Promise<string[]>
  deleteCharacter(id: string): Promise<void>
  readFile(filename: string): Promise<string | null>
  writeFile(filename: string, content: string): Promise<void>
  fileExists(filename: string): Promise<boolean>
}

const CHAR_DIR = 'characters'
const EQUIP_DIR = 'equipment'

class ElectronAdapter implements StorageAdapter {
  async saveCharacter(id: string, data: unknown): Promise<void> {
    await window.characterStore!.saveCharacter(id, data)
  }

  loadCharacter(id: string): Promise<unknown> {
    return window.characterStore!.loadCharacter(id)
  }

  listCharacters(): Promise<string[]> {
    return window.characterStore!.listCharacters()
  }

  async deleteCharacter(id: string): Promise<void> {
    await window.characterStore!.deleteCharacter(id)
  }

  readFile(filename: string): Promise<string | null> {
    return window.equipmentStore!.readFile(filename)
  }

  async writeFile(filename: string, content: string): Promise<void> {
    await window.equipmentStore!.writeFile(filename, content)
  }

  fileExists(filename: string): Promise<boolean> {
    return window.equipmentStore!.fileExists(filename)
  }
}

class CapacitorAdapter implements StorageAdapter {
  private async ensureDir(dir: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: dir,
        directory: Directory.Data,
        recursive: true,
      })
    } catch {
    }
  }

  async saveCharacter(id: string, data: unknown): Promise<void> {
    await this.ensureDir(CHAR_DIR)
    await Filesystem.writeFile({
      path: CHAR_DIR + '/' + id + '.json',
      data: JSON.stringify(data, null, 2),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
  }

  async loadCharacter(id: string): Promise<unknown> {
    try {
      const result = await Filesystem.readFile({
        path: CHAR_DIR + '/' + id + '.json',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      })
      return JSON.parse(result.data as string)
    } catch {
      return null
    }
  }

  async listCharacters(): Promise<string[]> {
    await this.ensureDir(CHAR_DIR)
    try {
      const result = await Filesystem.readdir({
        path: CHAR_DIR,
        directory: Directory.Data,
      })
      return result.files
        .filter(f => f.name.endsWith('.json') && !f.name.startsWith('__'))
        .map(f => f.name.slice(0, -5))
    } catch {
      return []
    }
  }

  async deleteCharacter(id: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: CHAR_DIR + '/' + id + '.json',
        directory: Directory.Data,
      })
    } catch {
    }
  }

  async readFile(filename: string): Promise<string | null> {
    try {
      const result = await Filesystem.readFile({
        path: EQUIP_DIR + '/' + filename,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      })
      return result.data as string
    } catch {
      return null
    }
  }

  async writeFile(filename: string, content: string): Promise<void> {
    await this.ensureDir(EQUIP_DIR)
    await Filesystem.writeFile({
      path: EQUIP_DIR + '/' + filename,
      data: content,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      await Filesystem.stat({
        path: EQUIP_DIR + '/' + filename,
        directory: Directory.Data,
      })
      return true
    } catch {
      return false
    }
  }
}

let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (_adapter === null) {
    if (typeof (window as any).characterStore !== 'undefined') {
      _adapter = new ElectronAdapter()
    } else {
      _adapter = new CapacitorAdapter()
    }
  }
  return _adapter
}
