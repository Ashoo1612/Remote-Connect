# RemoteDesk - Remote Desktop Web Application

## Overview

RemoteDesk is a web-based remote desktop application that enables secure screen sharing and remote assistance between computers. The application uses WebRTC for peer-to-peer connections and WebSocket signaling for connection establishment. Users connect via 9-digit Partner IDs (similar to TeamViewer), with features including session management, saved connections, file transfers, and in-session chat.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Design System**: Fluent Design principles with Inter font family and JetBrains Mono for technical data
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Real-time Communication**: WebSocket server (ws library) for signaling
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Session Handling**: WebSocket-based device registration and connection management

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod schemas with drizzle-zod integration
- **Current Storage**: In-memory storage (MemStorage class) for development
- **Database Config**: PostgreSQL ready via DATABASE_URL environment variable

### Real-time Features
- **WebRTC**: Peer-to-peer screen sharing and data channels
- **Signaling Server**: WebSocket at `/ws` path for connection negotiation
- **Connection Flow**: Join → Request → Accept/Decline → WebRTC offer/answer exchange

### Key Data Models
- **Device**: Represents a machine with Partner ID, online status, name
- **Session**: Active connection between host and viewer devices
- **ChatMessage**: In-session messaging
- **FileTransfer**: File transfer tracking with progress
- **SavedConnection**: User's bookmarked connections

### Project Structure
```
client/           # React frontend (web app - visual guidance only)
  src/
    components/   # UI components including shadcn/ui
    pages/        # Route pages (dashboard, session, settings, etc.)
    hooks/        # Custom React hooks (useWebRTC, useToast)
    lib/          # Utilities (device-store, queryClient)
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API routes and WebSocket handling
  storage.ts      # Data storage interface
shared/           # Shared types and schemas
  schema.ts       # Zod schemas for all data types
desktop-app/      # Electron desktop app (full remote control)
  src/
    main.js       # Electron main process with nut.js input injection
    preload.js    # Context bridge for secure IPC
    renderer/     # Frontend UI for desktop app
  package.json    # Electron and nut-tree dependencies
```

### Desktop App (Full Remote Control)
The desktop-app folder contains an Electron application that enables:
- **Full mouse control**: Movement, clicks, scrolling via @nut-tree/nut-js
- **Full keyboard control**: Key injection at OS level
- **Screen sharing**: Using Electron's desktopCapturer
- **Privacy screen**: Blank remote screen with custom message (controller-triggered overlay)
- **Same signaling server**: Connects to the web app's WebSocket server

To build: Push to GitHub and use Actions auto-build, or manually: `cd desktop-app && npm install && npm run build`
See `desktop-app/GITHUB_SETUP.md` for GitHub Actions setup instructions.

## External Dependencies

### Database
- PostgreSQL (configured via DATABASE_URL)
- Drizzle Kit for migrations (`db:push` script)

### UI Libraries
- Radix UI primitives (full suite: dialogs, dropdowns, tabs, etc.)
- Lucide React for icons
- Embla Carousel for carousels
- Recharts for charts
- React Day Picker for calendar

### Real-time
- ws (WebSocket library)
- Native WebRTC APIs in browser

### Build & Development
- Vite with hot module replacement
- esbuild for production server bundling
- TypeScript with strict mode

### Replit-specific
- @replit/vite-plugin-runtime-error-modal
- @replit/vite-plugin-cartographer (dev only)
- @replit/vite-plugin-dev-banner (dev only)