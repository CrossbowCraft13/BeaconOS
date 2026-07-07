import * as fs from "fs";
import * as path from "path";

/**
 * Ensure a directory exists, creating parent directories if needed.
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Create a directory (alias for ensureDir, backward-compatible).
 */
export function createDirectory(dir: string): void {
  ensureDir(dir);
}

/**
 * Write a file (overwrites if exists). Creates parent directories.
 */
export function writeFile(file: string, content: string): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf-8");
}

/**
 * Read a file as UTF-8 string. Returns null if not found.
 */
export function readFile(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Read a JSON file and parse it. Returns null if not found or invalid.
 */
export function readJson<T>(file: string): T | null {
  const content = readFile(file);
  if (content === null) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Atomically write a JSON file (write to temp then rename).
 */
export function writeJson(file: string, data: unknown): void {
  const dir = path.dirname(file);
  ensureDir(dir);
  const tmp = file + ".tmp." + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

/**
 * Read a directory. Returns empty array if not found.
 */
export function readDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Check if a path exists.
 */
export function exists(dir: string): boolean {
  return fs.existsSync(dir);
}

/**
 * Join path segments.
 */
export function join(...parts: string[]): string {
  return path.join(...parts);
}

/**
 * Remove a file. Returns true if deleted, false if not found.
 */
export function removeFile(file: string): boolean {
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively remove a directory.
 */
export function removeDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

/**
 * Copy a directory recursively.
 */
export function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
