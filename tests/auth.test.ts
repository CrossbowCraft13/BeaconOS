import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigService } from "../src/lib/config";
import { Logger } from "../src/lib/logger";
import { UserStore, AuthService } from "../src/lib/auth";

describe("UserStore", () => {
  let tempDir: string;
  let config: ConfigService;
  let logger: Logger;
  let store: UserStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-auth-test-"));
    config = new ConfigService(tempDir);
    logger = new Logger();
    store = new UserStore(config, logger);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("count should return 0 on empty store", () => {
    expect(store.count()).toBe(0);
  });

  it("should create and find a user by username", () => {
    const user = {
      id: "test-id",
      username: "testuser",
      passwordHash: "hash",
      role: "user" as const,
      displayName: "Test User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: [],
    };

    store.create(user);
    expect(store.count()).toBe(1);

    const found = store.findByUsername("testuser");
    expect(found).toBeDefined();
    expect(found!.id).toBe("test-id");
  });

  it("findByUsername should be case-insensitive", () => {
    const user = {
      id: "test-id",
      username: "TestUser",
      passwordHash: "hash",
      role: "user" as const,
      displayName: "Test User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: [],
    };

    store.create(user);
    const found = store.findByUsername("testuser");
    expect(found).toBeDefined();
  });

  it("findById should return undefined for unknown id", () => {
    const found = store.findById("nonexistent");
    expect(found).toBeUndefined();
  });

  it("should add and find by refresh token", () => {
    const user = {
      id: "test-id",
      username: "tokenuser",
      passwordHash: "hash",
      role: "user" as const,
      displayName: "Token User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: [],
    };

    store.create(user);
    store.addRefreshToken("test-id", "token-123");

    const found = store.findByRefreshToken("token-123");
    expect(found).toBeDefined();
    expect(found!.username).toBe("tokenuser");
  });

  it("should remove a refresh token", () => {
    const user = {
      id: "test-id",
      username: "removetoken",
      passwordHash: "hash",
      role: "user" as const,
      displayName: "Remove Token",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: ["token-1", "token-2"],
    };

    store.create(user);
    store.removeRefreshToken("test-id", "token-1");

    const found = store.findById("test-id");
    expect(found).toBeDefined();
    expect(found!.refreshTokens).toEqual(["token-2"]);
  });

  it("should remove all refresh tokens", () => {
    const user = {
      id: "test-id",
      username: "clearall",
      passwordHash: "hash",
      role: "user" as const,
      displayName: "Clear All",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: ["token-1", "token-2", "token-3"],
    };

    store.create(user);
    store.removeAllRefreshTokens("test-id");

    const found = store.findById("test-id");
    expect(found!.refreshTokens).toEqual([]);
  });
});

describe("AuthService", () => {
  let tempDir: string;
  let config: ConfigService;
  let logger: Logger;
  let store: UserStore;
  let auth: AuthService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beaconos-auth-svc-"));
    config = new ConfigService(tempDir);
    logger = new Logger();
    store = new UserStore(config, logger);
    auth = new AuthService(config, logger, store);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("should register a new user", async () => {
    const profile = await auth.register("newuser", "password123");
    expect(profile.username).toBe("newuser");
    expect(profile.role).toBe("admin"); // first user is admin
    expect(profile.id).toBeDefined();
  });

  it("should reject duplicate usernames", async () => {
    await auth.register("sameuser", "password123");
    await expect(auth.register("sameuser", "otherpass")).rejects.toThrow(
      "already taken",
    );
  });

  it("should reject short usernames", async () => {
    await expect(auth.register("a", "password123")).rejects.toThrow(
      "at least 2 characters",
    );
  });

  it("should reject short passwords", async () => {
    await expect(auth.register("validuser", "short")).rejects.toThrow(
      "at least 6 characters",
    );
  });

  it("should login with correct credentials", async () => {
    await auth.register("loginuser", "mypassword");
    const tokens = await auth.login("loginuser", "mypassword");
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });

  it("should reject login with wrong password", async () => {
    await auth.register("secureuser", "correctpass");
    await expect(auth.login("secureuser", "wrongpass")).rejects.toThrow(
      "Invalid username or password",
    );
  });

  it("should reject login for nonexistent user", async () => {
    await expect(auth.login("nobody", "password")).rejects.toThrow(
      "Invalid username or password",
    );
  });

  it("should verify a valid token", async () => {
    await auth.register("tokenuser", "password123");
    const tokens = await auth.login("tokenuser", "password123");

    const payload = auth.verifyToken(tokens.accessToken);
    expect(payload).not.toBeNull();
    expect(payload!.username).toBe("tokenuser");
    expect(payload!.role).toBe("admin");
  });

  it("should return null for invalid token", () => {
    const payload = auth.verifyToken("invalid-token-here");
    expect(payload).toBeNull();
  });

  it("should refresh tokens", async () => {
    await auth.register("refreshuser", "password123");
    const tokens = await auth.login("refreshuser", "password123");

    const refreshed = await auth.refresh(tokens.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();

    // Old refresh token should be invalidated
    await expect(auth.refresh(tokens.refreshToken)).rejects.toThrow(
      "Invalid refresh token",
    );
  });

  it("should get user profile", async () => {
    const profile = await auth.register("profileuser", "password123");
    const fetched = auth.getProfile(profile.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.username).toBe("profileuser");
  });

  it("should return null for unknown profile", () => {
    const fetched = auth.getProfile("nonexistent-id");
    expect(fetched).toBeNull();
  });

  it("should seed default admin on first run", async () => {
    // seedDefaultAdmin is called by the server, but we test it directly
    await auth.seedDefaultAdmin();
    expect(store.count()).toBe(1);

    const admin = store.findByUsername("admin");
    expect(admin).toBeDefined();
    expect(admin!.role).toBe("admin");
  });

  it("should not seed admin if users already exist", async () => {
    await auth.register("existing", "password123");

    // This should not create another user
    await auth.seedDefaultAdmin();
    expect(store.count()).toBe(1);
  });
});
