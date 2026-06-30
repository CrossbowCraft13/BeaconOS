export interface BeaconConfig {
  name: string;
  version: string;
  createdBy: string;
  apiVersion: number;

  server: {
    port: number;
    maxPlayers: number;
  };

  paths: {
    plugins: string;
    worlds: string;
    logs: string;
  };
}
