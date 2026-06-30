import { BeaconConfig } from "../types/config";
import {
  VERSION,
  DEFAULT_PORT,
  DEFAULT_MAX_PLAYERS
} from "./constants";

export function createConfig(name: string): BeaconConfig {
  return {
    name,
    version: VERSION,
    createdBy: "BeaconOS",
    apiVersion: 1,

    server: {
      port: DEFAULT_PORT,
      maxPlayers: DEFAULT_MAX_PLAYERS
    },

    paths: {
      plugins: "plugins",
      worlds: "worlds",
      logs: "logs"
    }
  };
}

export function createReadme(name: string): string {
  return `# ${name}

Created with BeaconOS ${VERSION}

## Directory Structure

plugins/   - Server plugins
worlds/    - World saves
logs/      - Server logs
config/    - Configuration files
cache/     - Temporary cache

## Planned Commands

beaconos start
beaconos stop
beaconos status

These commands will become available in future BeaconOS releases.
`;
}
