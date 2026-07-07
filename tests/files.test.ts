import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import request from "supertest";
import { createApp } from "../src/api/server";
import { ConfigService } from "../src/lib/config";
import { Logger, LogLevel } from "../src/lib/logger";
import { UserStore, AuthService } from "../src/lib/auth";
import { ServerManager } from "../src/lib/server-manager";

/**
 * Helper: create a fully-wired app with an isolated temp directory
 * and a registered server project.
 */
function createTestEnv() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-file-test-"));
  const config = new ConfigService(tempDir);
  const logger = new Logger(LogLevel.ERROR);
  const store = new UserStore(config, logger);
  const auth = new AuthService(config, logger, store);
  const serverManager = new ServerManager(config, logger);

  // Create a fake server project
  const serverDir = path.join(tempDir, "servers", "testserver");
  fs.mkdirSync(serverDir, { recursive: true });
  fs.writeFileSync(path.join(serverDir, "beacon.yml"), "name: testserver");
  fs.writeFileSync(
    path.join(serverDir, "hello.txt"),
    "Hello, BeaconOS!",
  );
  fs.mkdirSync(path.join(serverDir, "plugins"), { recursive: true });
  fs.writeFileSync(
    path.join(serverDir, "plugins", "myplugin.jar"),
    "dummy jar",
  );

  serverManager.registerServer("testserver", serverDir);

  const { app } = createApp({ config, logger, auth, serverManager });

  return { app, tempDir, serverDir, auth };
}

/** Helper: get auth token for API calls. */
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

describe("File API — GET /api/files", () => {
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

  it("should list root directory", async () => {
    const res = await request(env.app)
      .get("/api/files?server=testserver&path=.")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(200);
    expect(res.body.data.files).toBeDefined();
    expect(res.body.data.files.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.files.some((f: any) => f.name === "hello.txt")).toBe(
      true,
    );
    expect(res.body.data.files.some((f: any) => f.name === "plugins")).toBe(
      true,
    );
  });

  it("should list subdirectory", async () => {
    const res = await request(env.app)
      .get("/api/files?server=testserver&path=plugins")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(200);
    expect(res.body.data.files).toBeDefined();
    expect(res.body.data.files.length).toBe(1);
    expect(res.body.data.files[0].name).toBe("myplugin.jar");
  });

  it("should read a file", async () => {
    const res = await request(env.app)
      .get("/api/files?server=testserver&path=hello.txt")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Hello, BeaconOS!");
    expect(res.body.data.name).toBe("hello.txt");
    expect(res.body.data.size).toBeGreaterThan(0);
  });

  it("should return 404 for non-existent file", async () => {
    const res = await request(env.app)
      .get("/api/files?server=testserver&path=nonexistent.txt")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(404);
  });

  it("should reject path traversal attempts", async () => {
    // The resolver normalises all paths within the server directory,
    // so traversing outside returns 404 (path doesn't resolve outside).
    const res = await request(env.app)
      .get("/api/files?server=testserver&path=../../etc/passwd")
      .set("Authorization", "Bearer " + token);

    // The server directory doesn't have etc/passwd, so this is 404.
    // The normaliser prevents any path from escaping the server dir.
    expect(res.status).toBe(404);
  });

  it("should require server and path params", async () => {
    const res = await request(env.app)
      .get("/api/files")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(400);
  });

  it("should require authentication", async () => {
    const res = await request(env.app).get(
      "/api/files?server=testserver&path=",
    );
    expect(res.status).toBe(401);
  });
});

describe("File API — POST /api/files/write", () => {
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

  it("should write a new file", async () => {
    const res = await request(env.app)
      .post("/api/files/write?server=testserver&path=newfile.txt")
      .set("Authorization", "Bearer " + token)
      .send({ content: "New content" });

    expect(res.status).toBe(200);
    expect(res.body.data.path).toBe("newfile.txt");

    // Verify on disk
    const content = fs.readFileSync(
      path.join(env.serverDir, "newfile.txt"),
      "utf-8",
    );
    expect(content).toBe("New content");
  });

  it("should overwrite existing file", async () => {
    const res = await request(env.app)
      .post("/api/files/write?server=testserver&path=hello.txt")
      .set("Authorization", "Bearer " + token)
      .send({ content: "Updated content" });

    expect(res.status).toBe(200);

    const content = fs.readFileSync(
      path.join(env.serverDir, "hello.txt"),
      "utf-8",
    );
    expect(content).toBe("Updated content");
  });

  it("should require content in body", async () => {
    const res = await request(env.app)
      .post("/api/files/write?server=testserver&path=test.txt")
      .set("Authorization", "Bearer " + token)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("File API — DELETE /api/files", () => {
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

  it("should delete a file", async () => {
    const res = await request(env.app)
      .delete("/api/files?server=testserver&path=hello.txt")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(fs.existsSync(path.join(env.serverDir, "hello.txt"))).toBe(false);
  });

  it("should return 404 for non-existent file", async () => {
    const res = await request(env.app)
      .delete("/api/files?server=testserver&path=nonexistent.txt")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(404);
  });

  it("should reject deleting non-empty directory", async () => {
    const res = await request(env.app)
      .delete("/api/files?server=testserver&path=plugins")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(409);
  });
});

describe("File API — POST /api/files/upload", () => {
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

  it("should upload a new file in subdirectory", async () => {
    const res = await request(env.app)
      .post("/api/files/upload?server=testserver&path=config/settings.yml")
      .set("Authorization", "Bearer " + token)
      .send({ content: "debug: true" });

    expect(res.status).toBe(201);

    const content = fs.readFileSync(
      path.join(env.serverDir, "config", "settings.yml"),
      "utf-8",
    );
    expect(content).toBe("debug: true");
  });
});
