<img width="2554" height="1265" alt="BeaconOS Social Preview" src="https://github.com/user-attachments/assets/a8895da0-934d-4ac2-bcbe-8a87a1ab1a42" />

# BeaconOS

A modern command-line toolkit and web dashboard for creating and managing Minecraft server projects.

> **Current Release:** v1.0.0

---

## Features

### v1.0 Foundation

BeaconOS provides a complete server management platform:

| Feature | Status |
|---|---|
| **Server Project Creation** | Create structured Minecraft server projects with one command |
| **Server Lifecycle** | Start, stop, restart, and kill server processes |
| **Web Dashboard** | Full SPA dashboard with purple/orange theme, light/dark mode |
| **Authentication** | JWT-based auth with refresh tokens, user accounts, role-based permissions |
| **System Monitoring** | Real-time CPU, RAM, Disk, Network monitoring |
| **Package Manager** | Install plugins from a curated registry of 60+ packages |
| **File Manager** | Browse, edit, upload, and delete server files via the dashboard |
| **Settings** | Theme toggle, server defaults, profile management |
| **Log Viewer** | System and server log viewer with level filtering |
| **REST API** | Full JSON API backing the dashboard and CLI |

### Roadmap

- Minecraft server software installation (Paper, Fabric, Forge)
- Scheduled backups and automatic updates
- Docker integration
- Live server console via WebSocket
- Multi-node cluster management
- ***A fully fledged operating system***

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/CrossbowCraft13/BeaconOS.git
cd BeaconOS
npm install
npm run build
```

### Commands

```bash
# Create a new server project
beaconos create MyServer

# Start the web dashboard
beaconos dashboard
# Open http://127.0.0.1:3001

# Create an admin account
beaconos register admin mypassword

# Log in
beaconos login admin mypassword

# Start/stop a server
beaconos server start MyServer
beaconos server stop MyServer

# Monitor system resources
beaconos monitor

# Install a plugin
beaconos packages install MyServer luckperms

# Show status
beaconos status MyServer
```

### Development

```bash
npm run dev       # Run with ts-node
npm run build     # Compile TypeScript
npm run test      # Run tests
npm run test:watch # Watch mode
```

---

## Architecture

```
src/
  api/              — Express API server (composition root)
    middleware/      — JWT auth, error handling
    routes/         — Auth, servers, monitoring, files, config
  commands/         — CLI command handlers
  dashboard/        — Web dashboard SPA
    css/            — Purple/orange theme
    js/             — SPA pages (dashboard, servers, files, settings, logs)
  lib/              — Core services
    auth.ts         — Authentication (JWT, bcrypt, refresh tokens)
    config.ts       — ConfigService (centralized path management)
    server-manager.ts — Server lifecycle orchestration
    minecraft-process.ts — Java process wrapper
    monitor.ts      — System resource monitoring
    monitors/       — CPU, Memory, Disk, Network monitors
    package-manager.ts — Plugin management
    registry.ts     — Plugin registry (~60+ packages)
    logger.ts       — Logging (class-based + standalone functions)
    filesystem.ts   — File system utilities
  types/            — TypeScript interfaces
    config.ts       — Configuration types
    server.ts       — Server lifecycle types
    user.ts         — User and auth types
    api.ts          — API response types
  beacon/           — Python CLI (installer and interactive menus)
```

---

## API Overview

All endpoints return JSON. Authentication uses `Authorization: Bearer <token>`.

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server health check |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Get JWT tokens |
| `GET /api/auth/me` | Current user profile |
| `GET /api/servers` | List all servers |
| `POST /api/servers/:name/start` | Start a server |
| `POST /api/servers/:name/stop` | Stop a server |
| `POST /api/servers/:name/kill` | Kill a server process |
| `GET /api/monitoring/stats` | System resource snapshot |
| `GET /api/files?server=X&path=Y` | Read/list server files |
| `GET /api/config` | Read system configuration |

---

## Technologies

### Backend
- TypeScript
- Node.js
- Express
- jsonwebtoken / bcryptjs

### Frontend
- Vanilla JavaScript (SPA, no framework)
- CSS custom properties (theming)

### Testing
- Vitest
- Supertest

### CLI
- Python (installer)
- TypeScript (management)

---

## Contributing

BeaconOS is currently in active development.

Bug reports, feature suggestions, and pull requests are welcome.

---

## License

MIT License

---

Built with ❤️ using TypeScript.
