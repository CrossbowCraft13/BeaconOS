import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigService } from "../src/lib/config";
import { Logger } from "../src/lib/logger";
import { MonitorService } from "../src/lib/monitor";
import { CpuMonitor } from "../src/lib/monitors/cpu";
import { MemoryMonitor } from "../src/lib/monitors/memory";
import { DiskMonitor } from "../src/lib/monitors/disk";
import { NetworkMonitor } from "../src/lib/monitors/network";

describe("CpuMonitor", () => {
  it("should return a number on sample", () => {
    const monitor = new CpuMonitor();
    const result = monitor.sample();
    expect(typeof result).toBe("number");
  });

  it("should return 0 on first sample (no baseline)", () => {
    const monitor = new CpuMonitor();
    expect(monitor.sample()).toBe(0);
  });

  it("should return a value between 0 and 100 on second sample", () => {
    const monitor = new CpuMonitor();
    monitor.sample(); // first sample establishes baseline

    // Force internal state to simulate a delta
    const result = monitor.sample();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("should reset baseline", () => {
    const monitor = new CpuMonitor();
    monitor.sample(); // baseline
    monitor.reset();
    expect(monitor.sample()).toBe(0); // fresh baseline
  });
});

describe("MemoryMonitor", () => {
  it("should return total, free, and used memory", () => {
    const monitor = new MemoryMonitor();
    const result = monitor.sample();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("free");
    expect(result).toHaveProperty("used");

    expect(result.total).toBeGreaterThan(0);
    expect(result.free).toBeGreaterThan(0);
    expect(result.used).toBeGreaterThan(0);

    // Total should equal used + free (approximately)
    expect(Math.abs(result.total - (result.used + result.free))).toBeLessThan(
      1024 * 1024, // Allow 1 MB tolerance for rounding
    );
  });
});

describe("DiskMonitor", () => {
  let tempDir: string;
  let config: ConfigService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-disk-test-"));
    config = new ConfigService(tempDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should return total, free, and used disk", () => {
    const monitor = new DiskMonitor(config);
    const result = monitor.sample();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("free");
    expect(result).toHaveProperty("used");
  });
});

describe("NetworkMonitor", () => {
  it("should return interface count", () => {
    const monitor = new NetworkMonitor();
    const result = monitor.sample();

    expect(result).toHaveProperty("interfaces");
    expect(typeof result.interfaces).toBe("number");
    expect(result.interfaces).toBeGreaterThanOrEqual(0);
  });
});

describe("MonitorService", () => {
  let tempDir: string;
  let config: ConfigService;
  let logger: Logger;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-ms-test-"));
    config = new ConfigService(tempDir);
    logger = new Logger();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should return all system stats on sample", () => {
    const monitor = new MonitorService(config, logger);
    const stats = monitor.sample();

    expect(stats).toHaveProperty("cpu");
    expect(stats).toHaveProperty("memory");
    expect(stats).toHaveProperty("disk");
    expect(stats).toHaveProperty("network");
    expect(stats).toHaveProperty("servers");

    expect(typeof stats.cpu).toBe("number");
    expect(stats.memory.total).toBeGreaterThan(0);
    expect(stats.disk).toBeDefined();
    expect(stats.network.interfaces).toBeGreaterThanOrEqual(0);
    expect(stats.servers.total).toBeGreaterThanOrEqual(0);
    expect(stats.servers.running).toBeGreaterThanOrEqual(0);
  });

  it("should record history on sample", () => {
    const monitor = new MonitorService(config, logger);

    monitor.sample();
    monitor.sample();
    monitor.sample();

    const history = monitor.getHistory("cpu", 10);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.length).toBeLessThanOrEqual(3);

    // Each sample should have timestamp and value
    for (const s of history) {
      expect(s).toHaveProperty("timestamp");
      expect(s).toHaveProperty("value");
      expect(typeof s.timestamp).toBe("number");
    }
  });

  it("should start and stop polling", () => {
    const monitor = new MonitorService(config, logger);

    monitor.startPolling(1000);
    monitor.startPolling(1000); // should be no-op

    monitor.stopPolling();
    monitor.stopPolling(); // should be no-op
  });

  it("should call onStats callback when polling", async () => {
    const monitor = new MonitorService(config, logger);
    const calls: any[] = [];

    monitor.onStats((stats) => calls.push(stats));
    monitor.startPolling(50);

    // Wait for a few samples
    await new Promise((r) => setTimeout(r, 120));

    monitor.stopPolling();

    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const call of calls) {
      expect(call).toHaveProperty("cpu");
    }
  });

  it("should clear history", () => {
    const monitor = new MonitorService(config, logger);

    monitor.sample();
    monitor.sample();

    monitor.clearHistory();
    expect(monitor.getHistory("cpu", 10)).toEqual([]);
  });

  it("should accept custom server counts", () => {
    const monitor = new MonitorService(config, logger, () => ({
      running: 3,
      total: 5,
    }));

    const stats = monitor.sample();
    expect(stats.servers.running).toBe(3);
    expect(stats.servers.total).toBe(5);
  });
});
