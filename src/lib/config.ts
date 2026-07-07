import * as path from "path";
import * as os from "os";

/**
 * ConfigService — central authority for all BeaconOS paths and settings.
 *
 * No other module should hardcode ~/.beaconos or any filesystem path.
 * This is injected into every service that needs path resolution.
 */
export class ConfigService {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? path.join(os.homedir(), ".beaconos");
  }

  // ── Directories ─────────────────────────────────────────────────

  /** Top-level data directory (~/.beaconos by default) */
  getDataDirectory(): string {
    return this.dataDir;
  }

  /** Where user account JSON is stored */
  getUsersDirectory(): string {
    return path.join(this.dataDir, "users");
  }

  /** Where log files are written */
  getLogDirectory(): string {
    return path.join(this.dataDir, "logs");
  }

  /** Where server project directories live (from config or default) */
  getServerDirectory(): string {
    return path.join(os.homedir(), "BeaconServers");
  }

  // ── File paths ───────────────────────────────────────────────────

  /** Path to the user accounts file */
  getUsersFilePath(): string {
    return path.join(this.getUsersDirectory(), "users.json");
  }

  /** Path to the main system config file */
  getConfigFilePath(): string {
    return path.join(this.dataDir, "config.yml");
  }

  /** Path to the dashboard config (port, theme, etc.) */
  getDashboardConfigPath(): string {
    return path.join(this.dataDir, "dashboard.json");
  }

  /** Path to the server process state file (PID tracking) */
  getServerStatePath(serverName: string): string {
    return path.join(this.dataDir, "run", `${serverName}.json`);
  }

  // ── Derived ──────────────────────────────────────────────────────

  /** Default port for the API / dashboard server */
  getDefaultApiPort(): number {
    return 3001;
  }

  /** Host to bind the API server to */
  getApiHost(): string {
    return "127.0.0.1";
  }

  /** Prefix for all API routes */
  getApiPrefix(): string {
    return "/api";
  }
}
