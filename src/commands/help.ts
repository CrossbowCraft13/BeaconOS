import { APP_NAME, VERSION } from "../lib/constants";

export function showHelp() {
  console.log(`
${APP_NAME} ${VERSION}

Commands

create <name>    Create a new BeaconOS server
version          Show BeaconOS version
help             Show this menu
`);
}
