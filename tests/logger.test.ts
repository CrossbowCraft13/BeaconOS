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

  it("info should output ℹ prefix", () => {
    info("test message");
    expect(logSpy).toHaveBeenCalledWith("ℹ test message");
  });

  it("success should output ✓ prefix", () => {
    success("test message");
    expect(logSpy).toHaveBeenCalledWith("✓ test message");
  });

  it("warning should output ⚠ prefix", () => {
    warning("test message");
    expect(logSpy).toHaveBeenCalledWith("⚠ test message");
  });

  it("error should output ✗ prefix", () => {
    error("test message");
    expect(logSpy).toHaveBeenCalledWith("✗ test message");
  });
});
