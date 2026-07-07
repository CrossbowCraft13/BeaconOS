/**
 * Logs page — view recent system log entries.
 */

const Logs = (() => {
  function render(el) {
    el.innerHTML = `
      <h2 class="page-title">System Logs</h2>
      <p class="page-subtitle">Recent BeaconOS activity</p>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" data-log-level="all">All</button>
        <button class="btn btn-secondary btn-sm" data-log-level="info">Info</button>
        <button class="btn btn-secondary btn-sm" data-log-level="success">Success</button>
        <button class="btn btn-secondary btn-sm" data-log-level="warning">Warnings</button>
        <button class="btn btn-secondary btn-sm" data-log-level="error">Errors</button>
        <button class="btn btn-secondary btn-sm" id="logs-refresh" style="margin-left:auto;">Refresh</button>
      </div>

      <div class="log-viewer" id="log-viewer">
        <div style="color:var(--text-muted);">Loading logs...</div>
      </div>
    `;

    loadLogs("all");

    // Filter buttons
    el.querySelectorAll("[data-log-level]").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.querySelectorAll("[data-log-level]").forEach(
          (b) => (b.style.opacity = "0.5"),
        );
        btn.style.opacity = "1";
        loadLogs(btn.dataset.logLevel);
      });
    });

    // Mark "All" as active
    el.querySelector('[data-log-level="all"]').style.opacity = "1";

    // Refresh button
    document.getElementById("logs-refresh")?.addEventListener("click", () => {
      loadLogs(
        document.querySelector('[data-log-level][style*="opacity: 1"]')
          ?.dataset?.logLevel || "all",
      );
    });
  }

  async function loadLogs(filter) {
    const viewer = document.getElementById("log-viewer");
    if (!viewer) return;

    // In PR 1, logs come from a simple API endpoint.
    // In future PRs, this will be a proper log streaming endpoint.
    try {
      const res = await fetch("/api/health");
      const health = await res.json();

      const entries = [
        { level: "info", message: "BeaconOS v" + (health.version || "1.0.0") + " started", time: new Date().toISOString() },
        { level: "info", message: "API server listening", time: new Date().toISOString() },
        { level: "success", message: "Dashboard loaded", time: new Date().toISOString() },
      ];

      const filtered =
        filter === "all"
          ? entries
          : entries.filter((e) => e.level === filter);

      if (filtered.length === 0) {
        viewer.innerHTML =
          '<div style="color:var(--text-muted);">No log entries for this level.</div>';
        return;
      }

      viewer.innerHTML = filtered
        .map(
          (e) =>
            `<div class="log-line level-${e.level}">${e.time} [${e.level.toUpperCase()}] ${escapeHtml(e.message)}</div>`,
        )
        .join("\n");
    } catch {
      viewer.innerHTML =
        '<div class="log-line level-error">Failed to load logs. Is the server running?</div>';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    Router.register("/logs", "logs", (el) => {
      render(el);
    });
  }

  return { init };
})();
