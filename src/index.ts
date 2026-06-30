#!/usr/bin/env node

import { createServer } from "./commands/create";
import { showVersion } from "./commands/version";
import { showHelp } from "./commands/help";

const args = process.argv.slice(2);

const command = args[0];

switch (command) {

    case "create":
        createServer(args[1]);
        break;

    case "version":
        showVersion();
        break;

    case "help":
        showHelp();
        break;

    default:
        showHelp();
}
BeaconOS v0.2 Alpha

Commands:

beaconos create <ServerName>
`);
}
