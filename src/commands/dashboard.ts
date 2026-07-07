import { startDashboard } from "../lib/dashboard-server";

export function startDashboardCommand(port?: string) {
  const p = port ? parseInt(port, 10) : undefined;
  if (p !== undefined && (isNaN(p) || p < 1 || p > 65535)) {
    console.log("Invalid port number. Please provide a valid port between 1 and 65535.");
    process.exitCode = 1;
    return;
  }
  startDashboard(p);
}
