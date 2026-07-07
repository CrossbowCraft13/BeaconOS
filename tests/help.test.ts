import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showHelp } from "../src/commands/help";

describe("showHelp", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("should display all commands", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("create");
    expect(output).toContain("dashboard");
    expect(output).toContain("status");
    expect(output).toContain("init");
    expect(output).toContain("packages");
    expect(output).toContain("version");
    expect(output).toContain("help");
  });

  it("should include version info", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("BeaconOS");
    expect(output).toContain("0.5.0-beta");
  });

  it("should describe the dashboard command", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("dashboard");
    expect(output).toContain("Web Dashboard");
  });
});
