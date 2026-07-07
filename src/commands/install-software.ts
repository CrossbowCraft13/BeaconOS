/**
 * Install Minecraft server software (Paper, Fabric, etc.)
 * into a BeaconOS server project directory.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { info, success, error } from "../lib/logger";

const PAPER_API_BASE = "https://fill.papermc.io/v3/projects/paper";
const PAPER_USER_AGENT = "BeaconOS/1.0 (https://github.com/CrossbowCraft13/BeaconOS)";

export async function installSoftware(name: string, software?: string) {
  if (!name) {
    console.log("Usage: beaconos install-software <server-name> [software]");
    console.log("  software: paper (default), fabric, forge");
    return;
  }

  const targetDir = path.join(os.homedir(), "BeaconServers", name);
  if (!fs.existsSync(targetDir)) {
    error(`Server "${name}" not found at ${targetDir}.`);
    console.log("  Create it first with:  beaconos create " + name);
    return;
  }

  const type = software || "paper";

  switch (type.toLowerCase()) {
    case "paper":
      await downloadPaper(targetDir);
      break;
    default:
      error(`Unknown server software "${software}". Supported: paper`);
      return;
  }

  success(`Server software installed for "${name}".`);
  console.log(`  You can now start it:  beaconos server start ${name}`);
}

async function downloadPaper(projectDir: string) {
  const jarPath = path.join(projectDir, "paper.jar");
  if (fs.existsSync(jarPath)) {
    info("paper.jar already exists — replacing with latest version.");
  }

  const headers = { "User-Agent": PAPER_USER_AGENT };
  info("Fetching latest Paper build…");

  // 1) Fetch project info
  const projectRes = await fetch(PAPER_API_BASE, { headers });
  if (!projectRes.ok) throw new Error(`HTTP ${projectRes.status}`);
  const projectData: any = await projectRes.json();
  const versionGroups: Record<string, string[]> = projectData.versions;

  // Collect stable versions across all groups
  const allVersions: string[] = [];
  for (const group of Object.keys(versionGroups).sort()) {
    for (const v of versionGroups[group].sort()) {
      if (!v.includes("-")) allVersions.push(v);
    }
  }
  if (allVersions.length === 0) throw new Error("No stable Paper versions found.");
  const latestVersion = allVersions[allVersions.length - 1];
  info(`  Version: ${latestVersion}`);

  // 2) Fetch builds
  const buildsRes = await fetch(
    `${PAPER_API_BASE}/versions/${encodeURIComponent(latestVersion)}/builds`,
    { headers },
  );
  if (!buildsRes.ok) throw new Error(`HTTP ${buildsRes.status}`);
  const buildsBody: any = await buildsRes.json();
  const builds: any[] = Array.isArray(buildsBody) ? buildsBody : (buildsBody.builds ?? []);
  if (builds.length === 0) throw new Error(`No builds for version ${latestVersion}.`);

  const latestBuild = builds.filter((b: any) => b.channel === "STABLE").pop() ?? builds[builds.length - 1];
  const downloadInfo = latestBuild.downloads?.["server:default"];
  if (!downloadInfo?.url) throw new Error("No downloadable server artifact found.");

  // 3) Download
  info(`  Downloading ${downloadInfo.name}…`);
  const downloadRes = await fetch(downloadInfo.url, { headers });
  if (!downloadRes.ok) throw new Error(`HTTP ${downloadRes.status}`);

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  fs.writeFileSync(jarPath, buffer);
  success(`  Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
}
