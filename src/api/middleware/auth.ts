/**
 * Express authentication middleware.
 *
 * authenticate — validates JWT from Authorization header and attaches
 *                the decoded payload to `req.user`.
 *
 * requireRole  — factory that returns middleware enforcing a minimum role.
 */

import { Request, Response, NextFunction } from "express";
import type { TokenPayload } from "../../types/user";

// Augment Express Request to carry authenticated user info.
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

/**
 * Middleware that validates the JWT from the Authorization header.
 * On success, sets `req.user` with the token payload.
 * On failure, responds with 401 and does NOT call next().
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header.",
    });
    return;
  }

  const token = header.slice(7);

  // The verifyToken function is set on the app by the server at startup.
  const verifyFn = (req as any).__verifyToken as
    | ((t: string) => TokenPayload | null)
    | undefined;

  if (!verifyFn) {
    res.status(500).json({
      error: "internal",
      message: "Authentication not configured.",
    });
    return;
  }

  const payload = verifyFn(token);
  if (!payload) {
    res.status(401).json({
      error: "unauthorized",
      message: "Token is invalid or expired.",
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Factory that returns middleware which enforces a minimum role.
 * Must be used AFTER `authenticate`.
 *
 * Example:
 *   router.delete("/admin-only", authenticate, requireRole("admin"), handler);
 */
export function requireRole(...roles: string[]): AuthMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "forbidden",
        message: `Requires one of roles: ${roles.join(", ")}.`,
      });
      return;
    }

    next();
  };
}
