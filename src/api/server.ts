/**
 * BeaconOS API Server — Express application factory (composition root).
 *
 * All services are instantiated here and injected into their dependents.
 * No service uses a global or singleton.
 *
 *
 * v1.0 Foundation — Auth, Server Manager, Monitoring, File Manager, Config
 */

import express from "express";
import cors from "cors";
import * as path from "path";
import { ConfigService } from "../lib/config";
import { Logger, LogLevel } from "../lib/logger";
import { UserStore, AuthService } from "../lib/auth";
import { ServerManager } from "../lib/server-manager";
import { MonitorService } from "../lib/monitor";
import { ensureDir, exists } from "../lib/filesystem";
import { errorHandler } from "./middleware/error-handler";
import { createAuthRouter } from "./routes/auth";
import { createServerRouter } from "./routes/servers";
import { createMonitoringRouter } from "./routes/monitoring";
import { createFileRouter } from "./routes/files";
import { createConfigRouter } from "./routes/config";

export interface AppServices {
  config: ConfigService;
  logger: Logger;
  auth: AuthService;
  serverManager: ServerManager;
  monitor: MonitorService;
}

/**
 * Create and configure the Express application.
 * All dependencies are wired here (composition root).
 */
export function createApp(services?: Partial<AppServices>): {
  app: express.Application;
  services: AppServices;
} {
  // ── Resolve services (allow override for testing) ────────────────
  const config = services?.config ?? new ConfigService();
  const logger = services?.logger ?? new Logger(LogLevel.INFO);
  const userStore = services?.auth
    ? new UserStore(config, logger)
    : new UserStore(config, logger);
  const auth = services?.auth ?? new AuthService(config, logger, userStore);
  const serverManager =
    services?.serverManager ?? new ServerManager(config, logger);
  const monitor =
    services?.monitor ??
    new MonitorService(config, logger, () => ({
      running: serverManager.getRunningCount(),
      total: serverManager.getTotalCount(),
    }));

  const resolved: AppServices = {
    config,
    logger,
    auth,
    serverManager,
    monitor,
  };

  // ── Ensure data directories exist ───────────────────────────────
  ensureDir(config.getUsersDirectory());
  ensureDir(config.getLogDirectory());
  ensureDir(config.getDataDirectory() + "/run");

  // ── Express setup ────────────────────────────────────────────────
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Inject token verifier into request context for auth middleware
  app.use((req, _res, next) => {
    (req as any).__verifyToken = (token: string) => auth.verifyToken(token);
    next();
  });

  // ── API routes ───────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
  });

  app.use("/api/auth", createAuthRouter(auth));
  app.use("/api/servers", createServerRouter(serverManager));
  app.use("/api/monitoring", createMonitoringRouter(monitor));
  app.use("/api/files", createFileRouter(serverManager));
  app.use("/api/config", createConfigRouter(config));

  // ── 404 for unknown API routes (must be before SPA fallback) ─────
  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "API endpoint not found.",
    });
  });

  // ── Dashboard static files ───────────────────────────────────────
  const dashboardPaths = [
    path.join(__dirname, "..", "dashboard"),
    path.join(__dirname, "..", "..", "src", "dashboard"),
  ];

  for (const dp of dashboardPaths) {
    if (exists(dp)) {
      app.use(express.static(dp));
      app.get("/{*path}", (_req, res) => {
        res.sendFile(path.join(dp, "index.html"));
      });
      break;
    }
  }

  // ── Error handler (MUST be last) ─────────────────────────────────
  app.use(errorHandler);

  return { app, services: resolved };
}

/**
 * Start the Express server.
 */
export function startServer(
  port?: number,
  host?: string,
): { app: express.Application; services: AppServices; server: any } {
  const { app, services } = createApp();
  const { config, logger, auth, serverManager, monitor } = services;

  const bindPort = port ?? config.getDefaultApiPort();
  const bindHost = host ?? config.getApiHost();

  // Seed default admin account, scan for existing servers, start monitoring
  auth.seedDefaultAdmin().then(() => {
    serverManager.scanForServers();
    monitor.startPolling(5000);

    const server = app.listen(bindPort, bindHost, () => {
      logger.info(`Dashboard running at http://${bindHost}:${bindPort}`);
      logger.info(`API available at http://${bindHost}:${bindPort}/api`);
    });
    (app as any).__server = server;
  });

  return { app, services, server: (app as any).__server };
}
