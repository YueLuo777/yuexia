const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xinyuexiaWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  reload: () => ipcRenderer.invoke('window:reload'),
});
