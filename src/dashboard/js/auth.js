/**
 * Auth module — login form handling, token storage, auth state.
 */

const Auth = (() => {
  // ── DOM refs ────────────────────────────────────────────────────

  const loginPage = document.getElementById("page-login");
  const appShell = document.getElementById("app-shell");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginBtn = document.getElementById("login-btn");
  const logoutLink = document.getElementById("logout-link");
  const sidebarUsername = document.getElementById("sidebar-username");

  let currentProfile = null;

  // ── Login ───────────────────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();
    loginError.textContent = "";

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      loginError.textContent = "Please enter your username and password.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    try {
      const result = await API.login(username, password);

      if (result.error) {
        loginError.textContent = result.message;
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
        return;
      }

      API.setTokens(result.data.accessToken, result.data.refreshToken);
      await loadSession();
      Router.navigate("#/");
    } catch (err) {
      loginError.textContent = "Connection error. Is the server running?";
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign In";
    }
  }

  // ── Session ─────────────────────────────────────────────────────

  async function loadSession() {
    const token = API.getAccessToken();
    if (!token) {
      showLogin();
      return;
    }

    const result = await API.getProfile();
    if (result.error) {
      showLogin();
      return;
    }

    currentProfile = result.data;
    sidebarUsername.textContent = currentProfile.displayName || currentProfile.username;
    showApp();
  }

  function showLogin() {
    loginPage.classList.remove("hidden");
    appShell.classList.add("hidden");
    API.clearTokens();
    currentProfile = null;
  }

  function showApp() {
    loginPage.classList.add("hidden");
    appShell.classList.remove("hidden");
  }

  // ── Logout ──────────────────────────────────────────────────────

  async function handleLogout(e) {
    e.preventDefault();

    const refresh = API.getRefreshToken();
    if (refresh) {
      await API.logout(refresh);
    }

    showLogin();
    Router.navigate("#/");
  }

  // ── Init ────────────────────────────────────────────────────────

  function init() {
    loginForm.addEventListener("submit", handleLogin);
    logoutLink.addEventListener("click", handleLogout);

    // Listen for forced logout from api.js
    window.addEventListener("beacon:logout", () => {
      showLogin();
    });

    // Check session on load
    loadSession();
  }

  return {
    init,
    getProfile: () => currentProfile,
    loadSession,
  };
})();
