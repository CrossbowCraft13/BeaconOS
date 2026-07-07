/**
 * Launch the BeaconOS web dashboard and API server.
 *
 * Delegates to the Express-based API server which also serves
 * the dashboard static files. The old raw-HTTP dashboard-server
 * module is kept for reference but no longer used.
 */

import { startServer } from "../api/server";
import { API_PORT, API_HOST } from "../lib/constants";

export function startDashboardCommand(port?: string) {
  const p = port ? parseInt(port, 10) : API_PORT;

  if (isNaN(p) || p < 1 || p > 65535) {
    console.log(
      "Invalid port number. Please provide a valid port between 1 and 65535.",
    );
    process.exitCode = 1;
    return;
  }

  startServer(p, API_HOST);
}
