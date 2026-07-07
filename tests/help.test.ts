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

  it("should display server management commands", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("create");
    expect(output).toContain("server list");
    expect(output).toContain("server start");
    expect(output).toContain("server stop");
    expect(output).toContain("server restart");
    expect(output).toContain("server kill");
    expect(output).toContain("server logs");
    expect(output).toContain("status");
  });

  it("should display monitoring command", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("monitor");
  });

  it("should display authentication commands", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("register");
    expect(output).toContain("login");
    expect(output).toContain("logout");
    expect(output).toContain("whoami");
  });

  it("should include dashboard command", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("dashboard");
    expect(output).toContain("Web Dashboard");
  });

  it("should include general commands", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("packages");
    expect(output).toContain("version");
    expect(output).toContain("init");
    expect(output).toContain("help");
  });

  it("should include version info", () => {
    showHelp();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("BeaconOS");
    expect(output).toContain("1.0.0");
  });
});
