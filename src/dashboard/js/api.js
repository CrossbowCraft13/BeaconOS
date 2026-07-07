/**
 * BeaconOS API Client — the ONLY file that calls fetch().
 *
 * All dashboard pages import API methods from here, never call fetch directly.
 * Handles auth headers, token refresh on 401, and error normalization.
 */

const API = (() => {
  const BASE = ""; // same origin

  let refreshPromise = null;

  // ── Token management ─────────────────────────────────────────────

  function getAccessToken() {
    return localStorage.getItem("accessToken");
  }

  function getRefreshToken() {
    return localStorage.getItem("refreshToken");
  }

  function setTokens(access, refresh) {
    localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
  }

  function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  // ── Token refresh ────────────────────────────────────────────────

  async function tryRefresh() {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = fetch(BASE + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      }).then((r) => r.json());
    }

    try {
      const result = await refreshPromise;
      if (result.data) {
        setTokens(result.data.accessToken, result.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  }

  // ── Core request ─────────────────────────────────────────────────

  async function request(method, path, body = null) {
    const headers = {};

    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    let res = await fetch(BASE + path, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    // Auto-refresh on 401
    if (res.status === 401 && getRefreshToken()) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers["Authorization"] = "Bearer " + getAccessToken();
        res = await fetch(BASE + path, {
          method,
          headers,
          body: body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
        });
      } else {
        clearTokens();
        window.dispatchEvent(new CustomEvent("beacon:logout"));
        return { error: "unauthorized", message: "Session expired." };
      }
    }

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { raw: await res.text() };

    if (!res.ok) {
      return {
        error: data.error || "error",
        message: data.message || `HTTP ${res.status}`,
        status: res.status,
      };
    }

    return data;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    // Auth
    register: (username, password) =>
      request("POST", "/api/auth/register", { username, password }),

    login: (username, password) =>
      request("POST", "/api/auth/login", { username, password }),

    refresh: (refreshToken) =>
      request("POST", "/api/auth/refresh", { refreshToken }),

    logout: (refreshToken) =>
      request("POST", "/api/auth/logout", { refreshToken }),

    getProfile: () => request("GET", "/api/auth/me"),

    // Health
    getHealth: () => request("GET", "/api/health"),

    // Servers (stubs for PR 2)
    getServers: () => request("GET", "/api/servers"),

    getServer: (name) => request("GET", "/api/servers/" + encodeURIComponent(name)),

    // Monitoring (stubs for PR 2)
    getStats: () => request("GET", "/api/monitoring/stats"),

    // Token helpers (used by auth.js)
    setTokens,
    clearTokens,
    getAccessToken,
    getRefreshToken,
  };
})();
