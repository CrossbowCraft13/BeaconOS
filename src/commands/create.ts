import * as path from "path";
import * as os from "os";
import {
  createDirectory,
  writeFile,
  exists,
  join
} from "../lib/filesystem";

import {
  createConfig,
  createReadme
} from "../lib/templates";

import {
  info,
  success
} from "../lib/logger";

/** Default directory where server projects are created. */
const DEFAULT_SERVER_DIR = path.join(os.homedir(), "BeaconServers");

export function createServer(name: string, baseDir?: string) {

  if (!name) {
    console.log("Please provide a server name.");
    return;
  }

  const targetDir = baseDir ?? DEFAULT_SERVER_DIR;

  // Ensure the base server directory exists
  createDirectory(targetDir);

  const projectDir = join(targetDir, name);

  if (exists(projectDir)) {
    console.log(`Server "${name}" already exists at ${projectDir}.`);
    return;
  }

  info("Creating BeaconOS server...");

  createDirectory(join(projectDir, "plugins"));
  createDirectory(join(projectDir, "worlds"));
  createDirectory(join(projectDir, "logs"));
  createDirectory(join(projectDir, "config"));
  createDirectory(join(projectDir, "cache"));

  const config = createConfig(name);

  writeFile(
    join(projectDir, "beacon.yml"),
    config
  );

  writeFile(
    join(projectDir, "README.md"),
    createReadme(name)
  );

  success("Folder created");
  success("Configuration written");
  success("README generated");
  success("Server ready!");
  console.log(`  Location: ${projectDir}`);
}
