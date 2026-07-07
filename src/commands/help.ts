import { APP_NAME, VERSION } from "../lib/constants";

export function showHelp() {
  console.log(`
${APP_NAME} ${VERSION}

Commands

Server Management
  create <name>            Create a new BeaconOS server
  server list              List registered servers
  server start <name>      Start a server
  server stop <name>       Stop a server
  server restart <name>    Restart a server
  server kill <name>       Kill a server
  server logs <name>       Show server logs
  status [path]            Check a BeaconOS server folder

Monitoring
  monitor                  Show system resource usage

Packages
  packages                 Manage plugins and packages (install / remove / list / search)

Authentication
  register <user> [pass]   Create a new user account
  login <user> [pass]      Log into BeaconOS
  logout                   Clear stored session
  whoami                   Show current user info

Dashboard
  dashboard [port]         Start the BeaconOS Web Dashboard (default port 3001)

General
  init                     Initialize BeaconOS
  version                  Show BeaconOS version
  help                     Show this menu
`);
}
