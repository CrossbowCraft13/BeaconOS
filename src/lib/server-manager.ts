/**
 * ServerManager — orchestrates all registered Minecraft server runtimes.
 *
 * Scans the configured server directory for projects and manages their
 * lifecycle by delegating to individual ServerRuntime instances.
 *
 *   ServerManager → ServerRuntime → MinecraftProcess
 */

import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "./config";
import { Logger } from "./logger";
import { ServerRuntime } from "./server-runtime";
import type { ServerInfo, ServerState } from "../types/server";

export class ServerManager {
  private runtimes: Map<string, ServerRuntime> = new Map();
  private config: ConfigService;
  private logger: Logger;

  constructor(config: ConfigService, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  // ── Discovery ──────────────────────────────────────────────────

  /**
   * Scan the server directory for existing projects (directories with
   * a beacon.yml file) and register runtimes for each.
   */
  scanForServers(): void {
    const serverDir = this.config.getServerDirectory();
    if (!fs.existsSync(serverDir)) {
      this.logger.info(`Server directory ${serverDir} does not exist yet.`);
      return;
    }

    const entries = fs.readdirSync(serverDir, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectPath = path.join(serverDir, entry.name);
      const configPath = path.join(projectPath, "beacon.yml");

      if (fs.existsSync(configPath)) {
        this.registerServer(entry.name, projectPath);
        count++;
      }
    }

    if (count > 0) {
      this.logger.info(`Discovered ${count} server(s) in ${serverDir}`);
    }
  }

  /**
   * Register a server runtime. If a runtime already exists with
   * the same name it is replaced.
   */
  registerServer(name: string, projectDir: string): ServerRuntime {
    if (this.runtimes.has(name)) {
      this.logger.warning(`Replacing existing runtime for "${name}"`);
    }

    const runtime = new ServerRuntime(
      name,
      projectDir,
      this.config,
      this.logger,
    );

    this.runtimes.set(name, runtime);
    return runtime;
  }

  /**
   * Unregister a server runtime. If the server is running it is
   * killed first.
   */
  unregisterServer(name: string): void {
    const runtime = this.runtimes.get(name);
    if (!runtime) return;

    if (runtime.getState() === "running" || runtime.getState() === "starting") {
      this.logger.warning(`Killing "${name}" before unregistering`);
      runtime.kill();
    }

    this.runtimes.delete(name);
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async start(name: string): Promise<void> {
    const runtime = this.getRuntimeOrThrow(name);
    await runtime.start();
  }

  async stop(name: string): Promise<void> {
    const runtime = this.getRuntimeOrThrow(name);
    await runtime.stop();
  }

  async restart(name: string): Promise<void> {
    const runtime = this.getRuntimeOrThrow(name);
    await runtime.restart();
  }

  kill(name: string): void {
    const runtime = this.getRuntimeOrThrow(name);
    runtime.kill();
  }

  // ── Queries ────────────────────────────────────────────────────

  getServer(name: string): ServerInfo | undefined {
    const runtime = this.runtimes.get(name);
    return runtime ? runtime.getInfo() : undefined;
  }

  getAllServers(): ServerInfo[] {
    const servers: ServerInfo[] = [];
    for (const runtime of this.runtimes.values()) {
      servers.push(runtime.getInfo());
    }
    // Sort by name for consistent output
    servers.sort((a, b) => a.name.localeCompare(b.name));
    return servers;
  }

  getLogs(name: string): import("../types/server").ServerLogEntry[] {
    const runtime = this.getRuntimeOrThrow(name);
    return runtime.getLogs();
  }

  /** Number of running servers. */
  getRunningCount(): number {
    let count = 0;
    for (const runtime of this.runtimes.values()) {
      const state = runtime.getState();
      if (state === "running" || state === "starting") count++;
    }
    return count;
  }

  /** Total number of registered servers. */
  getTotalCount(): number {
    return this.runtimes.size;
  }

  // ── Internal ───────────────────────────────────────────────────

  private getRuntimeOrThrow(name: string): ServerRuntime {
    const runtime = this.runtimes.get(name);
    if (!runtime) {
      throw new Error(
        `Server "${name}" is not registered. ` +
          `Use "beaconos create ${name}" first.`,
      );
    }
    return runtime;
  }
}
