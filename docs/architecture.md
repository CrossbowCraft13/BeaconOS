# BeaconOS Architecture

## Project Vision

BeaconOS is an operating system built specifically for Minecraft server hosting.

Rather than being a general-purpose Linux distribution, BeaconOS focuses on simplifying deployment, monitoring, automation, and management of Minecraft infrastructure.

---

# v1.0 Foundation Architecture

## Layered System Design

```
┌─────────────────────────────────────────────┐
│               Dashboard (SPA)               │
│   index.html · app.css · api.js · router.js │
│   dashboard.js · servers.js · files.js      │
│   settings.js · logs.js · auth.js           │
└──────────────────────┬──────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────┐
│           Express API Server                │
│   Middleware: auth (JWT) · error handler    │
│   Routes: auth · servers · monitoring       │
│           files · config · health           │
├─────────────────────────────────────────────┤
│           Service Layer                     │
│   AuthService · ServerManager · MonitorService│
│   ConfigService · Logger · UserStore        │
├─────────────────────────────────────────────┤
│           Process Layer                     │
│   ServerRuntime → MinecraftProcess          │
│   CpuMonitor · MemoryMonitor                │
│   DiskMonitor · NetworkMonitor              │
└─────────────────────────────────────────────┘
```

---

## Core Components

### Base Operating System

A lightweight Linux base optimized for server workloads.

Responsibilities:
- Boot process
- Package management
- Networking
- Security
- System services

---

### Beacon CLI (`beacon/` and `src/`)

The project has two CLI implementations with distinct roles:
- **Python CLI** (`beacon/`) — Interactive installer and setup menus using `rich` and `questionary`
- **TypeScript CLI** (`src/`) — Server management, package management, auth, monitoring, and the web dashboard

TypeScript CLI commands:

```
Server Management
  create <name>            Create a new BeaconOS server
  server list              List registered servers
  server start <name>      Start a server
  server stop <name>       Stop a server
  server restart <name>    Restart a server
  server kill <name>       Kill a server
  server logs <name>       Show server logs
  status [path]            Check a BeaconOS server folder

Monitoring
  monitor                  Show system resource usage

Packages
  packages                 Manage plugins and packages

Authentication
  register <user> [pass]   Create a new user account
  login <user> [pass]      Log into BeaconOS
  logout                   Clear stored session
  whoami                   Show current user info

Dashboard
  dashboard [port]         Start the BeaconOS Web Dashboard

General
  init                     Initialize BeaconOS
  version                  Show BeaconOS version
  help                     Show this menu
```

---

### Configuration System (`ConfigService`)

The `ConfigService` class (`src/lib/config.ts`) is the single authority for all BeaconOS filesystem paths:

```typescript
class ConfigService {
  getDataDirectory(): string        // ~/.beaconos
  getUsersDirectory(): string       // ~/.beaconos/users
  getLogDirectory(): string         // ~/.beaconos/logs
  getServerDirectory(): string      // ~/BeaconServers
  getUsersFilePath(): string        // ~/.beaconos/users/users.json
  getConfigFilePath(): string       // ~/.beaconos/config.yml
  getDashboardConfigPath(): string  // ~/.beaconos/dashboard.json
  getServerStatePath(name): string  // ~/.beaconos/run/{name}.json
  getDefaultApiPort(): number       // 3001
  getApiHost(): string             // 127.0.0.1
}
```

No module hardcodes filesystem paths. All paths are resolved through ConfigService.

---

### Authentication System

The auth system (`src/lib/auth.ts`) uses a layered design:

```
AuthService (business logic)
  ↓
UserStore (persistence)
  ↓
ConfigService + Logger (infrastructure)
```

- **JWT access tokens** — 15-minute expiry, contain userId + username + role
- **Refresh tokens** — 7-day opaque tokens stored per-user (max 5), rotated on each use
- **Password hashing** — bcryptjs with 12 salt rounds
- **User storage** — JSON file at `~/.beaconos/users/users.json`
- **Role model** — `admin` (full access) and `user` (limited access)
- **Default admin** — Auto-seeded on first run with a random password printed to console

---

### Server Lifecycle Management

The server process hierarchy (`src/lib/server-manager.ts`, `server-runtime.ts`, `minecraft-process.ts`):

```
ServerManager (orchestrates all servers, auto-discovers projects)
  └── ServerRuntime (state machine per server)
       └── MinecraftProcess (child_process wrapper)
```

**ServerRuntime state machine:**

```
stopped → starting → running → stopping → stopped
  ↑         ↓                      ↓
  └── ── ── ┘ (crashed or killed)
```

- **JAR auto-detection** — Checks for paper.jar, purpur.jar, spigot.jar, server.jar, etc.
- **Log ring buffer** — 500 most recent log entries per process
- **Graceful shutdown** — SIGTERM → 10s wait → SIGKILL
- **Server config** — Reads `server.properties` for port/max-players, `beacon.yml` for RAM allocation

---

### Monitoring System

The monitoring hierarchy (`src/lib/monitor.ts`, `monitors/`):

```
MonitorService (orchestrator, polling, history)
  ├── CpuMonitor     (os.cpus() delta)
  ├── MemoryMonitor  (os.totalmem / os.freemem)
  ├── DiskMonitor    (fs.statfs / fallback)
  └── NetworkMonitor (os.networkInterfaces)
```

- **CPU** — Delta-based measurement (first sample = 0, subsequent = actual %)
- **Memory** — Total, free, used in bytes
- **Disk** — Filesystem stats for the BeaconOS data directory
- **Network** — Active non-internal interface count
- **History buffer** — 120 samples per metric (10 min at 5s intervals)

---

### REST API

All API routes are prefixed with `/api` and return JSON responses.

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | No | Server health check |
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Get tokens |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/auth/logout` | POST | Yes | Invalidate refresh token |
| `/api/auth/me` | GET | Yes | Current user profile |
| `/api/servers` | GET | Yes | List all servers |
| `/api/servers/:name` | GET | Yes | Server info |
| `/api/servers/:name/logs` | GET | Yes | Server logs |
| `/api/servers/:name/start` | POST | Yes | Start server |
| `/api/servers/:name/stop` | POST | Yes | Stop server |
| `/api/servers/:name/restart` | POST | Yes | Restart server |
| `/api/servers/:name/kill` | POST | Yes | Kill server |
| `/api/monitoring/stats` | GET | Yes | System stats snapshot |
| `/api/monitoring/history` | GET | Yes | Historical metric data |
| `/api/files` | GET | Yes | List/read files |
| `/api/files/write` | POST | Yes | Write file |
| `/api/files/upload` | POST | Yes | Upload file |
| `/api/files` | DELETE | Yes | Delete file |
| `/api/config` | GET | Yes | Read configuration |
| `/api/config` | PUT | Admin | Update configuration |

---

### Web Dashboard

A single-page application served by the Express server from `src/dashboard/`:

```
src/dashboard/
  index.html            — HTML shell
  css/
    app.css             — Purple/orange theme, light/dark, responsive
  js/
    api.js              — Centralized fetch layer, auto-auth, auto-refresh
    auth.js             — Login/register forms, token management
    router.js           — Hash-based SPA router
    app.js              — Bootstrap and initialization
    dashboard.js        — Overview page with monitoring stats
    servers.js          — Server list with lifecycle controls
    files.js            — File manager with browse/edit/delete/upload
    settings.js         — Settings page with theme toggle
    logs.js             — System log viewer
```

The dashboard uses a **hash-based SPA router** (`#/` → dashboard, `#/servers` → servers, etc.) with zero build step. All API calls go through `api.js` which handles auth headers and automatic token refresh.

**Theme:** Purple/orange color scheme with light/dark toggle persisted in localStorage.

---

### Package Manager

The package manager (`src/lib/package-manager.ts`) handles Minecraft plugin installation from a curated registry (`src/lib/registry.ts`) with ~60+ plugins and support for direct URL installation.

---

## Dependency Injection Pattern

All major services use constructor-based dependency injection (no framework):

```typescript
class SomeService {
  constructor(
    private config: ConfigService,
    private logger: Logger,
    private store: UserStore,
  ) {}
}
```

Instantiation happens in `src/api/server.ts` (the composition root), which wires the entire dependency graph.

---

## Future Components

- Cluster management
- Multi-node deployments
- Marketplace
- Plugin repository
- Mobile companion app
- Live console (WebSocket)
- Docker integration
- Backup/restore scheduling
- Plugin framework
