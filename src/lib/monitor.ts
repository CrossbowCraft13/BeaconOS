/**
 * MonitorService — orchestrates system resource sampling.
 *
 * Composes individual monitors (CPU, memory, disk, network) and
 * provides both real-time snapshots and historical data.
 *
 * Hierarchy:
 *   MonitorService
 *     ├── CpuMonitor     (os.cpus())
 *     ├── MemoryMonitor  (os.totalmem / freemem)
 *     ├── DiskMonitor    (fs.statfs / df)
 *     └── NetworkMonitor (os.networkInterfaces)
 */

import { ConfigService } from "./config";
import { Logger } from "./logger";
import { CpuMonitor } from "./monitors/cpu";
import { MemoryMonitor } from "./monitors/memory";
import { DiskMonitor } from "./monitors/disk";
import { NetworkMonitor } from "./monitors/network";

// ── Types ──────────────────────────────────────────────────────────

export interface SystemStats {
  cpu: number;             // CPU usage percent (0-100)
  memory: {
    total: number;         // Total RAM in bytes
    used: number;          // Used RAM in bytes
    free: number;          // Free RAM in bytes
    percent: number;       // Usage percent (0-100)
  };
  disk: {
    total: number;         // Total disk in bytes
    used: number;          // Used disk in bytes
    free: number;          // Free disk in bytes
    percent: number;       // Usage percent (0-100)
  };
  network: {
    interfaces: number;    // Number of active network interfaces
  };
  servers: {
    running: number;       // Number of running servers
    total: number;         // Total registered servers
  };
}

export interface HistoricalSample {
  timestamp: number;
  value: number;
}

const MAX_HISTORY = 120; // Keep 120 samples (10 min at 5s intervals)

export class MonitorService {
  private cpuMonitor: CpuMonitor;
  private memoryMonitor: MemoryMonitor;
  private diskMonitor: DiskMonitor;
  private networkMonitor: NetworkMonitor;
  private history: Map<string, HistoricalSample[]> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private config: ConfigService;
  private logger: Logger;
  private onSample: ((stats: SystemStats) => void) | null = null;

  constructor(
    config: ConfigService,
    logger: Logger,
    getServerCounts?: () => { running: number; total: number },
  ) {
    this.config = config;
    this.logger = logger;
    this.cpuMonitor = new CpuMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.diskMonitor = new DiskMonitor(config);
    this.networkMonitor = new NetworkMonitor();
    this.getServerCounts = getServerCounts || (() => ({ running: 0, total: 0 }));
  }

  private getServerCounts: () => { running: number; total: number };

  // ── Sampling ──────────────────────────────────────────────────

  /** Take a single snapshot of all system stats. */
  sample(): SystemStats {
    const cpu = this.cpuMonitor.sample();
    const memory = this.memoryMonitor.sample();
    const disk = this.diskMonitor.sample();
    const network = this.networkMonitor.sample();
    const servers = this.getServerCounts();

    const stats: SystemStats = {
      cpu,
      memory: {
        total: memory.total,
        used: memory.used,
        free: memory.free,
        percent: memory.total > 0
          ? Math.round((memory.used / memory.total) * 1000) / 10
          : 0,
      },
      disk: {
        total: disk.total,
        used: disk.used,
        free: disk.free,
        percent: disk.total > 0
          ? Math.round((disk.used / disk.total) * 1000) / 10
          : 0,
      },
      network: {
        interfaces: network.interfaces,
      },
      servers,
    };

    // Store in history
    const now = Date.now();
    this.recordHistory("cpu", now, stats.cpu);
    this.recordHistory("memory", now, stats.memory.percent);
    this.recordHistory("disk", now, stats.disk.percent);
    this.recordHistory("servers_running", now, stats.servers.running);

    return stats;
  }

  // ── Polling ───────────────────────────────────────────────────

  /** Start automatic polling at the given interval. */
  startPolling(intervalMs: number = 5000): void {
    if (this.pollInterval) return;

    this.logger.info(`Monitoring started (interval: ${intervalMs}ms)`);

    this.pollInterval = setInterval(() => {
      try {
        const stats = this.sample();
        if (this.onSample) {
          this.onSample(stats);
        }
      } catch (err: any) {
        this.logger.error(`Monitor error: ${err.message}`);
      }
    }, intervalMs);
  }

  /** Stop automatic polling. */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.logger.info("Monitoring stopped");
    }
  }

  /** Register a callback for each sample. */
  onStats(callback: (stats: SystemStats) => void): void {
    this.onSample = callback;
  }

  // ── History ───────────────────────────────────────────────────

  /** Get historical samples for a metric. */
  getHistory(metric: string, count: number = 60): HistoricalSample[] {
    const samples = this.history.get(metric) || [];
    return samples.slice(-count);
  }

  private recordHistory(metric: string, timestamp: number, value: number): void {
    if (!this.history.has(metric)) {
      this.history.set(metric, []);
    }
    const samples = this.history.get(metric)!;
    samples.push({ timestamp, value });
    if (samples.length > MAX_HISTORY) {
      samples.splice(0, samples.length - MAX_HISTORY);
    }
  }

  /** Clear all history. */
  clearHistory(): void {
    this.history.clear();
  }
}
