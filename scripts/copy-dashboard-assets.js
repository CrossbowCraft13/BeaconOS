/**
 * Copy non-TypeScript dashboard assets (HTML, CSS, etc.)
 * from src/dashboard to dist/dashboard after the TS build.
 *
 * tsc only compiles .ts files, so static assets must be copied manually.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "src", "dashboard");
const destDir = path.join(__dirname, "..", "dist", "dashboard");

if (!fs.existsSync(srcDir)) {
  console.log("No dashboard assets to copy (src/dashboard missing).");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (entry.isFile()) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    fs.copyFileSync(src, dest);
    console.log(`copied ${entry.name}`);
  }
}
