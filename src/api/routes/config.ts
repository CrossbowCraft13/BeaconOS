/**
 * Configuration API routes.
 *
 * GET /api/config       — read system configuration
 * PUT /api/config       — update system configuration
 */

import { Router, Request, Response } from "express";
import { ConfigService } from "../../lib/config";
import { readJson, writeJson } from "../../lib/filesystem";
import { authenticate, requireRole } from "../middleware/auth";

export interface DashboardConfig {
  theme: "dark" | "light";
  defaultRam: string;
  defaultPort: number;
  apiPort: number;
  serverDirectory: string;
}

const DEFAULT_CONFIG: DashboardConfig = {
  theme: "dark",
  defaultRam: "4G",
  defaultPort: 25565,
  apiPort: 3001,
  serverDirectory: "",
};

export function createConfigRouter(config: ConfigService): Router {
  const router = Router();

  // ── GET / — read config ──────────────────────────────────────
  router.get(
    "/",
    authenticate,
    (_req: Request, res: Response) => {
      const configPath = config.getDashboardConfigPath();
      const saved = readJson<Partial<DashboardConfig>>(configPath);
      const merged = { ...DEFAULT_CONFIG, ...saved };
      res.json({ data: merged });
    },
  );

  // ── PUT / — update config ────────────────────────────────────
  router.put(
    "/",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => {
      const updates = req.body;

      if (!updates || typeof updates !== "object") {
        res.status(400).json({
          error: "bad_request",
          message: "Request body must be a JSON object.",
        });
        return;
      }

      const configPath = config.getDashboardConfigPath();
      const saved = readJson<Record<string, unknown>>(configPath) ?? {};
      const allowed = new Set([
        "theme",
        "defaultRam",
        "defaultPort",
        "apiPort",
        "serverDirectory",
      ]);

      // Only allow known keys
      for (const key of Object.keys(updates)) {
        if (!allowed.has(key)) {
          res.status(400).json({
            error: "bad_request",
            message: `Unknown config key: "${key}".`,
          });
          return;
        }
      }

      // Validate values
      if (updates.theme !== undefined && !["dark", "light"].includes(updates.theme)) {
        res.status(400).json({
          error: "bad_request",
          message: 'Theme must be "dark" or "light".',
        });
        return;
      }

      if (updates.defaultPort !== undefined) {
        const port = Number(updates.defaultPort);
        if (isNaN(port) || port < 1024 || port > 65535) {
          res.status(400).json({
            error: "bad_request",
            message: "Port must be between 1024 and 65535.",
          });
          return;
        }
        updates.defaultPort = port;
      }

      const merged = { ...saved, ...updates };
      writeJson(configPath, merged);

      res.json({ data: { ...DEFAULT_CONFIG, ...merged } });
    },
  );

  return router;
}
