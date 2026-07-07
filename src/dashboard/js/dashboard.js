/**
 * Dashboard page — overview with stats and server list.
 */

const Dashboard = (() => {
  let refreshInterval = null;

  // ── Render ──────────────────────────────────────────────────────

  function render(el) {
    el.innerHTML = `
      <h2 class="page-title">Dashboard</h2>
      <p class="page-subtitle">System overview and server status</p>

      <div class="stat-grid" id="stat-grid">
        <div class="card">
          <div class="card-title">CPU</div>
          <div class="card-value" id="stat-cpu">--</div>
          <div class="stat-unit">% used</div>
          <div class="stat-bar"><div class="stat-bar-fill good" id="stat-cpu-bar" style="width:0%"></div></div>
        </div>
        <div class="card">
          <div class="card-title">Memory</div>
          <div class="card-value" id="stat-ram">--</div>
          <div class="stat-unit">GB used / total</div>
          <div class="stat-bar"><div class="stat-bar-fill good" id="stat-ram-bar" style="width:0%"></div></div>
        </div>
        <div class="card">
          <div class="card-title">Disk</div>
          <div class="card-value" id="stat-disk">--</div>
          <div class="stat-unit">GB used / total</div>
          <div class="stat-bar"><div class="stat-bar-fill good" id="stat-disk-bar" style="width:0%"></div></div>
        </div>
        <div class="card">
          <div class="card-title">Servers</div>
          <div class="card-value" id="stat-servers">--</div>
          <div class="stat-unit">running / total</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">BeaconOS Servers</div>
        <table class="server-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Players</th>
              <th>Port</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody id="server-list-body">
            <tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:2rem;">No servers found. Create one with <code>beaconos create &lt;name&gt;</code></td></tr>
          </tbody>
        </table>
      </div>
    `;

    refreshStats();
    refreshServers();
  }

  // ── Stats polling ───────────────────────────────────────────────

  async function refreshStats() {
    const result = await API.getStats();
    if (result.error) return;

    const stats = result.data || result;

    // CPU
    const cpuEl = document.getElementById("stat-cpu");
    const cpuBar = document.getElementById("stat-cpu-bar");
    if (cpuEl && stats.cpu !== undefined) {
      const cpu = Math.round(stats.cpu * 10) / 10;
      cpuEl.textContent = cpu;
      cpuBar.style.width = Math.min(cpu, 100) + "%";
      cpuBar.className = "stat-bar-fill " + barClass(cpu);
    }

    // Memory
    const ramEl = document.getElementById("stat-ram");
    const ramBar = document.getElementById("stat-ram-bar");
    if (ramEl && stats.memory) {
      const used = (stats.memory.used / (1024 ** 3)).toFixed(1);
      const total = (stats.memory.total / (1024 ** 3)).toFixed(1);
      const pct = stats.memory.total > 0
        ? (stats.memory.used / stats.memory.total * 100)
        : 0;
      ramEl.textContent = used + " / " + total;
      ramBar.style.width = Math.min(pct, 100) + "%";
      ramBar.className = "stat-bar-fill " + barClass(pct);
    }

    // Disk
    const diskEl = document.getElementById("stat-disk");
    const diskBar = document.getElementById("stat-disk-bar");
    if (diskEl && stats.disk) {
      const used = (stats.disk.used / (1024 ** 3)).toFixed(1);
      const total = (stats.disk.total / (1024 ** 3)).toFixed(1);
      const pct = stats.disk.total > 0
        ? (stats.disk.used / stats.disk.total * 100)
        : 0;
      diskEl.textContent = used + " / " + total;
      diskBar.style.width = Math.min(pct, 100) + "%";
      diskBar.className = "stat-bar-fill " + barClass(pct);
    }

    // Servers count
    const srvEl = document.getElementById("stat-servers");
    if (srvEl && stats.servers) {
      srvEl.textContent = stats.servers.running + " / " + stats.servers.total;
    }
  }

  async function refreshServers() {
    const result = await API.getServers();
    if (result.error) return;

    const servers = result.data || result.servers || [];
    const tbody = document.getElementById("server-list-body");
    if (!tbody) return;

    if (!servers.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:2rem;">No servers found. Create one with <code>beaconos create &lt;name&gt;</code></td></tr>';
      return;
    }

    tbody.innerHTML = servers
      .map(
        (s) => `
      <tr>
        <td><strong>${escapeHtml(s.name || s)}</strong></td>
        <td>
          <span class="server-status">
            <span class="server-status-dot ${s.status || "stopped"}"></span>
            ${s.status || "stopped"}
          </span>
        </td>
        <td>${s.players != null ? s.players : "--"}</td>
        <td>${s.port || "--"}</td>
        <td>${s.version || "--"}</td>
      </tr>`,
      )
      .join("");
  }

  // ── Helpers ─────────────────────────────────────────────────────

  function barClass(pct) {
    if (pct < 60) return "good";
    if (pct < 85) return "warn";
    return "bad";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ────────────────────────────────────────────────────────

  function init() {
    Router.register("/", "dashboard", (el) => {
      render(el);
    });
  }

  return { init };
})();
