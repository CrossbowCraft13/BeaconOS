import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigService } from "../src/lib/config";
import { Logger } from "../src/lib/logger";
import { ServerManager } from "../src/lib/server-manager";
import { ServerRuntime, type ProcessFactory } from "../src/lib/server-runtime";
import { MinecraftProcess } from "../src/lib/minecraft-process";

// ── Mock MinecraftProcess ──────────────────────────────────────────

function createMockProcess(): MinecraftProcess {
  const mock = {
    spawn: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
    getPid: vi.fn().mockReturnValue(null),
    getUptime: vi.fn().mockReturnValue(null),
    getState: vi.fn().mockReturnValue("stopped"),
    getLogs: vi.fn().mockReturnValue([]),
  } as unknown as MinecraftProcess;

  return mock;
}

function createMockProcessFactory(
  mock?: MinecraftProcess,
): ProcessFactory {
  const process = mock || createMockProcess();
  return () => process;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("ServerManager", () => {
  let tempDir: string;
  let config: ConfigService;
  let logger: Logger;
  let manager: ServerManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-sm-test-"));
    config = new ConfigService(tempDir);
    logger = new Logger();
    manager = new ServerManager(config, logger);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("should start with no servers", () => {
    expect(manager.getAllServers()).toEqual([]);
    expect(manager.getTotalCount()).toBe(0);
    expect(manager.getRunningCount()).toBe(0);
  });

  it("should register a server", () => {
    const projectDir = path.join(tempDir, "myserver");
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "beacon.yml"), "name: myserver");

    manager.registerServer("myserver", projectDir);
    expect(manager.getTotalCount()).toBe(1);

    const info = manager.getServer("myserver");
    expect(info).toBeDefined();
    expect(info!.name).toBe("myserver");
    expect(info!.state).toBe("stopped");
  });

  it("should return undefined for unregistered server", () => {
    expect(manager.getServer("nonexistent")).toBeUndefined();
  });

  it("should list servers sorted by name", () => {
    const dir1 = path.join(tempDir, "beta");
    const dir2 = path.join(tempDir, "alpha");
    fs.mkdirSync(dir1, { recursive: true });
    fs.mkdirSync(dir2, { recursive: true });

    manager.registerServer("beta", dir1);
    manager.registerServer("alpha", dir2);

    const servers = manager.getAllServers();
    expect(servers.length).toBe(2);
    expect(servers[0].name).toBe("alpha");
    expect(servers[1].name).toBe("beta");
  });

  it("should unregister a server", () => {
    const projectDir = path.join(tempDir, "toremove");
    fs.mkdirSync(projectDir, { recursive: true });

    manager.registerServer("toremove", projectDir);
    expect(manager.getTotalCount()).toBe(1);

    manager.unregisterServer("toremove");
    expect(manager.getTotalCount()).toBe(0);
  });

  it("should scan for existing servers", () => {
    const serverDir = config.getServerDirectory();
    fs.mkdirSync(serverDir, { recursive: true });

    // Create two server projects
    fs.mkdirSync(path.join(serverDir, "survival"), { recursive: true });
    fs.writeFileSync(path.join(serverDir, "survival", "beacon.yml"), "name: survival");

    fs.mkdirSync(path.join(serverDir, "creative"), { recursive: true });
    fs.writeFileSync(path.join(serverDir, "creative", "beacon.yml"), "name: creative");

    // Non-server directory (no beacon.yml)
    fs.mkdirSync(path.join(serverDir, "not-a-server"), { recursive: true });

    manager.scanForServers();
    expect(manager.getTotalCount()).toBe(2);
  });

  it("should throw on start for unregistered server", async () => {
    await expect(manager.start("unknown")).rejects.toThrow(
      "not registered",
    );
  });

  it("should throw on stop for unregistered server", async () => {
    await expect(manager.stop("unknown")).rejects.toThrow(
      "not registered",
    );
  });
});

describe("ServerRuntime (with mock process)", () => {
  let tempDir: string;
  let config: ConfigService;
  let logger: Logger;
  let mockProcess: MinecraftProcess;
  let runtime: ServerRuntime;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-sr-test-"));
    config = new ConfigService(tempDir);
    logger = new Logger();
    mockProcess = createMockProcess();
    const factory = createMockProcessFactory(mockProcess);

    runtime = new ServerRuntime(
      "testserver",
      tempDir,
      config,
      logger,
      factory,
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("should start in stopped state", () => {
    expect(runtime.getState()).toBe("stopped");
  });

  it("should fail to start without a server JAR", async () => {
    await expect(runtime.start()).rejects.toThrow("No server JAR found");
  });

  it("should start with a server JAR present", async () => {
    // Create a dummy server JAR
    fs.writeFileSync(path.join(tempDir, "paper.jar"), "dummy jar content");

    // Mock process to appear running
    vi.mocked(mockProcess.isRunning).mockReturnValue(true);

    await runtime.start();
    expect(runtime.getInfo().state).toBe("running");
  });

  it("should stop a running server", async () => {
    fs.writeFileSync(path.join(tempDir, "server.jar"), "dummy");

    // Fake the process as running
    vi.mocked(mockProcess.isRunning).mockReturnValue(true);
    vi.mocked(mockProcess.getState).mockReturnValue("running");

    await runtime.start();

    // Now set up mock for stop
    vi.mocked(mockProcess.stop).mockResolvedValue(undefined);

    await runtime.stop();
    expect(runtime.getState()).toBe("stopped");
  });

  it("should return server info", () => {
    const info = runtime.getInfo();
    expect(info.name).toBe("testserver");
    expect(info.path).toBe(tempDir);
    expect(info.state).toBe("stopped");
    expect(info.pid).toBeNull();
    expect(info.uptime).toBeNull();
  });

  it("should return logs from the process", () => {
    const logs = runtime.getLogs();
    expect(Array.isArray(logs)).toBe(true);
  });
});
