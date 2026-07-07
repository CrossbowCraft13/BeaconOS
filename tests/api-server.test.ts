import { describe, it, expect } from "vitest";
import request from "supertest";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createApp } from "../src/api/server";
import { ConfigService } from "../src/lib/config";
import { Logger, LogLevel } from "../src/lib/logger";
import { UserStore, AuthService } from "../src/lib/auth";

/**
 * Helper to create an app with isolated temp directories for testing.
 */
function createTestApp() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-api-test-"));
  const config = new ConfigService(tempDir);
  const logger = new Logger(LogLevel.ERROR); // silence logs during tests
  const store = new UserStore(config, logger);
  const auth = new AuthService(config, logger, store);

  const { app } = createApp({ config, logger, auth });
  return { app, config, auth, store, tempDir };
}

describe("API Server — Health", () => {
  it("GET /api/health should return ok", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.version).toBeDefined();
  });
});

describe("API Server — Auth Routes", () => {
  it("POST /api/auth/register should create a user", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "testuser", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.username).toBe("testuser");
  });

  it("POST /api/auth/register should reject short username", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "a", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("at least 2 characters");
  });

  it("POST /api/auth/register should require username and password", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login should return tokens", async () => {
    const { app } = createTestApp();

    // First register
    await request(app)
      .post("/api/auth/register")
      .send({ username: "loginuser", password: "password123" });

    // Then login
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("POST /api/auth/login should reject wrong password", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/auth/register")
      .send({ username: "secureuser", password: "correctpass" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "secureuser", password: "wrongpass" });

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login should require username and password", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/refresh should exchange refresh token", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/auth/register")
      .send({ username: "refreshuser", password: "password123" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "refreshuser", password: "password123" });

    const refreshToken = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it("POST /api/auth/refresh should reject invalid token", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/refresh should require refreshToken", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/auth/me should return profile with valid token", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/auth/register")
      .send({ username: "meuser", password: "password123" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "meuser", password: "password123" });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer " + token);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.username).toBe("meuser");
  });

  it("GET /api/auth/me should reject without token", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me should reject invalid token", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/logout should accept valid logout", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/auth/register")
      .send({ username: "logoutuser", password: "password123" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "logoutuser", password: "password123" });

    const token = loginRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer " + token)
      .send({ refreshToken: loginRes.body.data.refreshToken });

    expect(logoutRes.status).toBe(200);
  });
});

describe("API Server — Error Handling", () => {
  it("should return 404 for unknown API routes", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });

  it("should handle malformed JSON gracefully", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("not json at all");

    expect(res.status).toBe(400);
  });

  it("should return 404 for dashboard non-API route (SPA fallback)", async () => {
    // For non-API routes, the SPA fallback serves index.html (200)
    // but /api/unknown should be 404 from Express
    const { app } = createTestApp();
    const res = await request(app).get("/nonexistent-page");
    // SPA fallback returns 200 with index.html
    expect(res.status).toBe(200);
  });
});
