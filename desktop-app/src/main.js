const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const { mouse, keyboard, Key, Button, Point } = require('@nut-tree/nut-js');

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
    
    overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
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

ipcMain.on('mouse-move', async (event, { x, y }) => {
  if (!isControlEnabled) return;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const targetX = Math.round(x * width);
    const targetY = Math.round(y * height);
    await mouse.setPosition(new Point(targetX, targetY));
  } catch (err) {
    console.error('Mouse move error:', err);
  }
});

ipcMain.on('mouse-click', async (event, { x, y, button }) => {
  if (!isControlEnabled) return;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const targetX = Math.round(x * width);
    const targetY = Math.round(y * height);
    await mouse.setPosition(new Point(targetX, targetY));
    
    const mouseButton = button === 2 ? Button.RIGHT : Button.LEFT;
    await mouse.click(mouseButton);
  } catch (err) {
    console.error('Mouse click error:', err);
  }
});

ipcMain.on('mouse-scroll', async (event, { deltaX, deltaY }) => {
  if (!isControlEnabled) return;
  try {
    const scrollAmount = Math.min(Math.abs(Math.round(deltaY / 10)), 10) || 1;
    if (deltaY > 0) {
      await mouse.scrollDown(scrollAmount);
    } else if (deltaY < 0) {
      await mouse.scrollUp(scrollAmount);
    }
  } catch (err) {
    console.error('Mouse scroll error:', err);
  }
});

const keyMap = {
  'Enter': Key.Enter,
  'Backspace': Key.Backspace,
  'Tab': Key.Tab,
  'Escape': Key.Escape,
  'ArrowUp': Key.Up,
  'ArrowDown': Key.Down,
  'ArrowLeft': Key.Left,
  'ArrowRight': Key.Right,
  'Delete': Key.Delete,
  'Home': Key.Home,
  'End': Key.End,
  'PageUp': Key.PageUp,
  'PageDown': Key.PageDown,
  'Control': Key.LeftControl,
  'Shift': Key.LeftShift,
  'Alt': Key.LeftAlt,
  'Meta': Key.LeftSuper,
  ' ': Key.Space,
  'F1': Key.F1,
  'F2': Key.F2,
  'F3': Key.F3,
  'F4': Key.F4,
  'F5': Key.F5,
  'F6': Key.F6,
  'F7': Key.F7,
  'F8': Key.F8,
  'F9': Key.F9,
  'F10': Key.F10,
  'F11': Key.F11,
  'F12': Key.F12,
};

ipcMain.on('key-event', async (event, { key, eventType, ctrlKey, shiftKey, altKey }) => {
  if (!isControlEnabled) return;
  try {
    if (eventType === 'keydown') {
      const modifiers = [];
      if (ctrlKey) modifiers.push(Key.LeftControl);
      if (shiftKey) modifiers.push(Key.LeftShift);
      if (altKey) modifiers.push(Key.LeftAlt);
      
      const mappedKey = keyMap[key];
      if (mappedKey) {
        if (modifiers.length > 0) {
          await keyboard.pressKey(...modifiers, mappedKey);
          await keyboard.releaseKey(...modifiers, mappedKey);
        } else {
          await keyboard.pressKey(mappedKey);
          await keyboard.releaseKey(mappedKey);
        }
      } else if (key.length === 1) {
        await keyboard.type(key);
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
