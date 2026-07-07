/**
 * BeaconOS authentication system.
 *
 * Two classes with single responsibilities:
 *   UserStore  — persistent user CRUD against ~/.beaconos/users/users.json
 *   AuthService — register, login, refresh, token verification
 *
 * Both accept dependencies via constructor (ConfigService, Logger).
 */

import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "./config";
import { Logger } from "./logger";
import { ensureDir, writeJson, readJson, readFile, writeFile } from "./filesystem";
import type {
  User,
  UserRole,
  TokenPayload,
  TokenPair,
  UserProfile,
} from "../types/user";

// ── Constants ───────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_DURATION_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_DURATION_SEC = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_BYTES = 32;
const DEFAULT_ADMIN_USERNAME = "admin";

// The JWT secret is derived once from a stored secret file. If no secret
// exists one is generated and persisted so tokens survive restarts.
function loadOrCreateSecret(config: ConfigService): string {
  const secretPath = config.getDataDirectory() + "/jwt-secret";
  let secret = readFile(secretPath);
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    writeFile(secretPath, secret);
  }
  return secret;
}

// ── UserStore ───────────────────────────────────────────────────────

export class UserStore {
  private config: ConfigService;
  private logger: Logger;

  constructor(config: ConfigService, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /** Load all users from disk. Returns empty map on first run. */
  private load(): Map<string, User> {
    const filePath = this.config.getUsersFilePath();
    const data = readJson<Record<string, User>>(filePath);
    if (!data) return new Map();
    return new Map(Object.entries(data));
  }

  /** Persist all users to disk (atomic write). */
  private save(users: Map<string, User>): void {
    const filePath = this.config.getUsersFilePath();
    const obj: Record<string, User> = {};
    for (const [id, user] of users) {
      obj[id] = user;
    }
    writeJson(filePath, obj);
  }

  /** Find a user by username (case-insensitive). */
  findByUsername(username: string): User | undefined {
    const lower = username.toLowerCase();
    for (const user of this.load().values()) {
      if (user.username.toLowerCase() === lower) return user;
    }
    return undefined;
  }

  /** Find a user by ID. */
  findById(id: string): User | undefined {
    return this.load().get(id);
  }

  /** Find a user by refresh token. */
  findByRefreshToken(token: string): User | undefined {
    for (const user of this.load().values()) {
      if (user.refreshTokens.includes(token)) return user;
    }
    return undefined;
  }

  /** Create a new user. */
  create(user: User): void {
    const users = this.load();
    users.set(user.id, user);
    this.save(users);
    this.logger.info(`User created: ${user.username}`);
  }

  /** Update an existing user. */
  update(user: User): void {
    const users = this.load();
    users.set(user.id, user);
    this.save(users);
  }

  /** Add a refresh token to a user. */
  addRefreshToken(userId: string, token: string): void {
    const users = this.load();
    const user = users.get(userId);
    if (!user) return;
    // Keep max 5 refresh tokens per user (evict oldest)
    user.refreshTokens.push(token);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    this.save(users);
  }

  /** Remove a refresh token (logout). */
  removeRefreshToken(userId: string, token: string): void {
    const users = this.load();
    const user = users.get(userId);
    if (!user) return;
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    this.save(users);
  }

  /** Remove all refresh tokens for a user (logout all sessions). */
  removeAllRefreshTokens(userId: string): void {
    const users = this.load();
    const user = users.get(userId);
    if (!user) return;
    user.refreshTokens = [];
    this.save(users);
  }

  /** Count total users. */
  count(): number {
    return this.load().size;
  }
}

// ── AuthService ─────────────────────────────────────────────────────

export class AuthService {
  private config: ConfigService;
  private logger: Logger;
  private store: UserStore;
  private secret: string;

  constructor(config: ConfigService, logger: Logger, store: UserStore) {
    this.config = config;
    this.logger = logger;
    this.store = store;
    this.secret = loadOrCreateSecret(config);
  }

  /** Ensure the default admin account exists on first run. */
  async seedDefaultAdmin(): Promise<void> {
    if (this.store.count() > 0) return;

    this.logger.info("No users found — creating default admin account");
    const password = crypto.randomBytes(4).toString("hex");
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user: User = {
      id: crypto.randomUUID(),
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: hash,
      role: "admin",
      displayName: "Administrator",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: [],
    };

    this.store.create(user);
    this.logger.warning(`Default admin password: ${password}`);
    this.logger.warning("Change it immediately via the settings page.");
  }

  /** Register a new user account. */
  async register(
    username: string,
    password: string,
    displayName?: string,
  ): Promise<UserProfile> {
    if (!username || username.length < 2) {
      throw new AuthError("Username must be at least 2 characters.");
    }
    if (!password || password.length < 6) {
      throw new AuthError("Password must be at least 6 characters.");
    }

    const normalized = username.trim();

    if (this.store.findByUsername(normalized)) {
      throw new AuthError("Username is already taken.");
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user: User = {
      id: crypto.randomUUID(),
      username: normalized,
      passwordHash: hash,
      role: this.store.count() === 0 ? "admin" : "user",
      displayName: displayName || normalized,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refreshTokens: [],
    };

    this.store.create(user);
    return toProfile(user);
  }

  /** Authenticate and return a token pair. */
  async login(
    username: string,
    password: string,
  ): Promise<TokenPair> {
    const user = this.store.findByUsername(username);
    if (!user) {
      throw new AuthError("Invalid username or password.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid username or password.");
    }

    return this.issueTokens(user);
  }

  /** Exchange a refresh token for a new access token. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const user = this.store.findByRefreshToken(refreshToken);
    if (!user) {
      throw new AuthError("Invalid refresh token.");
    }

    // Rotate: remove old refresh token, issue new pair
    this.store.removeRefreshToken(user.id, refreshToken);
    return this.issueTokens(user);
  }

  /** Issue a new access + refresh token pair. */
  private issueTokens(user: User): TokenPair {
    const now = Math.floor(Date.now() / 1000);

    const payload: Omit<TokenPayload, "iat" | "exp"> = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.secret, {
      expiresIn: ACCESS_TOKEN_DURATION_SEC,
    });

    const refreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString("hex");

    this.store.addRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_DURATION_SEC,
    };
  }

  /** Verify and decode an access token. Returns null if invalid/expired. */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      return null;
    }
  }

  /** Log out a single session. */
  logout(userId: string, refreshToken: string): void {
    this.store.removeRefreshToken(userId, refreshToken);
    this.logger.info(`User ${userId} logged out`);
  }

  /** Log out all sessions for a user. */
  logoutAll(userId: string): void {
    this.store.removeAllRefreshTokens(userId);
    this.logger.info(`User ${userId} logged out of all sessions`);
  }

  /** Get a user's public profile. */
  getProfile(userId: string): UserProfile | null {
    const user = this.store.findById(userId);
    return user ? toProfile(user) : null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Error class for auth failures (returns 401/409 to client). */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}
