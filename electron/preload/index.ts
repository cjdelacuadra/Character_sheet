const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('characterStore', {
  saveCharacter: (id: string, data: unknown) =>
    ipcRenderer.invoke('character:save', id, data),
  loadCharacter: (id: string) =>
    ipcRenderer.invoke('character:load', id),
  listCharacters: () =>
    ipcRenderer.invoke('character:list'),
  deleteCharacter: (id: string) =>
    ipcRenderer.invoke('character:delete', id)
})

contextBridge.exposeInMainWorld('appLogger', {
  logError: (source: string, message: string) =>
    ipcRenderer.invoke('log:error', source, message)
})

contextBridge.exposeInMainWorld('equipmentStore', {
  readFile:   (filename: string) =>
    ipcRenderer.invoke('equipment:readFile', filename),
  writeFile:  (filename: string, content: string) =>
    ipcRenderer.invoke('equipment:writeFile', filename, content),
  fileExists: (filename: string) =>
    ipcRenderer.invoke('equipment:fileExists', filename),
})
