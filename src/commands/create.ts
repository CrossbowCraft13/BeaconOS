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

export function createServer(name: string) {

  if (!name) {
    console.log("Please provide a server name.");
    return;
  }

  if (exists(name)) {
    console.log(`Server "${name}" already exists.`);
    return;
  }

  console.log("Creating BeaconOS server...\n");

  createDirectory(name);

  createDirectory(join(name, "plugins"));
  createDirectory(join(name, "worlds"));
  createDirectory(join(name, "logs"));
  createDirectory(join(name, "config"));
  createDirectory(join(name, "cache"));

  const config = createConfig(name);

  writeFile(
    join(name, "beacon.yml"),
    JSON.stringify(config, null, 2)
  );

  writeFile(
    join(name, "README.md"),
    createReadme(name)
  );

  console.log("✓ Folder created");
  console.log("✓ Configuration written");
  console.log("✓ README generated");
  console.log("✓ Server ready!");
}
