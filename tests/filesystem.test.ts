import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createDirectory, writeFile, exists, join } from "../src/lib/filesystem";

describe("filesystem", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("createDirectory should create a directory", () => {
    const dir = path.join(tempDir, "test-dir");
    expect(fs.existsSync(dir)).toBe(false);
    createDirectory(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it("createDirectory should not fail if directory already exists", () => {
    const dir = path.join(tempDir, "test-dir");
    fs.mkdirSync(dir);
    createDirectory(dir); // should not throw
    expect(fs.existsSync(dir)).toBe(true);
  });

  it("writeFile should write content to a file", () => {
    const file = path.join(tempDir, "test.txt");
    writeFile(file, "hello world");
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, "utf-8")).toBe("hello world");
  });

  it("exists should return true for existing files", () => {
    const file = path.join(tempDir, "test.txt");
    fs.writeFileSync(file, "hello");
    expect(exists(file)).toBe(true);
  });

  it("exists should return false for non-existent files", () => {
    expect(exists(path.join(tempDir, "nonexistent.txt"))).toBe(false);
  });

  it("join should correctly join paths", () => {
    expect(join("a", "b", "c")).toBe(path.join("a", "b", "c"));
  });
});
