/**
 * Monitoring API routes.
 *
 * GET /api/monitoring/stats      — current system stats snapshot
 * GET /api/monitoring/history    — historical metric data
 */

import { Router, Request, Response } from "express";
import { MonitorService } from "../../lib/monitor";
import { authenticate } from "../middleware/auth";

export function createMonitoringRouter(monitor: MonitorService): Router {
  const router = Router();

  // ── GET /stats — current snapshot ─────────────────────────────
  router.get(
    "/stats",
    authenticate,
    (_req: Request, res: Response) => {
      const stats = monitor.sample();
      res.json({ data: stats });
    },
  );

  // ── GET /history — historical data ────────────────────────────
  router.get(
    "/history",
    authenticate,
    (req: Request, res: Response) => {
      const metric = (req.query.metric as string) || "cpu";
      const count = parseInt((req.query.count as string) || "60", 10);
      const history = monitor.getHistory(metric, Math.min(count, 500));
      res.json({ data: { metric, samples: history } });
    },
  );

  return router;
}
