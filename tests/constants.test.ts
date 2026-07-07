import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  VERSION,
  DEFAULT_PORT,
  DEFAULT_MAX_PLAYERS,
  API_PORT,
  API_HOST,
  CONFIG_DIR_NAME,
} from "../src/lib/constants";

describe("constants", () => {
  it("APP_NAME should be BeaconOS", () => {
    expect(APP_NAME).toBe("BeaconOS");
  });

  it("VERSION should be 1.1.0", () => {
    expect(VERSION).toBe("1.1.0");
  });

  it("DEFAULT_PORT should be 25565", () => {
    expect(DEFAULT_PORT).toBe(25565);
  });

  it("DEFAULT_MAX_PLAYERS should be 20", () => {
    expect(DEFAULT_MAX_PLAYERS).toBe(20);
  });

  it("API_PORT should be 3001", () => {
    expect(API_PORT).toBe(3001);
  });

  it("API_HOST should be 127.0.0.1", () => {
    expect(API_HOST).toBe("127.0.0.1");
  });

  it("CONFIG_DIR_NAME should be .beaconos", () => {
    expect(CONFIG_DIR_NAME).toBe(".beaconos");
  });
});
