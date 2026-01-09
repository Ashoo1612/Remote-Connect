const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const robot = require('@jitsi/robotjs');

let mainWindow;
let isControlEnabled = false;
let overlayWindows = [];

function createOverlay(mode = 'black', htmlContent = '') {
  const displays = screen.getAllDisplays();
  
  displays.forEach((display, index) => {
    const overlay = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      movable: false,
      fullscreen: true,
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setVisibleOnAllWorkspaces(true);
    overlay.setIgnoreMouseEvents(true);
    
    const content = mode === 'html' && htmlContent 
      ? htmlContent 
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              background: #000;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              color: #fff;
            }
            .message {
              text-align: center;
              padding: 40px;
            }
            h1 { font-size: 32px; margin-bottom: 16px; }
            p { font-size: 18px; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>Remote Session in Progress</h1>
            <p>Your screen is being controlled remotely</p>
          </div>
        </body>
        </html>
      `;
    
    overlay.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(content));
    overlayWindows.push(overlay);
  });
}

function disposeOverlays() {
  overlayWindows.forEach(overlay => {
    if (!overlay.isDestroyed()) {
      overlay.close();
    }
  });
  overlayWindows = [];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 150, height: 150 }
  });
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }));
});

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workAreaSize;
});

ipcMain.on('set-control-enabled', (event, enabled) => {
  isControlEnabled = enabled;
  console.log('Remote control enabled:', enabled);
});

ipcMain.on('mouse-move', (event, { x, y }) => {
  if (!isControlEnabled) return;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const targetX = Math.round(x * width);
    const targetY = Math.round(y * height);
    robot.moveMouse(targetX, targetY);
  } catch (err) {
    console.error('Mouse move error:', err);
  }
});

ipcMain.on('mouse-click', (event, { x, y, button }) => {
  if (!isControlEnabled) return;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const targetX = Math.round(x * width);
    const targetY = Math.round(y * height);
    robot.moveMouse(targetX, targetY);
    
    const mouseButton = button === 2 ? 'right' : 'left';
    robot.mouseClick(mouseButton);
  } catch (err) {
    console.error('Mouse click error:', err);
  }
});

ipcMain.on('mouse-scroll', (event, { deltaX, deltaY }) => {
  if (!isControlEnabled) return;
  try {
    const scrollAmount = Math.round(deltaY / 10) || 1;
    robot.scrollMouse(0, -scrollAmount);
  } catch (err) {
    console.error('Mouse scroll error:', err);
  }
});

const keyMap = {
  'Enter': 'enter',
  'Backspace': 'backspace',
  'Tab': 'tab',
  'Escape': 'escape',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'Delete': 'delete',
  'Home': 'home',
  'End': 'end',
  'PageUp': 'pageup',
  'PageDown': 'pagedown',
  'Control': 'control',
  'Shift': 'shift',
  'Alt': 'alt',
  'Meta': 'command',
  ' ': 'space',
  'F1': 'f1',
  'F2': 'f2',
  'F3': 'f3',
  'F4': 'f4',
  'F5': 'f5',
  'F6': 'f6',
  'F7': 'f7',
  'F8': 'f8',
  'F9': 'f9',
  'F10': 'f10',
  'F11': 'f11',
  'F12': 'f12',
};

ipcMain.on('key-event', (event, { key, eventType, ctrlKey, shiftKey, altKey }) => {
  if (!isControlEnabled) return;
  try {
    if (eventType === 'keydown') {
      const modifiers = [];
      if (ctrlKey) modifiers.push('control');
      if (shiftKey) modifiers.push('shift');
      if (altKey) modifiers.push('alt');
      
      const mappedKey = keyMap[key];
      if (mappedKey) {
        robot.keyTap(mappedKey, modifiers);
      } else if (key.length === 1) {
        if (modifiers.length > 0) {
          robot.keyTap(key.toLowerCase(), modifiers);
        } else {
          robot.typeString(key);
        }
      }
    }
  } catch (err) {
    console.error('Key event error:', err);
  }
});

ipcMain.on('blank-screen', (event, { enabled, mode, html }) => {
  console.log('Blank screen:', enabled, mode);
  if (enabled) {
    disposeOverlays();
    createOverlay(mode, html);
  } else {
    disposeOverlays();
  }
});

ipcMain.handle('get-blank-status', () => {
  return overlayWindows.length > 0;
});
