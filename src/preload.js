// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  saveAuth: (auth) => ipcRenderer.invoke('save-auth', auth),
  startWebsocket: () => ipcRenderer.invoke('start-websocket'),
  getAuth: () => ipcRenderer.invoke('get-auth'),
  getAllMessages: () => ipcRenderer.invoke('get-all-messages'),
  onReceivedMessage: (callback) => ipcRenderer.on('websocket-message', (_event, value) => {
    callback(value);
  }),
  onWebsocketOpened: (callback) => ipcRenderer.on('websocket-open', (_event) => {
    callback();
  }),
})