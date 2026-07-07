/**
 * CLI command for system monitoring.
 *
 * beaconos monitor
 */

import { ConfigService } from "../lib/config";
import { Logger } from "../lib/logger";
import { MonitorService } from "../lib/monitor";

export function handleMonitor(): void {
  const config = new ConfigService();
  const logger = new Logger();
  const monitor = new MonitorService(config, logger);

  const stats = monitor.sample();

  console.log("\n  System Resources\n");

  console.log(`  CPU:        ${stats.cpu}%`);

  const ramUsed = (stats.memory.used / (1024 ** 3)).toFixed(1);
  const ramTotal = (stats.memory.total / (1024 ** 3)).toFixed(1);
  console.log(`  Memory:     ${ramUsed} GB / ${ramTotal} GB (${stats.memory.percent}%)`);

  const diskUsed = stats.disk.total > 0
    ? (stats.disk.used / (1024 ** 3)).toFixed(1)
    : "?";
  const diskTotal = stats.disk.total > 0
    ? (stats.disk.total / (1024 ** 3)).toFixed(1)
    : "?";
  console.log(`  Disk:       ${diskUsed} GB / ${diskTotal} GB (${stats.disk.percent}%)`);

  console.log(`  Network:    ${stats.network.interfaces} active interface(s)`);
  console.log(`  Servers:    ${stats.servers.running} running / ${stats.servers.total} total`);
  console.log();
}
