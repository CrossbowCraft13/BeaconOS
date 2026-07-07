/**
 * CLI commands for server lifecycle management.
 *
 * beaconos server list
 * beaconos server start <name>
 * beaconos server stop <name>
 * beaconos server restart <name>
 * beaconos server kill <name>
 * beaconos server logs <name>
 */

import { ConfigService } from "../lib/config";
import { Logger } from "../lib/logger";
import { ServerManager } from "../lib/server-manager";

function getManager(): ServerManager {
  const config = new ConfigService();
  const logger = new Logger();
  const manager = new ServerManager(config, logger);
  manager.scanForServers();
  return manager;
}

export async function handleServer(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      await listServers();
      break;

    case "start":
      await startServer(args[1]);
      break;

    case "stop":
      await stopServer(args[1]);
      break;

    case "restart":
      await restartServer(args[1]);
      break;

    case "kill":
      killServer(args[1]);
      break;

    case "logs":
      showLogs(args[1]);
      break;

    default:
      console.log("Usage:");
      console.log("  beaconos server list");
      console.log("  beaconos server start <name>");
      console.log("  beaconos server stop <name>");
      console.log("  beaconos server restart <name>");
      console.log("  beaconos server kill <name>");
      console.log("  beaconos server logs <name>");
  }
}

async function listServers(): Promise<void> {
  const manager = getManager();
  const servers = manager.getAllServers();

  if (servers.length === 0) {
    console.log("No servers registered.");
    console.log('Use "beaconos create <name>" to create one.');
    return;
  }

  console.log(`\n  Servers (${servers.length}):\n`);
  for (const srv of servers) {
    const status = srv.state === "running" ? "✓ running" : "○ stopped";
    console.log(`  ${srv.name.padEnd(24)} ${status.padEnd(16)} PID: ${srv.pid || "—"}`);
  }
  console.log();
}

async function startServer(name?: string): Promise<void> {
  if (!name) {
    console.log("Usage: beaconos server start <name>");
    return;
  }

  const manager = getManager();
  try {
    await manager.start(name);
    console.log(`✓ Server "${name}" started.`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

async function stopServer(name?: string): Promise<void> {
  if (!name) {
    console.log("Usage: beaconos server stop <name>");
    return;
  }

  const manager = getManager();
  try {
    await manager.stop(name);
    console.log(`✓ Server "${name}" stopped.`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

async function restartServer(name?: string): Promise<void> {
  if (!name) {
    console.log("Usage: beaconos server restart <name>");
    return;
  }

  const manager = getManager();
  try {
    await manager.restart(name);
    console.log(`✓ Server "${name}" restarted.`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

function killServer(name?: string): void {
  if (!name) {
    console.log("Usage: beaconos server kill <name>");
    return;
  }

  const manager = getManager();
  try {
    manager.kill(name);
    console.log(`✓ Server "${name}" killed.`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

function showLogs(name?: string): void {
  if (!name) {
    console.log("Usage: beaconos server logs <name>");
    return;
  }

  const manager = getManager();
  try {
    const logs = manager.getLogs(name);
    if (logs.length === 0) {
      console.log(`No logs for "${name}".`);
      return;
    }
    for (const entry of logs.slice(-30)) {
      const time = entry.timestamp.slice(11, 19);
      console.log(`[${time}] ${entry.message}`);
    }
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}
