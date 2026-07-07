/**
 * Server management API routes.
 *
 * GET    /api/servers                   — list all servers
 * GET    /api/servers/:name             — get server info
 * GET    /api/servers/:name/logs        — get server logs
 * POST   /api/servers/:name/start      — start a server
 * POST   /api/servers/:name/stop       — stop a server
 * POST   /api/servers/:name/restart    — restart a server
 * POST   /api/servers/:name/kill       — kill a server
 */

import { Router, Request, Response, NextFunction } from "express";
import { ServerManager } from "../../lib/server-manager";
import { authenticate } from "../middleware/auth";

/** Safely extract a string route param (Express 5 types: string | string[]). */
function param(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

export function createServerRouter(serverManager: ServerManager): Router {
  const router = Router();

  // ── GET / — list all servers ──────────────────────────────────
  router.get(
    "/",
    authenticate,
    (_req: Request, res: Response) => {
      const servers = serverManager.getAllServers();
      res.json({ data: servers });
    },
  );

  // ── GET /:name — server info ──────────────────────────────────
  router.get(
    "/:name",
    authenticate,
    (req: Request, res: Response) => {
      const name = param(req.params.name);
      const server = serverManager.getServer(name);
      if (!server) {
        res.status(404).json({
          error: "not_found",
          message: `Server "${name}" not found.`,
        });
        return;
      }
      res.json({ data: server });
    },
  );

  // ── GET /:name/logs — server logs ─────────────────────────────
  router.get(
    "/:name/logs",
    authenticate,
    (req: Request, res: Response) => {
      const name = param(req.params.name);
      try {
        const logs = serverManager.getLogs(name);
        res.json({ data: logs });
      } catch (err: any) {
        res.status(404).json({
          error: "not_found",
          message: err.message,
        });
      }
    },
  );

  // ── POST /:name/start — start server ──────────────────────────
  router.post(
    "/:name/start",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
      const name = param(req.params.name);
      try {
        await serverManager.start(name);
        const server = serverManager.getServer(name);
        res.json({ data: server });
      } catch (err: any) {
        if (err.message.includes("already")) {
          res.status(409).json({
            error: "conflict",
            message: err.message,
          });
          return;
        }
        next(err);
      }
    },
  );

  // ── POST /:name/stop — stop server ────────────────────────────
  router.post(
    "/:name/stop",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
      const name = param(req.params.name);
      try {
        await serverManager.stop(name);
        const server = serverManager.getServer(name);
        res.json({ data: server });
      } catch (err: any) {
        next(err);
      }
    },
  );

  // ── POST /:name/restart — restart server ──────────────────────
  router.post(
    "/:name/restart",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
      const name = param(req.params.name);
      try {
        await serverManager.restart(name);
        const server = serverManager.getServer(name);
        res.json({ data: server });
      } catch (err: any) {
        next(err);
      }
    },
  );

  // ── POST /:name/kill — kill server ────────────────────────────
  router.post(
    "/:name/kill",
    authenticate,
    (req: Request, res: Response) => {
      const name = param(req.params.name);
      try {
        serverManager.kill(name);
        res.json({
          data: {
            name,
            state: "stopped",
            message: "Server killed.",
          },
        });
      } catch (err: any) {
        res.status(404).json({
          error: "not_found",
          message: err.message,
        });
      }
    },
  );

  return router;
}
