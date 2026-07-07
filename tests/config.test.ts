import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import request from "supertest";
import { createApp } from "../src/api/server";
import { ConfigService } from "../src/lib/config";
import { Logger, LogLevel } from "../src/lib/logger";
import { UserStore, AuthService } from "../src/lib/auth";
import { writeJson, readJson } from "../src/lib/filesystem";

function createTestEnv() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-cfg-test-"));
  const config = new ConfigService(tempDir);
  const logger = new Logger(LogLevel.ERROR);
  const store = new UserStore(config, logger);
  const auth = new AuthService(config, logger, store);

  const { app } = createApp({ config, logger, auth });
  return { app, tempDir, config };
}

async function getToken(app: any): Promise<string> {
  // Register first, then login to get tokens
  await request(app)
    .post("/api/auth/register")
    .send({ username: "admin", password: "admin123" });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "admin123" });
  return res.body.data.accessToken;
}

describe("Config API — GET /api/config", () => {
  let env: ReturnType<typeof createTestEnv>;
  let token: string;

  beforeEach(async () => {
    env = createTestEnv();
    token = await getToken(env.app);
  });

  afterEach(() => {
    try {
      fs.rmSync(env.tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should return default config", async () => {
    const res = await request(env.app)
      .get("/api/config")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe("dark");
    expect(res.body.data.defaultRam).toBe("4G");
    expect(res.body.data.defaultPort).toBe(25565);
    expect(res.body.data.apiPort).toBe(3001);
  });

  it("should require authentication", async () => {
    const res = await request(env.app).get("/api/config");
    expect(res.status).toBe(401);
  });
});

describe("Config API — PUT /api/config", () => {
  let env: ReturnType<typeof createTestEnv>;
  let token: string;

  beforeEach(async () => {
    env = createTestEnv();
    token = await getToken(env.app);
  });

  afterEach(() => {
    try {
      fs.rmSync(env.tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should update config values", async () => {
    const res = await request(env.app)
      .put("/api/config")
      .set("Authorization", "Bearer " + token)
      .send({ theme: "light", defaultRam: "8G" });

    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe("light");
    expect(res.body.data.defaultRam).toBe("8G");
    expect(res.body.data.defaultPort).toBe(25565); // unchanged

    // Verify it was persisted
    const saved = readJson<any>(env.config.getDashboardConfigPath());
    expect(saved.theme).toBe("light");
    expect(saved.defaultRam).toBe("8G");
  });

  it("should reject unknown config keys", async () => {
    const res = await request(env.app)
      .put("/api/config")
      .set("Authorization", "Bearer " + token)
      .send({ unknownKey: "value" });

    expect(res.status).toBe(400);
  });

  it("should reject invalid theme value", async () => {
    const res = await request(env.app)
      .put("/api/config")
      .set("Authorization", "Bearer " + token)
      .send({ theme: "neon" });

    expect(res.status).toBe(400);
  });

  it("should reject invalid port", async () => {
    const res = await request(env.app)
      .put("/api/config")
      .set("Authorization", "Bearer " + token)
      .send({ defaultPort: 99 });

    expect(res.status).toBe(400);
  });

  it("should require admin role", async () => {
    // Register a non-admin user, then login to get tokens
    await request(env.app)
      .post("/api/auth/register")
      .send({ username: "user", password: "user1234" });
    const loginRes = await request(env.app)
      .post("/api/auth/login")
      .send({ username: "user", password: "user1234" });
    const userToken = loginRes.body.data.accessToken;

    const res = await request(env.app)
      .put("/api/config")
      .set("Authorization", "Bearer " + userToken)
      .send({ theme: "light" });

    expect(res.status).toBe(403);
  });

  it("should require authentication", async () => {
    const res = await request(env.app)
      .put("/api/config")
      .send({ theme: "light" });

    expect(res.status).toBe(401);
  });
});
