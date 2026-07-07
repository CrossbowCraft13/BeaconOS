# BeaconOS v1.1.0 — Server Software Auto-Install

> **Tag:** v1.1.0
> **Released:** 2026-07-07

BeaconOS is a command-line toolkit and web dashboard for creating and managing Minecraft server projects. This release adds automatic Paper server software download.

---

## What's New in v1.1

### 🚀 Auto-Download Paper Server

When you run `beaconos server start <name>` for the first time and no server JAR is found, BeaconOS automatically downloads the latest Paper build from the official PaperMC API — no manual setup needed.

```
beaconos create MyServer
beaconos server start MyServer
# → Auto-downloads paper-26.2-10.jar (49.9 MB)
# → Starts the server
```

### 📥 Manual Software Install CLI

```
beaconos install-software MyServer
```

Downloads the latest Paper JAR into an existing server project. Replaces the existing paper.jar with the latest version.

### 🐛 Bug Fixes

- **create** now places servers in `~/BeaconServers/` (was current directory)
- **dashboard** no longer renders a blank screen on fresh install
- **install** script no longer hangs on `sudo npm link` when piped through curl
- **install** script now uses `sudo` correctly for all package manager commands
- **Permission denied** error fixed — `dist/index.js` now has the executable bit

---

## v1.0 Foundation (previous release)

### 🖥️ Web Dashboard

A full single-page application with a purple/orange theme and light/dark mode:

- **Dashboard overview** — Real-time system monitoring (CPU, RAM, Disk, Network)
- **Server management** — Start, stop, restart, and kill server instances from the browser
- **File manager** — Browse, edit, upload, and delete server files
- **Settings** — Theme toggle, server defaults, profile management
- **Log viewer** — System log viewer with level filtering

### 🔐 Authentication

- JWT-based authentication with access + refresh token rotation
- Role-based permissions (Admin / User)
- User accounts stored securely with bcrypt password hashing
- Auto-seeded admin account on first launch
- Session management with token refresh on expiry

### ⚙️ Server Lifecycle Management

- **ServerManager → ServerRuntime → MinecraftProcess** layered architecture
- Start, stop, restart, and kill server processes
- Graceful shutdown (SIGTERM → 10s timeout → SIGKILL)
- JAR auto-detection (paper.jar, purpur.jar, spigot.jar, server.jar, etc.)
- 500-entry ring buffer for process logs
- Auto-discovers existing server projects

### 📊 System Monitoring

- **CPU** — Delta-based measurement across all cores
- **Memory** — Total, used, and free RAM
- **Disk** — Filesystem usage for the BeaconOS data directory
- **Network** — Active interface count
- 120-sample history buffer per metric (10 min at 5s intervals)

### 📦 Package Manager

- Curated registry of 60+ Minecraft plugins
- Install from registry or direct URL
- List, search, and remove packages
- Manifest tracking per server project

### 🔧 CLI

| Command | Description |
|---|---|
| `create <name>` | Create a new server project |
| `install-software <name>` | Download Paper server software |
| `server list/start/stop/restart/kill/logs` | Server lifecycle management |
| `status [path]` | Check a server project |
| `monitor` | Show system resource usage |
| `packages install/remove/list/search` | Plugin management |
| `register/login/logout/whoami` | Authentication |
| `dashboard [port]` | Start web dashboard |
| `version`, `help`, `init` | General commands |

### 🌐 REST API

18 authenticated endpoints + health check:

- `GET /api/health` — Health check
- `POST /api/auth/register|login|refresh|logout` — Authentication
- `GET /api/auth/me` — User profile
- `GET /api/servers` — List servers
- `GET|POST /api/servers/:name/start|stop|restart|kill` — Lifecycle
- `GET /api/servers/:name/logs` — Server logs
- `GET /api/monitoring/stats|history` — System monitoring
- `GET|DELETE /api/files` — File management
- `POST /api/files/write|upload` — File write/upload
- `GET|PUT /api/config` — System configuration

---

## Upgrade Notes

### From v1.0.0

**Breaking changes:**
- Server projects created with v1.0's `create` command were placed in the current directory. In v1.1 they go to `~/BeaconServers/`. Move old projects there or use `beaconos status <path>` with an absolute path.

**Data preserved:**
- `~/.beaconos/` — all user accounts, config, and JWT secrets
- Server project directories — existing `beacon.yml` and server files unchanged
- Plugin manifests (`packages.json`) — untouched

**Migration steps:**
1. `git pull` or re-clone
2. `npm install && npm run build`
3. `beaconos dashboard` — starts on port 3001
4. Login with existing credentials

---

## Known Limitations

- **Server state is in-memory** — Running servers do not survive a BeaconOS restart
- **Live console** — Not yet implemented (requires WebSocket)
- **Docker integration** — Not yet implemented
- **Backup/restore** — Manual file copy only; no automated scheduling
- **Notifications** — Not yet implemented
- **Plugin framework** — Package manager exists; plugin hot-reload is future work
- **Multi-node** — Single-host only
- **Java required** — Server lifecycle commands require Java installed on the host

---

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/CrossbowCraft13/BeaconOS/main/install.sh | bash
```

Or via npm:

```bash
npm install -g beaconos
```

## Statistics

- **14 test files**, **139 tests** — all passing
- **19 CLI commands**
- **18 API endpoints**
- **60+ plugins** in the curated registry
- **~18,000 lines** of TypeScript, CSS, and HTML
- **Zero build framework** — dashboard is a vanilla JS SPA

---

## Contributors

- CrossbowCraft13 — Creator and lead developer

---

## License

MIT License — see [LICENSE](LICENSE)
