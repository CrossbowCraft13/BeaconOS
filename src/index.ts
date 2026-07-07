#!/usr/bin/env node

import { createServer } from "./commands/create";
import { showHelp } from "./commands/help";
import { initProject } from "./commands/init";
import { handlePackages } from "./commands/packages";
import { showStatus } from "./commands/status";
import { showVersion } from "./commands/version";
import { startDashboardCommand } from "./commands/dashboard";

const args = process.argv.slice(2);

const command = args[0];

switch (command) {
  case "create":
    createServer(args[1]);
    break;

  case "dashboard":
    startDashboardCommand(args[1]);
    break;

  case "help":
  case undefined:
    showHelp();
    break;

  case "init":
    initProject();
    break;

  case "packages":
  case "pkg":
    handlePackages(args.slice(1));
    break;

  case "status":
    showStatus(args[1]);
    break;

  case "version":
    showVersion();
    break;

  default:
    console.log(`Unknown command: ${command}`);
    showHelp();
    process.exitCode = 1;
}
