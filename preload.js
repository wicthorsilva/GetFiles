const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  moveFiles: (source, destination) => ipcRenderer.send('move-files', { source, destination }),
  onMoveFilesResponse: (callback) => ipcRenderer.on('move-files-response', (event, response) => callback(response))
});
