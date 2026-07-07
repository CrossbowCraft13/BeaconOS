import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showVersion } from "../src/commands/version";
import { APP_NAME, VERSION } from "../src/lib/constants";

describe("showVersion", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("should print app name and version", () => {
    showVersion();
    expect(logSpy).toHaveBeenCalledWith(`${APP_NAME} ${VERSION}`);
  });

  it("should print BeaconOS 1.0.0", () => {
    showVersion();
    expect(logSpy).toHaveBeenCalledWith("BeaconOS 1.0.0");
  });
});
