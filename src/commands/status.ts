import { exists, join } from "../lib/filesystem";
import { APP_NAME, VERSION } from "../lib/constants";
import { error, info, success, warning } from "../lib/logger";

const REQUIRED_DIRECTORIES = [
  "plugins",
  "worlds",
  "logs",
  "config",
  "cache"
];

export function showStatus(projectPath = ".") {
  info(`${APP_NAME} ${VERSION}`);

  const configPath = join(projectPath, "beacon.yml");

  if (!exists(projectPath)) {
    error(`Project path "${projectPath}" does not exist.`);
    process.exitCode = 1;
    return;
  }

  if (!exists(configPath)) {
    error(`No beacon.yml found in "${projectPath}".`);
    warning("Run this command inside a BeaconOS server folder, or pass one as an argument.");
    process.exitCode = 1;
    return;
  }

  success(`Configuration found: ${configPath}`);

  for (const directory of REQUIRED_DIRECTORIES) {
    const directoryPath = join(projectPath, directory);

    if (exists(directoryPath)) {
      success(`${directory}/ ready`);
    } else {
      warning(`${directory}/ missing`);
    }
  }
}
