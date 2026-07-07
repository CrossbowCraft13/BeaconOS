import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { info, success, warning, error } from "../src/lib/logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("info should output ℹ symbol", () => {
    info("test message");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("ℹ");
    expect(output).toContain("test message");
  });

  it("success should output ✓ symbol", () => {
    success("test message");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("✓");
    expect(output).toContain("test message");
  });

  it("warning should output ⚠ symbol", () => {
    warning("test message");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("⚠");
    expect(output).toContain("test message");
  });

  it("error should output ✗ symbol", () => {
    error("test message");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("✗");
    expect(output).toContain("test message");
  });
});
