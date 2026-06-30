#!/usr/bin/env node

import { createServer } from "./commands/create";

const args = process.argv.slice(2);

const command = args[0];

switch (command) {

  case "create":
    createServer(args[1]);
    break;

  default:
    console.log(`
BeaconOS v0.2 Alpha

Commands:

beaconos create <ServerName>
`);
}
