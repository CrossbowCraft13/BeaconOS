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
 * Base URL for the PaperMC API (v3).
 */
const PAPER_API_BASE = "https://fill.papermc.io/v3/projects/paper";
const PAPER_USER_AGENT = "BeaconOS/1.0 (https://github.com/CrossbowCraft13/BeaconOS)";

/**
 * Download the latest Paper server JAR into the project directory.
 *
 * Steps:
 *   1) Fetch the project info to get available versions
 *   2) Pick the latest stable version
 *   3) Fetch builds for that version
 *   4) Pick the latest build
 *   5) Download the JAR as paper.jar
 *
 * Returns the path to the downloaded JAR.
 */
async function downloadPaperJar(projectDir: string, logger: Logger): Promise<string> {
  const jarPath = path.join(projectDir, "paper.jar");
  const headers = { "User-Agent": PAPER_USER_AGENT };

  logger.info("Paper JAR not found — downloading latest Paper build…");

  // 1) Fetch project info to find the latest version
  const projectRes = await fetch(PAPER_API_BASE, { headers });
  if (!projectRes.ok) {
    throw new Error(
      `Failed to fetch Paper versions (HTTP ${projectRes.status}). ` +
      "Check your internet connection and try again.",
    );
  }
  const projectData: any = await projectRes.json();
  const versionGroups: Record<string, string[]> = projectData.versions;
  if (!versionGroups || Object.keys(versionGroups).length === 0) {
    throw new Error("Paper API returned no versions.");
  }

  // Collect all version strings, sorted by group then within group
  const allVersions: string[] = [];
  for (const group of Object.keys(versionGroups).sort()) {
    for (const v of versionGroups[group].sort()) {
      if (!v.includes("-")) { // skip -rc, -pre, -snapshot
        allVersions.push(v);
      }
    }
  }
  if (allVersions.length === 0) {
    throw new Error("Paper API returned no stable versions.");
  }
  const latestVersion = allVersions[allVersions.length - 1];
  logger.info(`  Latest Paper version: ${latestVersion}`);

  // 2) Fetch builds for the latest version
  const buildsRes = await fetch(
    `${PAPER_API_BASE}/versions/${encodeURIComponent(latestVersion)}/builds`,
    { headers },
  );
  if (!buildsRes.ok) {
    throw new Error(
      `Failed to fetch Paper builds (HTTP ${buildsRes.status}).`,
    );
  }
  const buildsBody: any = await buildsRes.json();
  const builds: any[] = Array.isArray(buildsBody) ? buildsBody : (buildsBody.builds ?? []);
  if (builds.length === 0) {
    throw new Error(`Paper API returned no builds for version ${latestVersion}.`);
  }

  // Prefer STABLE channel; fall back to the latest build
  const latestBuild = builds.filter((b: any) => b.channel === "STABLE").pop() ?? builds[builds.length - 1];
  const downloadInfo = latestBuild.downloads?.["server:default"];
  if (!downloadInfo?.url) {
    throw new Error(`Paper build #${latestBuild.id} has no downloadable server artifact.`);
  }

  // 3) Download
  logger.info(`  Downloading ${downloadInfo.name}…`);
  const downloadRes = await fetch(downloadInfo.url, { headers });
  if (!downloadRes.ok) {
    throw new Error(
      `Failed to download Paper JAR (HTTP ${downloadRes.status}).`,
    );
  }

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  fs.writeFileSync(jarPath, buffer);
  logger.info(`  Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  return jarPath;
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

    // ── Auto-download Paper JAR if none found ───────────────────
    let jarPath = findServerJar(this.projectDir);
    if (!jarPath) {
      try {
        jarPath = await downloadPaperJar(this.projectDir, this.logger);
      } catch (err) {
        throw new Error(
          `No server JAR found and auto-download failed: ${err instanceof Error ? err.message : String(err)}\n\n` +
            `To fix manually, place a server JAR (e.g. paper.jar) in:\n  ${this.projectDir}\n\n` +
            `Or run:  beaconos install-software ${this.name}`,
        );
      }
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
