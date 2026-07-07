import { describe, it, expect } from "vitest";
import { getPackageByName, searchPackages, getAllPackages, formatCategory } from "../src/lib/registry";

describe("registry", () => {
  it("getAllPackages should return an array", () => {
    const all = getAllPackages();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it("getPackageByName should find paper", () => {
    const pkg = getPackageByName("paper");
    expect(pkg).toBeDefined();
    expect(pkg!.displayName).toBe("Paper");
    expect(pkg!.category).toBe("server-software");
  });

  it("getPackageByName should be case-insensitive", () => {
    const pkg = getPackageByName("Paper");
    expect(pkg).toBeDefined();
    expect(pkg!.name).toBe("paper");
  });

  it("getPackageByName should return undefined for unknown", () => {
    const pkg = getPackageByName("nonexistent-plugin-xyz");
    expect(pkg).toBeUndefined();
  });

  it("searchPackages should find results by name", () => {
    const results = searchPackages("paper");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.name === "paper")).toBe(true);
  });

  it("searchPackages should find results by category keyword", () => {
    const results = searchPackages("permissions");
    expect(results.length).toBeGreaterThanOrEqual(1);
    // Search matches name, displayName, description, category, and author
    expect(results.some((p) => p.category === "permissions")).toBe(true);
  });

  it("searchPackages should return empty for no match", () => {
    const results = searchPackages("zzznoexistzzz");
    expect(results).toEqual([]);
  });

  it("formatCategory should return readable labels", () => {
    expect(formatCategory("server-software")).toBe("Server Software");
    expect(formatCategory("core")).toBe("Core / Essentials");
    expect(formatCategory("permissions")).toBe("Permissions");
    expect(formatCategory("economy")).toBe("Economy");
  });

  it("formatCategory should handle unknown categories gracefully", () => {
    // @ts-expect-error — testing unknown category handling
    expect(formatCategory("unknown-cat")).toBe("unknown-cat");
  });
});
