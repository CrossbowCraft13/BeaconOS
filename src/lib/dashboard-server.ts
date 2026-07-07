import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { APP_NAME, VERSION } from "../lib/constants";
import { exists } from "../lib/filesystem";

const DASHBOARD_PORT = 3000;
const DASHBOARD_HOST = "127.0.0.1";

function findDashboardAsset(filename: string): string | null {
  // Candidate locations: built output (dist/dashboard) and source (src/dashboard, for ts-node dev)
  const candidates = [
    path.join(__dirname, "..", "dashboard", filename),
    path.join(__dirname, "..", "..", "src", "dashboard", filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function serveDashboardHTML(): string {
  const dashboardPath = findDashboardAsset("index.html");
  if (dashboardPath) {
    return fs.readFileSync(dashboardPath, "utf-8");
  }
  // Fallback inline HTML if the file wasn't built
  return buildFallbackHTML();
}

function buildFallbackHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>BeaconOS Dashboard</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem;text-align:center}</style></head>
<body><h1>BeaconOS Dashboard</h1><p>Build not complete — dashboard assets missing.</p></body>
</html>`;
}

function getProjects(): unknown[] {
  const projects: unknown[] = [];
  const cwd = process.cwd();

  try {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const beaconPath = path.join(cwd, entry.name, "beacon.yml");
        if (fs.existsSync(beaconPath)) {
          const readmePath = path.join(cwd, entry.name, "README.md");
          const pluginsDir = path.join(cwd, entry.name, "plugins");
          const worldsDir = path.join(cwd, entry.name, "worlds");
          const logsDir = path.join(cwd, entry.name, "logs");
          const configDir = path.join(cwd, entry.name, "config");
          const cacheDir = path.join(cwd, entry.name, "cache");

          projects.push({
            name: entry.name,
            hasReadme: fs.existsSync(readmePath),
            hasPlugins: fs.existsSync(pluginsDir),
            hasWorlds: fs.existsSync(worldsDir),
            hasLogs: fs.existsSync(logsDir),
            hasConfig: fs.existsSync(configDir),
            hasCache: fs.existsSync(cacheDir),
            configPath: beaconPath,
          });
        }
      }
    }
  } catch {
    // ignore read errors
  }

  return projects;
}

function getStatusResponse() {
  return {
    app: APP_NAME,
    version: VERSION,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
  };
}

export function startDashboard(port = DASHBOARD_PORT) {
  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";

    if (url === "/" || url === "/index.html") {
      const html = serveDashboardHTML();
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    if (url === "/api/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getStatusResponse(), null, 2));
      return;
    }

    if (url === "/api/projects") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ projects: getProjects() }, null, 2));
      return;
    }

    // Serve static assets from dashboard folder
    if (url.startsWith("/") && url !== "/") {
      const assetPath = findDashboardAsset(url.slice(1));
      if (assetPath && fs.statSync(assetPath).isFile()) {
        const ext = path.extname(assetPath).toLowerCase();
        const contentType: Record<string, string> = {
          ".css": "text/css",
          ".js": "application/javascript",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".svg": "image/svg+xml",
        };
        res.writeHead(200, { "Content-Type": contentType[ext] ?? "text/plain" });
        res.end(fs.readFileSync(assetPath));
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, DASHBOARD_HOST, () => {
    console.log(`BeaconOS Dashboard running at http://${DASHBOARD_HOST}:${port}`);
  });

  return server;
}
