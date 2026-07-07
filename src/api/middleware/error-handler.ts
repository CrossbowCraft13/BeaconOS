/**
 * Global Express error handler.
 *
 * Catches all errors thrown or passed via next(err) and returns
 * a consistent JSON error response.
 */

import { Request, Response, NextFunction } from "express";
import { AuthError } from "../../lib/auth";

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Express error-handling middleware (4-arg signature).
 * Must be registered AFTER all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // AuthError → 401 or 409
  if (err instanceof AuthError) {
    const status = err.message.includes("taken") ? 409 : 401;
    res.status(status).json({
      error: status === 409 ? "conflict" : "unauthorized",
      message: err.message,
    } satisfies ErrorResponse);
    return;
  }

  // SyntaxError from body parser → 400
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: "bad_request",
      message: "Invalid JSON in request body.",
    } satisfies ErrorResponse);
    return;
  }

  // Unknown errors → 500
  console.error("[UNHANDLED]", err);

  res.status(500).json({
    error: "internal",
    message: "An unexpected error occurred.",
  } satisfies ErrorResponse);
}
