import { describe, it, expect } from "vitest";
import { APP_NAME, VERSION, DEFAULT_PORT, DEFAULT_MAX_PLAYERS } from "../src/lib/constants";

describe("constants", () => {
  it("APP_NAME should be BeaconOS", () => {
    expect(APP_NAME).toBe("BeaconOS");
  });

  it("VERSION should be 0.5.0-beta", () => {
    expect(VERSION).toBe("0.5.0-beta");
  });

  it("DEFAULT_PORT should be 25565", () => {
    expect(DEFAULT_PORT).toBe(25565);
  });

  it("DEFAULT_MAX_PLAYERS should be 20", () => {
    expect(DEFAULT_MAX_PLAYERS).toBe(20);
  });
});
