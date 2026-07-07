import { describe, it, expect } from "vitest";
import { createConfig, createReadme } from "../src/lib/templates";
import { VERSION } from "../src/lib/constants";

describe("templates", () => {
  describe("createConfig", () => {
    it("should contain the server name", () => {
      const config = createConfig("TestServer");
      expect(config).toContain("name: TestServer");
    });

    it("should contain the version", () => {
      const config = createConfig("TestServer");
      expect(config).toContain(`version: ${VERSION}`);
    });

    it("should contain BeaconOS as creator", () => {
      const config = createConfig("TestServer");
      expect(config).toContain("createdBy: BeaconOS");
    });

    it("should contain default port", () => {
      const config = createConfig("TestServer");
      expect(config).toContain("port: 25565");
    });

    it("should contain path entries", () => {
      const config = createConfig("TestServer");
      expect(config).toContain("plugins: plugins");
      expect(config).toContain("worlds: worlds");
      expect(config).toContain("logs: logs");
    });
  });

  describe("createReadme", () => {
    it("should contain the server name", () => {
      const readme = createReadme("MyServer");
      expect(readme).toContain("# MyServer");
    });

    it("should contain BeaconOS version", () => {
      const readme = createReadme("MyServer");
      expect(readme).toContain(`BeaconOS ${VERSION}`);
    });

    it("should list directory structure", () => {
      const readme = createReadme("MyServer");
      expect(readme).toContain("plugins/");
      expect(readme).toContain("worlds/");
      expect(readme).toContain("logs/");
      expect(readme).toContain("config/");
      expect(readme).toContain("cache/");
    });
  });
});
