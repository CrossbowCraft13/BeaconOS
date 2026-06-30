import { BeaconConfig } from "../types/config";

export function createConfig(name: string): BeaconConfig {
  return {
    name,
    version: "0.2-alpha",
    createdBy: "BeaconOS",
    apiVersion: 1,

    server: {
      port: 25565,
      maxPlayers: 20
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

Created with BeaconOS v0.2 Alpha

## Coming Soon

- Server Start
- Server Stop
- Server Status
- Package Manager
`;
}
