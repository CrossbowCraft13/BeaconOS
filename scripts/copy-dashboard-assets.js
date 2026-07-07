/**
 * Copy non-TypeScript dashboard assets from src/dashboard to dist/dashboard.
 *
 * tsc only compiles .ts files, so static assets (HTML, CSS, JS, images)
 * must be copied manually. This handles nested directories recursively.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "src", "dashboard");
const destDir = path.join(__dirname, "..", "dist", "dashboard");

if (!fs.existsSync(srcDir)) {
  console.log("No dashboard assets to copy (src/dashboard missing).");
  process.exit(0);
}

/** Recursively copy a directory. */
function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  copied ${path.relative(srcDir, srcPath)}`);
    }
  }
}

console.log("Copying dashboard assets...");
copyRecursive(srcDir, destDir);
console.log("Done.");
