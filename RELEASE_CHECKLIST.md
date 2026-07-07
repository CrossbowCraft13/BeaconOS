# BeaconOS v1.0 Release Checklist

> Use this checklist before tagging any v1.0 release candidate.
> Every item must be verified or explicitly documented as a known limitation.

---

## 1. Fresh Install — Clean Machine

**Goal:** A user with no prior BeaconOS installation can go from zero to a running dashboard in under 5 minutes.

- [ ] **Clone and build** — `git clone`, `npm install`, `npm run build` succeeds on a machine with only Node.js 18+ installed
- [ ] **No missing dependencies** — No native build tools (gcc, make, python) required beyond Node.js/npm
- [ ] **First-run experience** — `beaconos dashboard` starts the server without manual configuration
- [ ] **Default admin creation** — First launch creates an admin account; password is printed to console once
- [ ] **Login works** — Dashboard login page accepts the auto-generated credentials
- [ ] **Dashboard loads** — All dashboard pages render without JavaScript errors
- [ ] **Terminal output** — No error messages or stack traces visible in the terminal during startup

---

## 2. Upgrade from Previous Beta

**Goal:** Users of v0.5.0-beta can upgrade without data loss or manual migration.

- [ ] **Data directory preserved** — `~/.beaconos/` contents survive upgrade (users, config, JWT secret)
- [ ] **Existing server projects recognised** — `beaconos server list` shows servers created under the beta
- [ ] **Existing users can log in** — Credentials created under the beta still work
- [ ] **Package manifests intact** — `packages.json` in server projects is unmodified
- [ ] **beacon.yml files unmodified** — Existing server config files are not rewritten
- [ ] **Backward-compatible API** — v0.5 CLI commands produce equivalent output (or graceful deprecation notice)
- [ ] **Breaking changes documented** — Any incompatible changes are listed in release notes with migration steps

---

## 3. Security Audit

**Goal:** BeaconOS follows security best practices for a server management platform.

### Credentials & Secrets

- [ ] **Passwords never logged** — Password values never appear in terminal output, log files, or API responses
- [ ] **Passwords not stored in plaintext** — Only bcrypt hashes in `users.json`
- [ ] **JWT secret not hardcoded** — Generated once at first run, persisted to `~/.beaconos/jwt-secret`
- [ ] **Default admin password** — Auto-generated, random, printed once to console, never stored in code
- [ ] **No hardcoded credentials** — Zero credentials in source code, config files, or environment defaults

### Network & Paths

- [ ] **Default ports configurable** — API port (3001) overridable via command argument (`dashboard <port>`)
- [ ] **API binds to localhost** — Default host is `127.0.0.1`, not `0.0.0.0`
- [ ] **No hardcoded filesystem paths** — All paths resolved through ConfigService, nothing hardcoded
- [ ] **Path traversal prevented** — File API validates all paths against server project directory

### Authentication

- [ ] **Tokens expire** — Access tokens expire after 15 minutes by default
- [ ] **Refresh tokens rotate** — Old refresh token invalidated on each refresh
- [ ] **Role enforcement** — Admin-only endpoints (config write) return 403 for non-admin users
- [ ] **Invalid tokens rejected** — Expired, malformed, or revoked tokens return 401

---

## 4. Configuration Verification

**Goal:** All configuration is explicit, validated, and documented.

- [ ] **ConfigService is the single source of truth** — No module reads `~/.beaconos` paths directly
- [ ] **Config API validates input** — Unknown keys rejected, types validated, port ranges enforced
- [ ] **Theme preference persists** — Light/dark theme saved to `dashboard.json` and restored on reload
- [ ] **Default values documented** — Every configurable value has a documented default
- [ ] **Config survives restart** — Changes made via settings page are still present after server restart

---

## 5. Cross-Browser Dashboard Test

**Goal:** The dashboard renders and functions correctly in all major browsers.

### Test each page in each browser:
- [ ] Login page
- [ ] Dashboard overview (stats load, server table renders)
- [ ] Servers page (list renders, action buttons visible)
- [ ] Files page (directory listing, file editor, upload modal)
- [ ] Settings page (theme toggle, profile, server defaults)
- [ ] Logs page (filter buttons, log entries)

### Test each browser:
- [ ] **Chrome** (latest stable)
- [ ] **Firefox** (latest stable)
- [ ] **Edge** (latest stable)

### Responsive design:
- [ ] **Desktop (1920×1080)** — Full layout, sidebar visible
- [ ] **Tablet (768px)** — Sidebar collapses, content readable
- [ ] **Mobile (375px)** — Stacked layout, no horizontal overflow

### Accessibility:
- [ ] Forms have visible labels
- [ ] Error messages are screen-reader friendly (text, not just colour)
- [ ] Colour contrast meets WCAG AA for text (4.5:1 ratio)

---

## 6. Server Lifecycle Persistence

**Goal:** Running servers are documented or handled when BeaconOS restarts.

- [ ] **Behaviour documented** — The release notes state whether running servers survive a restart
- [ ] **State tracking** — Server state (running/stopped) is tracked in memory and logged
- [ ] **Restart behaviour** — If servers are stopped on restart, this is acknowledged; if they resume, tested
- [ ] **PID file** — Server PIDs are tracked in `~/.beaconos/run/<name>.json` for process recovery

*Known limitation: v1.0 tracks server state in-memory. Running servers do not survive a BeaconOS restart. T
his is documented in the release notes.*

---

## 7. Backup & Restore

**Goal:** Server data can be backed up and restored.

- [ ] **Data directory identified** — `~/.beaconos/` contains all system data (users, configs, secrets)
- [ ] **Server projects identified** — Server project directories are self-contained (can be copied independently)
- [ ] **Restore procedure documented** — Steps to restore from backup are in the README or release notes
- [ ] **Backup tested** — Full backup of `~/.beaconos/` + server directories followed by restore to clean machine
- [ ] **JWT secret included** — Backup instructions mention including `jwt-secret` to preserve sessions

---

## 8. Test Suite

**Goal:** The automated test suite catches regressions.

- [ ] **All tests pass** — `npm run test` exits with code 0
- [ ] **No flaky tests** — Full suite passes 3 consecutive runs without failure
- [ ] **Test coverage** — PR 1, 2, and 3 features have coverage
  - Auth: register, login, refresh, logout, verify, role check
  - Server lifecycle: register, unregister, scan, state machine
  - Monitoring: CPU, memory, disk, network sampling, history
  - Files: list, read, write, delete, upload, path traversal
  - Config: read, write, validation, admin-only enforcement
  - API: health, 404 handling, auth middleware, error formatting

---

## 9. CLI Verification

**Goal:** Every CLI command works and produces helpful output.

- [ ] `beaconos` — Shows help
- [ ] `beaconos help` — Shows help
- [ ] `beaconos version` — Shows version string
- [ ] `beaconos create <name>` — Creates project directory structure
- [ ] `beaconos server list` — Lists servers (or "none found" message)
- [ ] `beaconos server start <name>` — Attempts to start (requires Java + JAR; fails gracefully otherwise)
- [ ] `beaconos server stop <name>` — Stops server (or "not running" message)
- [ ] `beaconos server logs <name>` — Shows recent log entries
- [ ] `beaconos monitor` — Shows system resource usage
- [ ] `beaconos register <user> <pass>` — Creates user
- [ ] `beaconos login <user> <pass>` — Authenticates and stores token
- [ ] `beaconos whoami` — Shows current user
- [ ] `beaconos logout` — Clears stored session
- [ ] `beaconos dashboard [port]` — Starts HTTP server
- [ ] `beaconos packages` — Shows package subcommands
- [ ] **Unknown commands** — Show "Unknown command" message and help
- [ ] **Missing arguments** — Subcommands show usage rather than crashing

---

## 10. Error Handling

**Goal:** Every failure path produces a meaningful error message and does not crash the process.

- [ ] **API errors return JSON** — All errors return `{ error, message }` format
- [ ] **HTTP status codes correct** — 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (internal)
- [ ] **Malformed JSON body** — Returns 400 with `"Invalid JSON in request body."`
- [ ] **Missing required fields** — Field-level 400 with descriptive message
- [ ] **Invalid auth token** — Returns 401, doesn't crash
- [ ] **Expired token** — Returns 401, client auto-refreshes (api.js)
- [ ] **Server JAR not found** — Start returns 400 with "No server JAR found" + list of checked filenames
- [ ] **Server already running** — Start returns 409 with "already running"
- [ ] **Dashboard static file missing** — Returns 404, doesn't crash the server
- [ ] **Log directory unwritable** — Graceful fallback (warn, don't crash)

---

## 11. README Install Test

**Goal:** A fresh user can install and run BeaconOS using only the README.

- [ ] **Prerequisites listed** — Node.js version requirement stated
- [ ] **Install commands copy-pasteable** — No manual editing required between `git clone` and `beaconos dashboard`
- [ ] **First-run steps documented** — What happens on first launch (default admin, password location)
- [ ] **Quick start covers the basic workflow** — Create server, start dashboard, log in
- [ ] **All CLI commands documented** — Every command has a usage example
- [ ] **API endpoints documented** — Key endpoints listed with example requests
- [ ] **Tested by a fresh user** — Someone who has never seen BeaconOS follows the README and succeeds

---

## 12. Build & Release

**Goal:** The release artifact is reproducible and tagged correctly.

- [ ] **Clean build** — `rm -rf node_modules dist && npm install && npm run build` succeeds
- [ ] **No npm audit warnings** — `npm audit` shows 0 critical or high vulnerabilities
- [ ] **Version bumped** — `src/lib/constants.ts` has correct version number
- [ ] **Git tag created** — `git tag v1.0.0` and `git push --tags`
- [ ] **Release notes written** — Summary of changes, upgrade instructions, known limitations
- [ ] **Dist folder clean** — `dist/` contains only built output, no stale files from previous builds

---

## Summary Checklist

```
□ Fresh install passes        □ Upgrade from beta works
□ No hardcoded paths          □ Default ports configurable
□ Passwords never logged      □ JWT secret configurable
□ Dashboard works in Chrome   □ Dashboard works in Firefox
□ Dashboard works in Edge     □ All API endpoints tested
□ All CLI commands tested     □ Error paths produce messages
□ Server restart documented   □ Backup/restore tested
□ README tested by fresh user □ All 139+ tests pass
□ Clean build succeeds        □ npm audit clean
□ Version bumped              □ Git tagged
□ Release notes written       □ Known limitations documented
```

---

## Release Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Lead Developer | | | |
| QA Tester | | | |
| Documentation Reviewer | | | |
| Final Approval | | | |
