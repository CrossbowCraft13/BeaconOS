/**
 * Types for the BeaconOS server lifecycle management system.
 *
 * The hierarchy is:
 *   ServerManager → ServerRuntime → MinecraftProcess
 *
 * Each layer has a single responsibility and receives its
 * dependencies via constructor injection.
 */

// ── Server states ──────────────────────────────────────────────────

/** Possible states for a managed server runtime. */
export type ServerState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "crashed";

// ── Server info (for API responses and CLI) ────────────────────────

export interface ServerInfo {
  /** Human-readable server name (directory name). */
  name: string;
  /** Absolute path to the server project directory. */
  path: string;
  /** Current lifecycle state. */
  state: ServerState;
  /** Process PID, or null if not running. */
  pid: number | null;
  /** Minecraft server port. */
  port: number;
  /** Server software version (e.g., "1.20.4"). */
  version: string | null;
  /** Current online player count. */
  players: number;
  /** Maximum player count from server.properties. */
  maxPlayers: number;
  /** Uptime in seconds, or null if not running. */
  uptime: number | null;
  /** ISO-8601 timestamp of when the project was created. */
  createdAt: string;
}

// ── Logging ────────────────────────────────────────────────────────

export interface ServerLogEntry {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Log level. */
  level: string;
  /** Log message content. */
  message: string;
}

// ── API request types ──────────────────────────────────────────────

export interface ServerCreateRequest {
  name: string;
  port?: number;
  maxPlayers?: number;
  ram?: string;
}

// ── Events (for future event emitter / WebSocket use) ──────────────

export type ServerEventType = "stateChange" | "log" | "error";

export interface ServerEvent {
  type: ServerEventType;
  serverName: string;
  timestamp: string;
  data: unknown;
}
