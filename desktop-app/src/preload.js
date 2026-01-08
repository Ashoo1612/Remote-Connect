const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  
  setControlEnabled: (enabled) => ipcRenderer.send('set-control-enabled', enabled),
  
  sendMouseMove: (x, y) => ipcRenderer.send('mouse-move', { x, y }),
  sendMouseClick: (x, y, button) => ipcRenderer.send('mouse-click', { x, y, button }),
  sendMouseScroll: (deltaX, deltaY) => ipcRenderer.send('mouse-scroll', { deltaX, deltaY }),
  sendKeyEvent: (key, eventType, ctrlKey, shiftKey, altKey) => 
    ipcRenderer.send('key-event', { key, eventType, ctrlKey, shiftKey, altKey }),
  
  blankScreen: (enabled, mode, html) => ipcRenderer.send('blank-screen', { enabled, mode, html }),
  getBlankStatus: () => ipcRenderer.invoke('get-blank-status'),
});
