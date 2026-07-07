import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  listInstalled,
  search,
  listRegistry,
  lookupPackage,
  isValidProject,
} from "../src/lib/package-manager";

describe("package-manager", () => {
  describe("search", () => {
    it("should find packages by keyword", () => {
      const results = search("luckperms");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty for no match", () => {
      const results = search("zzznoexistzzz");
      expect(results).toEqual([]);
    });
  });

  describe("listRegistry", () => {
    it("should return all packages", () => {
      const all = listRegistry();
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe("lookupPackage", () => {
    it("should find known packages", () => {
      const pkg = lookupPackage("paper");
      expect(pkg).toBeDefined();
      expect(pkg!.displayName).toBe("Paper");
    });

    it("should return undefined for unknown", () => {
      expect(lookupPackage("nonexistent-xyz")).toBeUndefined();
    });
  });

  describe("isValidProject", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-test-"));
    });

    afterEach(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    it("should return true for a valid project", () => {
      fs.writeFileSync(path.join(tempDir, "beacon.yml"), "name: test");
      expect(isValidProject(tempDir)).toBe(true);
    });

    it("should return false for non-existent path", () => {
      expect(isValidProject("/nonexistent/path")).toBe(false);
    });

    it("should return false for directory without beacon.yml", () => {
      expect(isValidProject(tempDir)).toBe(false);
    });
  });

  describe("listInstalled", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-test-"));
    });

    afterEach(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    it("should return empty array for project with no packages", () => {
      const installed = listInstalled(tempDir);
      expect(installed).toEqual([]);
    });

    it("should return installed packages from manifest", () => {
      fs.writeFileSync(
        path.join(tempDir, "packages.json"),
        JSON.stringify({
          packages: [
            {
              name: "luckperms",
              displayName: "LuckPerms",
              version: "latest",
              installedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
        })
      );
      const installed = listInstalled(tempDir);
      expect(installed.length).toBe(1);
      expect(installed[0].name).toBe("luckperms");
    });
  });
});
