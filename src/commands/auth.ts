/**
 * CLI commands for authentication.
 *
 * beaconos register <username> [password]
 * beaconos login <username> [password]
 * beaconos logout
 * beaconos whoami
 */

import { ConfigService } from "../lib/config";
import { Logger } from "../lib/logger";
import { UserStore, AuthService } from "../lib/auth";
import { readFile, writeFile } from "../lib/filesystem";
import * as path from "path";

function getAuthService(): AuthService {
  const config = new ConfigService();
  const logger = new Logger();
  const store = new UserStore(config, logger);
  return new AuthService(config, logger, store);
}

/** Path where the CLI stores its current session token. */
function tokenPath(config: ConfigService): string {
  return path.join(config.getDataDirectory(), "session-token");
}

/** Read stored refresh token. */
function readStoredToken(config: ConfigService): string | null {
  return readFile(tokenPath(config));
}

/** Write refresh token to disk. */
function storeToken(config: ConfigService, token: string): void {
  writeFile(tokenPath(config), token);
}

/** Delete stored token. */
function clearToken(config: ConfigService): void {
  const { removeFile } = require("../lib/filesystem");
  removeFile(tokenPath(config));
}

export async function handleAuth(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "register":
      await registerCmd(args[1], args[2]);
      break;

    case "login":
      await loginCmd(args[1], args[2]);
      break;

    case "logout":
      logoutCmd();
      break;

    case "whoami":
      whoamiCmd();
      break;

    default:
      console.log("Usage:");
      console.log("  beaconos register <username> [password]");
      console.log("  beaconos login <username> [password]");
      console.log("  beaconos logout");
      console.log("  beaconos whoami");
  }
}

async function registerCmd(username?: string, password?: string): Promise<void> {
  if (!username) {
    console.log("Usage: beaconos register <username> [password]");
    return;
  }

  const auth = getAuthService();
  const pwd = password || "beaconos123";

  try {
    const profile = await auth.register(username, pwd);
    console.log(`✓ Registered as "${profile.username}" (${profile.role})`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

async function loginCmd(username?: string, password?: string): Promise<void> {
  if (!username) {
    console.log("Usage: beaconos login <username> [password]");
    return;
  }

  const auth = getAuthService();
  const pwd = password || "";

  try {
    const config = new ConfigService();
    const tokens = await auth.login(username, pwd);
    storeToken(config, tokens.refreshToken);
    console.log(`✓ Logged in as "${username}"`);
    console.log(`  Token expires in ${tokens.expiresIn}s`);
  } catch (err: any) {
    console.log(`✗ ${err.message}`);
  }
}

function logoutCmd(): void {
  const config = new ConfigService();
  const refreshToken = readStoredToken(config);

  if (refreshToken) {
    try {
      const auth = getAuthService();
      // We don't have userId here, but the /api/auth/logout endpoint handles it.
      // CLI just clears local token.
    } catch {
      // ignore
    }
  }

  clearToken(config);
  console.log("✓ Logged out");
}

function whoamiCmd(): void {
  const config = new ConfigService();
  const token = readStoredToken(config);

  if (!token) {
    console.log("Not logged in.");
    console.log("Use: beaconos login <username>");
    return;
  }

  // Use the auth service to get profile from token
  const auth = getAuthService();
  const payload = auth.verifyToken(token);
  if (!payload) {
    console.log("Session expired. Please log in again.");
    clearToken(config);
    return;
  }

  console.log(`User:     ${payload.username}`);
  console.log(`Role:     ${payload.role}`);
  console.log(`User ID:  ${payload.sub}`);
}
