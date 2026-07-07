#!/usr/bin/env node

import { createServer } from "./commands/create";
import { showHelp } from "./commands/help";
import { initProject } from "./commands/init";
import { handlePackages } from "./commands/packages";
import { showStatus } from "./commands/status";
import { showVersion } from "./commands/version";
import { startDashboardCommand } from "./commands/dashboard";
import { handleAuth } from "./commands/auth";
import { handleServer } from "./commands/server";
import { handleMonitor } from "./commands/monitor";
import { installSoftware } from "./commands/install-software";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  // ── Server Management ────────────────────────────────────────────
  case "create":
    createServer(args[1]);
    break;

  case "server":
    handleServer(args.slice(1));
    break;

  case "status":
    showStatus(args[1]);
    break;

  case "monitor":
    handleMonitor();
    break;

  // ── Packages ─────────────────────────────────────────────────────
  case "packages":
  case "pkg":
    handlePackages(args.slice(1));
    break;

  // ── Server Software ──────────────────────────────────────────────
  case "install-software":
    installSoftware(args[1], args[2]);
    break;

  // ── Authentication ───────────────────────────────────────────────
  case "register":
  case "login":
  case "logout":
  case "whoami":
    handleAuth(args);
    break;

  // ── Dashboard ────────────────────────────────────────────────────
  case "dashboard":
    startDashboardCommand(args[1]);
    break;

  // ── General ──────────────────────────────────────────────────────
  case "init":
    initProject();
    break;

  case "version":
    showVersion();
    break;

  case "help":
  case undefined:
    showHelp();
    break;

  default:
    console.log(`Unknown command: ${command}`);
    showHelp();
    process.exitCode = 1;
}
