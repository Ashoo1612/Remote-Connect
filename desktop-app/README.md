# RemoteDesk Desktop App

A Windows desktop application for full remote control capabilities.

## Features

- **Screen Sharing**: Share your entire screen or specific windows
- **Full Remote Control**: Mouse movement, clicks, and keyboard input
- **Secure Connections**: Uses same WebRTC peer-to-peer as web version
- **Partner ID System**: Connect using 9-digit IDs

## Requirements

- Node.js 18 or higher
- Windows 10/11

## Building the App

### 1. Install Dependencies

```bash
cd desktop-app
npm install
```

### 2. Configure Server URL

Edit `src/renderer/app.js` and replace `YOUR_SERVER_URL` with your actual server URL:

```javascript
const SERVER_URL = 'wss://your-server.replit.app/ws';
```

### 3. Run in Development

```bash
npm start
```

### 4. Build Windows Executable

```bash
npm run build
```

The built `.exe` will be in the `dist` folder.

## How It Works

1. **Sharer** runs the app and shares their screen
2. **Controller** connects using the Partner ID
3. Controller can see the sharer's screen and control mouse/keyboard
4. Sharer can enable/disable remote control at any time

## Security

- All connections are peer-to-peer (WebRTC)
- Screen sharing requires explicit user consent
- Remote control must be enabled by the sharer
- No data passes through servers after connection established

## Troubleshooting

### Mouse/Keyboard not working
- Make sure "Remote Control" toggle is ON (sharer must enable it)
- Run the app as Administrator for full system access

### Connection issues
- Check that both users have internet access
- Verify the server URL is correct
- Try refreshing the connection
