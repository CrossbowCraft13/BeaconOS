/**
 * MinecraftProcess — low-level wrapper around a Java server process.
 *
 * Responsibilities:
 *   - Spawn a Java process with the given jar and arguments
 *   - Track process state and PID
 *   - Capture stdout/stderr into a ring buffer
 *   - Graceful stop (SIGTERM → wait → SIGKILL) and immediate kill
 *
 * This is the leaf of the process hierarchy:
 *   ServerManager → ServerRuntime → MinecraftProcess
 */

import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import { ConfigService } from "./config";
import { Logger } from "./logger";
import type { ServerLogEntry } from "../types/server";

/** Default ring buffer size for log entries. */
const LOG_BUFFER_SIZE = 500;

/** How long to wait after SIGTERM before sending SIGKILL (ms). */
const GRACEFUL_STOP_TIMEOUT = 10_000;

export interface ProcessOptions {
  /** Absolute path to the server JAR file. */
  jarPath: string;
  /** Server project directory (sets cwd for the process). */
  projectDir: string;
  /** Java executable (default: "java"). */
  javaBin?: string;
  /** JVM arguments (e.g., ["-Xms1G", "-Xmx4G"]). */
  jvmArgs?: string[];
  /** Minecraft server arguments (e.g., ["nogui"]). */
  serverArgs?: string[];
  /** Port for the Minecraft server. */
  port: number;
  /** Maximum players. */
  maxPlayers: number;
}

export type ProcessState = "stopped" | "starting" | "running" | "stopping";

export class MinecraftProcess {
  private proc: ChildProcess | null = null;
  private state: ProcessState = "stopped";
  private startTime: number | null = null;
  private logs: ServerLogEntry[] = [];
  private logBufferSize: number;
  private config: ConfigService;
  private logger: Logger;

  constructor(config: ConfigService, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.logBufferSize = LOG_BUFFER_SIZE;
  }

  // ── Getters ────────────────────────────────────────────────────

  getState(): ProcessState {
    return this.state;
  }

  getPid(): number | null {
    return this.proc?.pid ?? null;
  }

  isRunning(): boolean {
    return this.state === "running" || this.state === "starting";
  }

  getUptime(): number | null {
    if (!this.startTime || !this.isRunning()) return null;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getLogs(): ServerLogEntry[] {
    return [...this.logs];
  }

  // ── Spawn ──────────────────────────────────────────────────────

  spawn(opts: ProcessOptions): void {
    if (this.isRunning()) {
      throw new Error("Process is already running.");
    }

    const javaBin = opts.javaBin || "java";
    const jvmArgs = opts.jvmArgs || ["-Xms1G", "-Xmx4G"];
    const serverArgs = opts.serverArgs || ["nogui"];

    const args = [
      ...jvmArgs,
      "-jar",
      opts.jarPath,
      ...serverArgs,
    ];

    this.state = "starting";
    this.startTime = null;
    this.logs = [];

    this.logger.info(`Spawning: ${javaBin} ${args.join(" ")}`);

    this.proc = spawn(javaBin, args, {
      cwd: opts.projectDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.startTime = Date.now();

    // ── stdout ──────────────────────────────────────────────────
    this.proc.stdout?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.addLog("info", line);

        // Detect server startup completion
        if (line.includes("Done") && line.includes("!")) {
          this.state = "running";
          this.logger.success(`Server started (PID ${this.proc!.pid})`);
        }
      }
    });

    // ── stderr ──────────────────────────────────────────────────
    this.proc.stderr?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.addLog("error", line);
      }
    });

    // ── exit ────────────────────────────────────────────────────
    this.proc.on("exit", (code, signal) => {
      const wasRunning = this.state === "running" || this.state === "starting";
      this.state = "stopped";
      this.proc = null;

      if (wasRunning && code !== 0 && signal !== "SIGTERM" && signal !== "SIGKILL") {
        this.state = "stopped";
        this.logger.warning(`Process exited unexpectedly (code=${code}, signal=${signal})`);
      } else {
        this.logger.info(`Process stopped (code=${code}, signal=${signal})`);
      }
    });

    // ── error ───────────────────────────────────────────────────
    this.proc.on("error", (err) => {
      this.logger.error(`Process error: ${err.message}`);
      this.state = "stopped";
      this.proc = null;
    });
  }

  // ── Stop (graceful then force) ─────────────────────────────────

  async stop(): Promise<void> {
    if (!this.proc || this.state === "stopped") return;

    this.state = "stopping";
    this.logger.info("Sending SIGTERM...");

    this.proc.kill("SIGTERM");

    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!this.proc || this.proc.killed) {
          clearInterval(check);
          resolve();
        }
      }, 200);

      // Force kill after timeout
      setTimeout(() => {
        clearInterval(check);
        if (this.proc && !this.proc.killed) {
          this.logger.warning("Force killing process...");
          this.proc.kill("SIGKILL");
        }
        resolve();
      }, GRACEFUL_STOP_TIMEOUT);
    });

    this.state = "stopped";
  }

  // ── Kill (immediate) ──────────────────────────────────────────

  kill(): void {
    if (!this.proc) return;
    this.logger.info("Sending SIGKILL...");
    this.proc.kill("SIGKILL");
    this.state = "stopped";
    this.proc = null;
  }

  // ── Internal ──────────────────────────────────────────────────

  private addLog(level: string, message: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
    });

    if (this.logs.length > this.logBufferSize) {
      this.logs = this.logs.slice(-this.logBufferSize);
    }
  }
}
