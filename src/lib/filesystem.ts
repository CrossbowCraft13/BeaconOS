import fs from "fs";
import path from "path";

export function createDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeFile(file: string, content: string) {
  fs.writeFileSync(file, content);
}

export function exists(dir: string) {
  return fs.existsSync(dir);
}

export function join(...parts: string[]) {
  return path.join(...parts);
}
