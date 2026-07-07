/**
 * File management API routes.
 *
 * All file paths are scoped to a registered server project directory.
 * Path traversal attacks are blocked by validation.
 *
 * GET  /api/files?server=<name>&path=<rel>  — list directory or read file
 * POST /api/files/write?server=<name>&path=<rel> — write file (body: { content })
 * POST /api/files/upload?server=<name>&path=<rel> — upload file (multipart)
 * DELETE /api/files?server=<name>&path=<rel> — delete file or empty dir
 */

import { Router, Request, Response, NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";
import { ServerManager } from "../../lib/server-manager";
import { authenticate } from "../middleware/auth";
import { readFile, writeFile, ensureDir } from "../../lib/filesystem";

/** Safely extract a string query param. */
function q(val: unknown): string {
  if (Array.isArray(val)) return String(val[0]);
  return String(val ?? "");
}

/**
 * Resolve a user-supplied path relative to a server project directory.
 * Throws if the resolved path escapes the server directory (path traversal prevention).
 */
function resolveServerPath(
  serverManager: ServerManager,
  serverName: string,
  relPath: string,
): string {
  const server = serverManager.getServer(serverName);
  if (!server) {
    throw new Error(`Server "${serverName}" not found.`);
  }

  // Normalise the relative path (strip leading / or ./, prevent traversal)
  const normalized = path.normalize("/" + relPath).replace(/^\/+/, "");
  const resolved = path.resolve(server.path, normalized);

  // Ensure the resolved path is within the server directory
  if (!resolved.startsWith(server.path)) {
    throw new Error("Path traversal is not allowed.");
  }

  return resolved;
}

export function createFileRouter(serverManager: ServerManager): Router {
  const router = Router();

  // ── GET / — list directory or read file ───────────────────────
  router.get(
    "/",
    authenticate,
    (req: Request, res: Response) => {
      const name = q(req.query.server);
      const relPath = q(req.query.path);

      if (!name || !relPath) {
        res.status(400).json({
          error: "bad_request",
          message: "Query parameters 'server' and 'path' are required.",
        });
        return;
      }

      try {
        // Treat "." as the root of the server project
        const targetPath = relPath === "." ? "" : relPath;
        const absPath = resolveServerPath(serverManager, name, targetPath);

        if (!fs.existsSync(absPath)) {
          res.status(404).json({
            error: "not_found",
            message: `File not found: ${targetPath || "(root)"}`,
          });
          return;
        }

        const stat = fs.statSync(absPath);

        if (stat.isDirectory()) {
          // ── List directory ────────────────────────────────────
          const entries = fs.readdirSync(absPath, { withFileTypes: true });
          const files = entries.map((entry) => {
            const entryPath = path.join(absPath, entry.name);
            let entryStat: fs.Stats | null = null;
            try {
              entryStat = fs.statSync(entryPath);
            } catch {
              // symlink broken, etc.
            }

            return {
              name: entry.name,
              type: entry.isDirectory() ? "directory" : "file",
              size: entryStat?.size ?? 0,
              modified: entryStat?.mtime.toISOString() ?? null,
            };
          });

          // Sort: directories first, then by name
          files.sort((a, b) => {
            if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });

          res.json({ data: { path: relPath, files } });
        } else {
          // ── Read file ─────────────────────────────────────────
          const content = readFile(absPath);
          res.json({
            data: {
              path: relPath,
              name: path.basename(absPath),
              content: content ?? "",
              size: stat.size,
              modified: stat.mtime.toISOString(),
            },
          });
        }
      } catch (err: any) {
        const status = err.message.includes("not found") ? 404
          : err.message.includes("traversal") ? 403
          : 500;
        res.status(status).json({
          error: status === 403 ? "forbidden" : "error",
          message: err.message,
        });
      }
    },
  );

  // ── POST /write — write file content ─────────────────────────
  router.post(
    "/write",
    authenticate,
    (req: Request, res: Response) => {
      const name = q(req.query.server);
      const relPath = q(req.query.path);
      const content = req.body?.content;

      if (!name || !relPath) {
        res.status(400).json({
          error: "bad_request",
          message: "Query parameters 'server' and 'path' are required.",
        });
        return;
      }

      if (content === undefined || content === null) {
        res.status(400).json({
          error: "bad_request",
          message: "Request body must include 'content'.",
        });
        return;
      }

      try {
        const absPath = resolveServerPath(serverManager, name, relPath);

        // Prevent writing to directories
        if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
          res.status(400).json({
            error: "bad_request",
            message: `Cannot write to a directory: ${relPath}`,
          });
          return;
        }

        ensureDir(path.dirname(absPath));
        writeFile(absPath, String(content));

        const stat = fs.statSync(absPath);
        res.json({
          data: {
            path: relPath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          },
        });
      } catch (err: any) {
        const status = err.message.includes("not found") ? 404
          : err.message.includes("traversal") ? 403
          : 500;
        res.status(status).json({
          error: status === 403 ? "forbidden" : "error",
          message: err.message,
        });
      }
    },
  );

  // ── POST /upload — upload a file ─────────────────────────────
  router.post(
    "/upload",
    authenticate,
    (req: Request, res: Response) => {
      const name = q(req.query.server);
      const relPath = q(req.query.path);

      if (!name || !relPath) {
        res.status(400).json({
          error: "bad_request",
          message: "Query parameters 'server' and 'path' are required.",
        });
        return;
      }

      try {
        const absPath = resolveServerPath(serverManager, name, relPath);

        // Accept content as raw text in body (for non-multipart uploads)
        // Multipart handling can be added later with multer.
        const content = req.body?.content;
        if (content !== undefined) {
          ensureDir(path.dirname(absPath));
          writeFile(absPath, String(content));
        } else {
          res.status(400).json({
            error: "bad_request",
            message: "Request body must include 'content'.",
          });
          return;
        }

        const stat = fs.statSync(absPath);
        res.status(201).json({
          data: {
            path: relPath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          },
        });
      } catch (err: any) {
        const status = err.message.includes("not found") ? 404
          : err.message.includes("traversal") ? 403
          : 500;
        res.status(status).json({
          error: status === 403 ? "forbidden" : "error",
          message: err.message,
        });
      }
    },
  );

  // ── DELETE / — delete file or empty directory ────────────────
  router.delete(
    "/",
    authenticate,
    (req: Request, res: Response) => {
      const name = q(req.query.server);
      const relPath = q(req.query.path);

      if (!name || !relPath) {
        res.status(400).json({
          error: "bad_request",
          message: "Query parameters 'server' and 'path' are required.",
        });
        return;
      }

      try {
        const absPath = resolveServerPath(serverManager, name, relPath);

        if (!fs.existsSync(absPath)) {
          res.status(404).json({
            error: "not_found",
            message: `File not found: ${relPath}`,
          });
          return;
        }

        const stat = fs.statSync(absPath);

        if (stat.isDirectory()) {
          // Only allow deleting empty directories via this endpoint
          const contents = fs.readdirSync(absPath);
          if (contents.length > 0) {
            res.status(409).json({
              error: "conflict",
              message: `Directory not empty: ${relPath}`,
            });
            return;
          }
          fs.rmdirSync(absPath);
        } else {
          fs.unlinkSync(absPath);
        }

        res.json({ data: { path: relPath, deleted: true } });
      } catch (err: any) {
        const status = err.message.includes("not found") ? 404
          : err.message.includes("traversal") ? 403
          : err.message.includes("not empty") ? 409
          : 500;
        res.status(status).json({
          error: status === 403 ? "forbidden" : status === 409 ? "conflict" : "error",
          message: err.message,
        });
      }
    },
  );

  return router;
}
