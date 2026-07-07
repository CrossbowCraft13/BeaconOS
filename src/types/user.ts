/**
 * User role enumeration.
 * Admin has full access; User has limited access.
 */
export type UserRole = "admin" | "user";

/**
 * A stored user record.
 */
export interface User {
  /** Unique identifier */
  id: string;
  /** Login username (unique) */
  username: string;
  /** bcrypt hash of the password */
  passwordHash: string;
  /** Role for authorization */
  role: UserRole;
  /** Display name shown in UI */
  displayName: string;
  /** When the account was created (ISO-8601) */
  createdAt: string;
  /** When the account was last updated (ISO-8601) */
  updatedAt: string;
  /** Active refresh tokens (opaque strings) */
  refreshTokens: string[];
}

/**
 * Payload stored inside a JWT access token.
 */
export interface TokenPayload {
  /** User ID */
  sub: string;
  /** Username */
  username: string;
  /** User role */
  role: UserRole;
  /** Issued-at timestamp (seconds since epoch) */
  iat: number;
  /** Expiration timestamp (seconds since epoch) */
  exp: number;
}

/**
 * Token pair returned on login / refresh.
 */
export interface TokenPair {
  /** Short-lived JWT access token */
  accessToken: string;
  /** Long-lived opaque refresh token */
  refreshToken: string;
  /** Access token expiration in seconds from now */
  expiresIn: number;
}

/**
 * Request body for registering a new user.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

/**
 * Request body for logging in.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Request body for refreshing tokens.
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Public user profile (safe for API responses).
 */
export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}
