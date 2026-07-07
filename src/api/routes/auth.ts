/**
 * Authentication API routes.
 *
 * POST /api/auth/register   — create a new account
 * POST /api/auth/login      — authenticate and receive tokens
 * POST /api/auth/refresh    — exchange refresh token for new access token
 * POST /api/auth/logout     — invalidate a refresh token
 * GET  /api/auth/me         — return the authenticated user's profile
 */

import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../../lib/auth";
import { authenticate } from "../middleware/auth";

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  // ── POST /register ───────────────────────────────────────────────
  router.post(
    "/register",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { username, password, displayName } = req.body;

        if (!username || !password) {
          res.status(400).json({
            error: "bad_request",
            message: "Username and password are required.",
          });
          return;
        }

        const profile = await auth.register(username, password, displayName);
        res.status(201).json({ data: profile });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /login ──────────────────────────────────────────────────
  router.post(
    "/login",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          res.status(400).json({
            error: "bad_request",
            message: "Username and password are required.",
          });
          return;
        }

        const tokens = await auth.login(username, password);
        res.json({ data: tokens });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /refresh ────────────────────────────────────────────────
  router.post(
    "/refresh",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
          res.status(400).json({
            error: "bad_request",
            message: "Refresh token is required.",
          });
          return;
        }

        const tokens = await auth.refresh(refreshToken);
        res.json({ data: tokens });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── POST /logout ─────────────────────────────────────────────────
  router.post(
    "/logout",
    authenticate,
    (req: Request, res: Response) => {
      const { refreshToken } = req.body;
      if (refreshToken && req.user) {
        auth.logout(req.user.sub, refreshToken);
      }
      res.json({ data: { message: "Logged out." } });
    },
  );

  // ── GET /me ──────────────────────────────────────────────────────
  router.get(
    "/me",
    authenticate,
    (req: Request, res: Response) => {
      if (!req.user) {
        res.status(401).json({
          error: "unauthorized",
          message: "Not authenticated.",
        });
        return;
      }

      const profile = auth.getProfile(req.user.sub);
      if (!profile) {
        res.status(404).json({
          error: "not_found",
          message: "User not found.",
        });
        return;
      }

      res.json({ data: profile });
    },
  );

  return router;
}
