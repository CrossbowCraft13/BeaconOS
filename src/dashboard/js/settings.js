/**
 * Settings page — profile, theme toggle, server defaults.
 */

const Settings = (() => {
  // ── Render ──────────────────────────────────────────────────────

  function render(el) {
    const profile = Auth.getProfile();

    el.innerHTML = `
      <h2 class="page-title">Settings</h2>
      <p class="page-subtitle">Manage your BeaconOS preferences</p>

      <!-- Profile -->
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Profile</div>
        <div style="margin-top:0.75rem;">
          <div style="margin-bottom:0.5rem;">
            <span style="color:var(--text-muted);font-size:0.8125rem;">Username</span>
            <div><strong>${escapeHtml(profile?.username || "---")}</strong></div>
          </div>
          <div style="margin-bottom:0.5rem;">
            <span style="color:var(--text-muted);font-size:0.8125rem;">Role</span>
            <div><span class="server-status"><span class="server-status-dot running"></span> ${escapeHtml(profile?.role || "---")}</span></div>
          </div>
          <div>
            <span style="color:var(--text-muted);font-size:0.8125rem;">User ID</span>
            <div style="font-family:monospace;font-size:0.8125rem;color:var(--text-muted);">${escapeHtml(profile?.id || "---")}</div>
          </div>
        </div>
      </div>

      <!-- Theme -->
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Appearance</div>
        <div style="margin-top:0.75rem;display:flex;align-items:center;gap:1rem;">
          <label for="theme-select" style="color:var(--text-secondary);">Theme</label>
          <select id="theme-select" style="width:auto;">
            <option value="dark">Dark (default)</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <!-- Server defaults (stub) -->
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">Server Defaults</div>
        <div style="margin-top:0.75rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:32rem;">
          <div>
            <label for="default-ram" style="color:var(--text-secondary);font-size:0.875rem;">Default RAM</label>
            <select id="default-ram" style="margin-top:0.375rem;">
              <option value="1G">1 GB</option>
              <option value="2G">2 GB</option>
              <option value="4G" selected>4 GB</option>
              <option value="8G">8 GB</option>
              <option value="16G">16 GB</option>
            </select>
          </div>
          <div>
            <label for="default-port" style="color:var(--text-secondary);font-size:0.875rem;">Default Port</label>
            <input type="number" id="default-port" value="25565" min="1024" max="65535" style="margin-top:0.375rem;" />
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-top:1rem;" onclick="Settings.saveDefaults()">Save Defaults</button>
      </div>

      <!-- API Info -->
      <div class="card">
        <div class="card-title">API</div>
        <div style="margin-top:0.75rem;">
          <div style="margin-bottom:0.25rem;">
            <span style="color:var(--text-muted);font-size:0.8125rem;">Base URL</span>
            <div style="font-family:monospace;font-size:0.8125rem;">${window.location.origin}</div>
          </div>
        </div>
      </div>
    `;

    // Restore saved theme
    const saved = localStorage.getItem("beacon:theme") || "dark";
    document.getElementById("theme-select").value = saved;
    document.documentElement.setAttribute("data-theme", saved);
  }

  // ── Events (attached via HTML onclick for simplicity) ───────────

  window.Settings = window.Settings || {};

  window.Settings.saveDefaults = function () {
    const ram = document.getElementById("default-ram").value;
    const port = document.getElementById("default-port").value;

    localStorage.setItem("beacon:defaultRam", ram);
    localStorage.setItem("beacon:defaultPort", port);

    showToast("Server defaults saved.", "success");
  };

  // ── Theme listener (delegated) ──────────────────────────────────

  document.addEventListener("change", (e) => {
    if (e.target.id === "theme-select") {
      const theme = e.target.value;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("beacon:theme", theme);
      showToast("Theme changed to " + theme, "info");
    }
  });

  // ── Toast helper ────────────────────────────────────────────────

  function showToast(message, type) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── Init ────────────────────────────────────────────────────────

  function init() {
    Router.register("/settings", "settings", (el) => {
      render(el);
    });
  }

  return { init };
})();
