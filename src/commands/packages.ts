import {
  listInstalled,
  installPackage,
  removePackage,
  search,
  listRegistry,
  lookupPackage,
  isValidProject,
} from "../lib/package-manager";
import { formatCategory, type PackageCategory, type PackageEntry } from "../lib/registry";
import { info, success, error, warning } from "../lib/logger";

/**
 * Entry-point for `beaconos packages <subcommand> [args...]`
 */
export async function handlePackages(args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      await listCmd(args[1]);
      break;

    case "search":
      await searchCmd(args[1]);
      break;

    case "info":
      await infoCmd(args[1]);
      break;

    case "install": {
      const projectPath = args[1] || ".";
      const pkgName = args[2];

      if (!pkgName) {
        error("Usage: beaconos packages install [project-path] <package-name|url>");
        process.exitCode = 1;
        return;
      }

      await installCmd(projectPath, pkgName);
      break;
    }

    case "remove": {
      const projectPath = args[1] || ".";
      const pkgName = args[2];

      if (!pkgName) {
        error("Usage: beaconos packages remove [project-path] <package-name>");
        process.exitCode = 1;
        return;
      }

      await removeCmd(projectPath, pkgName);
      break;
    }

    default:
      // Show subcommand help
      showPackagesHelp();
      process.exitCode = 1;
      break;
  }
}

// ── Subcommands ──────────────────────────────────────────────────

async function listCmd(projectPath: string | undefined) {
  const path = projectPath || ".";

  if (!isValidProject(path)) {
    error(`"${path}" is not a BeaconOS server project (no beacon.yml found).`);
    process.exitCode = 1;
    return;
  }

  const installed = listInstalled(path);

  if (installed.length === 0) {
    info("No packages installed.");
    console.log("\nSearch available packages:");
    console.log("  beaconos packages search <query>");
    console.log("\nInstall a package:");
    console.log("  beaconos packages install <project-path> <package-name|url>");
    return;
  }

  console.log(`\n  Installed packages in "${path}":\n`);
  for (const pkg of installed) {
    const source = pkg.url ? `  (${pkg.url})` : "";
    console.log(`  ✓ ${pkg.displayName} ${pkg.version}${source}`);
  }
  console.log();
}

async function searchCmd(query: string | undefined) {
  if (!query) {
    error("Usage: beaconos packages search <query>");
    process.exitCode = 1;
    return;
  }

  const results = search(query);

  if (results.length === 0) {
    // Show all packages as a fallback
    warning(`No results for "${query}". Here are all available packages:\n`);
    printAllPackages();
    return;
  }

  console.log(`\n  Found ${results.length} package(s) for "${query}":\n`);
  for (const pkg of results) {
    console.log(`  ${pkg.name}`);
    console.log(`    ${pkg.displayName} — ${pkg.description}`);
    console.log(`    Author: ${pkg.author}  |  Category: ${formatCategory(pkg.category)}`);
    console.log();
  }
}

async function infoCmd(name: string | undefined) {
  if (!name) {
    error("Usage: beaconos packages info <package-name>");
    process.exitCode = 1;
    return;
  }

  const pkg = lookupPackage(name);

  if (!pkg) {
    error(`Unknown package "${name}".`);
    const results = search(name);
    if (results.length > 0) {
      console.log("\nDid you mean one of these?");
      for (const r of results) {
        console.log(`  - ${r.name}  (${r.displayName})`);
      }
    } else {
      console.log("\nBrowse all available packages:");
      console.log("  beaconos packages search .");
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\n  ${pkg.displayName}`);
  console.log(`  ${"-".repeat(pkg.displayName.length)}`);
  console.log(`  ${pkg.description}`);
  console.log(`  Author:   ${pkg.author}`);
  console.log(`  Category: ${formatCategory(pkg.category)}`);
  console.log(`  Homepage: ${pkg.homepage ?? "N/A"}`);
  console.log();
}

async function installCmd(projectPath: string, pkgName: string) {
  if (!isValidProject(projectPath)) {
    error(
      `"${projectPath}" is not a BeaconOS server project.\n` +
        "Create one first with: beaconos create <name>",
    );
    process.exitCode = 1;
    return;
  }

  info(`Installing "${pkgName}" into "${projectPath}"...`);

  try {
    const installed = await installPackage(projectPath, pkgName);
    success(`Installed ${installed.displayName} successfully!`);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

async function removeCmd(projectPath: string, pkgName: string) {
  if (!isValidProject(projectPath)) {
    error(`"${projectPath}" is not a BeaconOS server project.`);
    process.exitCode = 1;
    return;
  }

  try {
    const removed = removePackage(projectPath, pkgName);
    success(`Removed ${removed.displayName}.`);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

// ── Help ─────────────────────────────────────────────────────────

function showPackagesHelp() {
  console.log(`
  beaconos packages

  Manage Minecraft plugins and packages for your BeaconOS server projects.

  Subcommands:

    list    [project-path]      List installed packages
    search  <query>             Search available packages
    info    <package-name>      Show package details
    install [project-path] <pkg|url>   Install a package
    remove  [project-path] <pkg>       Remove a package

  Examples:

    beaconos packages list MyServer
    beaconos packages search world
    beaconos packages info luckperms
    beaconos packages install MyServer essentialsx
    beaconos packages install MyServer https://example.com/plugin.jar
    beaconos packages remove MyServer essentialsx
`);
}

// ── Internal ─────────────────────────────────────────────────────

function printAllPackages() {
  const all = listRegistry();
  const grouped = new Map<PackageCategory, PackageEntry[]>();

  for (const pkg of all) {
    const cat = pkg.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(pkg);
  }

  for (const [cat, pkgs] of grouped) {
    console.log(`  [${formatCategory(cat)}]`);
    for (const pkg of pkgs) {
      console.log(`    ${pkg.name.padEnd(24)} ${pkg.displayName}`);
    }
    console.log();
  }

  console.log("  Install with:  beaconos packages install <project-path> <package-name>\n");
}
