/**
 * ServerRuntime — state machine for a single Minecraft server.
 *
 * Manages the lifecycle of one server instance and delegates process
 * control to MinecraftProcess. This is the middle layer:
 *   ServerManager → ServerRuntime → MinecraftProcess
 *
 * State transitions:
 *   stopped  → starting  (start() called)
 *   starting → running   (server startup detected in logs)
 *   running  → stopping  (stop() called)
 *   stopping → stopped   (process exited)
 *   starting → stopped   (startup failed)
 *   running  → stopped   (process crashed)
 */

import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "./config";
import { Logger } from "./logger";
import { MinecraftProcess, type ProcessOptions } from "./minecraft-process";
import type { ServerInfo, ServerState, ServerLogEntry } from "../types/server";

export type ProcessFactory = (
  config: ConfigService,
  logger: Logger,
) => MinecraftProcess;

const DEFAULT_JVM_ARGS = ["-Xms1G", "-Xmx4G"];
const DEFAULT_PORT = 25565;
const DEFAULT_MAX_PLAYERS = 20;

/** Known server JAR filenames, checked in order. */
const SERVER_JAR_NAMES = [
  "paper.jar",
  "purpur.jar",
  "spigot.jar",
  "server.jar",
  "minecraft_server.jar",
  "fabric-server.jar",
  "forge-server.jar",
];

/**
 * Find a server JAR in the project directory.
 * Returns the first match found, or null.
 */
function findServerJar(projectDir: string): string | null {
  for (const name of SERVER_JAR_NAMES) {
    const jarPath = path.join(projectDir, name);
    if (fs.existsSync(jarPath)) return jarPath;
  }
  return null;
}

/**
 * Try to read server.properties from the project directory.
 * Returns a partial map of known keys.
 */
function readServerProperties(projectDir: string): Record<string, string> {
  const propsPath = path.join(projectDir, "server.properties");
  const result: Record<string, string> = {};

  try {
    const content = fs.readFileSync(propsPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  } catch {
    // File doesn't exist yet or can't be read — return empty
  }

  return result;
}

export class ServerRuntime {
  private name: string;
  private projectDir: string;
  private config: ConfigService;
  private logger: Logger;
  private process: MinecraftProcess;
  private state: ServerState = "stopped";
  private createdAt: string;
  private port: number;
  private maxPlayers: number;

  constructor(
    name: string,
    projectDir: string,
    config: ConfigService,
    logger: Logger,
    processFactory?: ProcessFactory,
  ) {
    this.name = name;
    this.projectDir = projectDir;
    this.config = config;
    this.logger = logger;
    this.process = processFactory
      ? processFactory(config, logger)
      : new MinecraftProcess(config, logger);

    this.createdAt = new Date().toISOString();
    this.port = DEFAULT_PORT;
    this.maxPlayers = DEFAULT_MAX_PLAYERS;

    // Try to load properties from existing server
    this.loadProperties();
  }

  // ── Getters ────────────────────────────────────────────────────

  getName(): string {
    return this.name;
  }

  getState(): ServerState {
    return this.state;
  }

  getLogs(): ServerLogEntry[] {
    return this.process.getLogs();
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.state === "running" || this.state === "starting") {
      throw new Error(`Server "${this.name}" is already ${this.state}.`);
    }

    const jarPath = findServerJar(this.projectDir);
    if (!jarPath) {
      throw new Error(
        `No server JAR found in "${this.projectDir}". ` +
          `Expected one of: ${SERVER_JAR_NAMES.join(", ")}`,
      );
    }

    this.state = "starting";
    this.logger.info(`Starting server "${this.name}" from ${jarPath}`);

    // Read JVM args from beacon.yml if present, or use defaults
    const jvmArgs = this.readJVMOptions();

    const opts: ProcessOptions = {
      jarPath,
      projectDir: this.projectDir,
      jvmArgs,
      port: this.port,
      maxPlayers: this.maxPlayers,
    };

    try {
      this.process.spawn(opts);
      this.state = "running";
    } catch (err: any) {
      this.state = "stopped";
      throw new Error(
        `Failed to start server "${this.name}": ${err.message}`,
      );
    }
  }

  async stop(): Promise<void> {
    if (this.state === "stopped") return;
    if (this.state !== "running" && this.state !== "starting") {
      throw new Error(
        `Server "${this.name}" is in state "${this.state}" and cannot be stopped.`,
      );
    }

    this.state = "stopping";
    this.logger.info(`Stopping server "${this.name}"...`);

    try {
      await this.process.stop();
    } catch (err: any) {
      this.logger.error(`Error stopping server "${this.name}": ${err.message}`);
    }

    this.state = "stopped";
  }

  async restart(): Promise<void> {
    this.logger.info(`Restarting server "${this.name}"...`);
    await this.stop();
    await this.start();
  }

  kill(): void {
    this.logger.info(`Killing server "${this.name}"...`);
    this.process.kill();
    this.state = "stopped";
  }

  // ── Info ───────────────────────────────────────────────────────

  getInfo(): ServerInfo {
    this.loadProperties();

    return {
      name: this.name,
      path: this.projectDir,
      state: this.state,
      pid: this.process.getPid(),
      port: this.port,
      version: null, // would require parsing the JAR manifest
      players: 0,    // would require RCON or query protocol
      maxPlayers: this.maxPlayers,
      uptime: this.process.getUptime(),
      createdAt: this.createdAt,
    };
  }

  // ── Internal ───────────────────────────────────────────────────

  /** Load server.properties values. */
  private loadProperties(): void {
    const props = readServerProperties(this.projectDir);
    if (props["server-port"]) {
      this.port = parseInt(props["server-port"], 10) || DEFAULT_PORT;
    }
    if (props["max-players"]) {
      this.maxPlayers = parseInt(props["max-players"], 10) || DEFAULT_MAX_PLAYERS;
    }
  }

  /** Read JVM options from beacon.yml. */
  private readJVMOptions(): string[] {
    try {
      const configPath = path.join(this.projectDir, "beacon.yml");
      const content = fs.readFileSync(configPath, "utf-8");
      const match = content.match(/^\s*ram:\s*(.+)$/m);
      if (match) {
        const ram = match[1].trim();
        return [`-Xms${ram}`, `-Xmx${ram}`];
      }
    } catch {
      // beacon.yml missing or unreadable — use defaults
    }
    return DEFAULT_JVM_ARGS;
  }
}
