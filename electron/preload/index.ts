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
