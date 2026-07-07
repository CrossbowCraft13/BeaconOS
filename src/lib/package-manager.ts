/**
 * Core package manager — installs, removes, lists, and searches
 * Minecraft plugins for BeaconOS server projects.
 *
 * Installed packages are tracked via a `packages.json` manifest
 * stored inside each server project.
 */

import * as fs from "fs";
import * as path from "path";
import { getPackageByName, searchPackages, getAllPackages, type PackageEntry } from "./registry";

// ── Types ────────────────────────────────────────────────────────

export interface InstalledPackage {
  /** Name from the registry (or a slug derived from a URL install) */
  name: string;
  /** Human-readable label */
  displayName: string;
  /** Version string recorded at install time */
  version: string;
  /** When it was installed (ISO-8601) */
  installedAt: string;
  /** Where the .jar was downloaded from, if known */
  source?: string;
  /** Original download URL, if installed via URL */
  url?: string;
}

export interface PackageManifest {
  packages: InstalledPackage[];
}

// ── Manifest helpers ─────────────────────────────────────────────

function getManifestPath(projectPath: string): string {
  return path.join(projectPath, "packages.json");
}

function loadManifest(projectPath: string): PackageManifest {
  const manifestPath = getManifestPath(projectPath);

  if (!fs.existsSync(manifestPath)) {
    return { packages: [] };
  }

  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(raw) as PackageManifest;
  } catch {
    return { packages: [] };
  }
}

function saveManifest(projectPath: string, manifest: PackageManifest): void {
  fs.writeFileSync(
    getManifestPath(projectPath),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPluginsDir(projectPath: string): string {
  return path.join(projectPath, "plugins");
}

function ensurePluginsDir(projectPath: string): void {
  const dir = getPluginsDir(projectPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Public API ───────────────────────────────────────────────────

/**
 * List installed packages in a project directory.
 */
export function listInstalled(projectPath: string): InstalledPackage[] {
  const manifest = loadManifest(projectPath);
  return manifest.packages;
}

/**
 * Search the curated registry for matching packages.
 */
export function search(query: string): PackageEntry[] {
  return searchPackages(query);
}

/**
 * Get all packages in the curated registry.
 */
export function listRegistry(): PackageEntry[] {
  return getAllPackages();
}

/**
 * Get package info from the registry by name/keyword.
 */
export function lookupPackage(name: string): PackageEntry | undefined {
  return getPackageByName(name);
}

/**
 * Install a package by registry name or direct .jar URL.
 *
 * Returns a summary string on success, or throws an error on failure.
 */
export async function installPackage(
  projectPath: string,
  nameOrUrl: string,
): Promise<InstalledPackage> {
  ensurePluginsDir(projectPath);

  const manifest = loadManifest(projectPath);

  // Already installed?
  const slug = slugify(nameOrUrl);
  const existing = manifest.packages.find((p) => p.name === slug);

  if (existing) {
    throw new Error(
      `"${existing.displayName}" is already installed. Remove it first with:\n` +
        `  beaconos packages remove "${projectPath}" "${existing.name}"`,
    );
  }

  let entry: InstalledPackage;

  if (isUrl(nameOrUrl)) {
    // Install from direct URL
    const fileName = slugify(path.basename(nameOrUrl, ".jar")) + ".jar";
    const destPath = path.join(getPluginsDir(projectPath), fileName);

    try {
      await downloadFile(nameOrUrl, destPath);
    } catch (err) {
      throw new Error(
        `Failed to download from URL: ${nameOrUrl}\n${err instanceof Error ? err.message : String(err)}`,
      );
    }

    entry = {
      name: slug,
      displayName: path.basename(nameOrUrl, ".jar"),
      version: "latest",
      installedAt: new Date().toISOString(),
      source: nameOrUrl,
      url: nameOrUrl,
    };
  } else {
    // Install from registry
    const pkg = getPackageByName(nameOrUrl);

    if (!pkg) {
      // Try a broader search for suggestions
      const results = searchPackages(nameOrUrl);
      const suggestions = results
        .slice(0, 5)
        .map((r) => `  - ${r.name}  (${r.displayName})`)
        .join("\n");

      throw new Error(
        `Unknown package "${nameOrUrl}".` +
          (suggestions
            ? `\n\nDid you mean one of these?\n${suggestions}`
            : ""),
      );
    }

    if (pkg.url) {
      // Download from known URL
      const destPath = path.join(getPluginsDir(projectPath), `${pkg.name}.jar`);
      try {
        await downloadFile(pkg.url, destPath);
      } catch (err) {
        throw new Error(
          `Failed to download "${pkg.displayName}" from ${pkg.url}\n` +
            `${err instanceof Error ? err.message : String(err)}\n\n` +
            `You can download it manually from: ${pkg.homepage ?? pkg.url}`,
        );
      }
    } else {
      // No direct URL — try Spiget API fallback
      throw new Error(
        `"${pkg.displayName}" has no direct download URL configured.\n\n` +
          `You can install it manually from: ${pkg.homepage ?? ""}`,
      );
    }

    entry = {
      name: pkg.name,
      displayName: pkg.displayName,
      version: "latest",
      installedAt: new Date().toISOString(),
      source: pkg.url ?? pkg.homepage,
      url: pkg.url,
    };
  }

  manifest.packages.push(entry);
  saveManifest(projectPath, manifest);

  return entry;
}

/**
 * Remove an installed package from a project.
 */
export function removePackage(
  projectPath: string,
  name: string,
): InstalledPackage {
  const manifest = loadManifest(projectPath);

  const idx = manifest.packages.findIndex(
    (p) => p.name === name || p.displayName.toLowerCase() === name.toLowerCase(),
  );

  if (idx === -1) {
    throw new Error(
      `Package "${name}" is not installed in "${projectPath}".\n` +
        `Run \`beaconos packages list "${projectPath}"\` to see installed packages.`,
    );
  }

  const removed = manifest.packages[idx];

  // Remove the .jar file from plugins/
  const pluginsDir = getPluginsDir(projectPath);
  const jarPatterns = [
    path.join(pluginsDir, `${removed.name}.jar`),
    path.join(pluginsDir, `${removed.name}-latest.jar`),
  ];

  // Also try matching by displayName
  if (removed.displayName !== removed.name) {
    jarPatterns.push(path.join(pluginsDir, `${slugify(removed.displayName)}.jar`));
    jarPatterns.push(path.join(pluginsDir, `${removed.displayName}.jar`));
  }

  let deleted = false;
  for (const jarPath of jarPatterns) {
    if (fs.existsSync(jarPath)) {
      fs.unlinkSync(jarPath);
      deleted = true;
      break;
    }
  }

  // Also glob for any jar that starts with the package name
  if (!deleted && fs.existsSync(pluginsDir)) {
    const files = fs.readdirSync(pluginsDir);
    const match = files.find(
      (f) =>
        f.endsWith(".jar") &&
        (f.toLowerCase().startsWith(removed.name.toLowerCase()) ||
          f.toLowerCase().startsWith(removed.displayName.toLowerCase())),
    );
    if (match) {
      fs.unlinkSync(path.join(pluginsDir, match));
      deleted = true;
    }
  }

  manifest.packages.splice(idx, 1);
  saveManifest(projectPath, manifest);

  if (!deleted) {
    console.warn(
      `⚠  Could not find the .jar file for "${removed.displayName}". ` +
        "It has been removed from the manifest, but you may need to delete it manually.",
    );
  }

  return removed;
}

/**
 * Check if a directory looks like a BeaconOS server project.
 */
export function isValidProject(projectPath: string): boolean {
  return fs.existsSync(projectPath) && fs.existsSync(path.join(projectPath, "beacon.yml"));
}

// ── HTTP download ────────────────────────────────────────────────

async function downloadFile(url: string, destPath: string): Promise<void> {
  // Use Node.js built-in fetch (available since Node 18)
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "BeaconOS/0.5",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);
}
