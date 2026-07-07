/**
 * Servers page — server list with lifecycle controls.
 */

const Servers = (() => {
  function render(el) {
    el.innerHTML = `
      <h2 class="page-title">Servers</h2>
      <p class="page-subtitle">Manage your Minecraft server instances</p>

      <div id="servers-list">
        <div style="text-align:center;padding:3rem;color:var(--text-muted);">Loading servers...</div>
      </div>
    `;

    loadServers(el);
  }

  async function loadServers(el) {
    const container = document.getElementById("servers-list");
    if (!container) return;

    const result = await API.getServers();
    if (result.error) {
      container.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--danger);">Failed to load servers.</div>';
      return;
    }

    const servers = result.data || [];

    if (servers.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:3rem;">
          <p style="color:var(--text-muted);margin-bottom:1rem;">No servers yet.</p>
          <p style="font-size:0.875rem;color:var(--text-secondary);">
            Create one using <code>beaconos create &lt;name&gt;</code> in your terminal,
            then restart the dashboard.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = servers
      .map(
        (s) => `
      <div class="card" style="margin-bottom:0.75rem;" data-server="${escapeHtml(s.name)}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
          <div>
            <strong style="font-size:1.1rem;">${escapeHtml(s.name)}</strong>
            <div style="display:flex;gap:1rem;margin-top:0.25rem;font-size:0.8125rem;color:var(--text-secondary);">
              <span class="server-status">
                <span class="server-status-dot ${s.state === 'running' ? 'running' : 'stopped'}"></span>
                ${s.state || 'stopped'}
              </span>
              <span>PID: ${s.pid || '—'}</span>
              <span>Port: ${s.port || '—'}</span>
              ${s.uptime ? '<span>Uptime: ' + formatUptime(s.uptime) + '</span>' : ''}
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary btn-server-start" data-server="${escapeHtml(s.name)}" ${s.state === 'running' ? 'disabled' : ''}>Start</button>
            <button class="btn btn-sm btn-secondary btn-server-stop" data-server="${escapeHtml(s.name)}" ${s.state !== 'running' ? 'disabled' : ''}>Stop</button>
            <button class="btn btn-sm btn-secondary btn-server-restart" data-server="${escapeHtml(s.name)}" ${s.state !== 'running' ? 'disabled' : ''}>Restart</button>
            <button class="btn btn-sm btn-danger btn-server-kill" data-server="${escapeHtml(s.name)}" ${s.state !== 'running' ? 'disabled' : ''}>Kill</button>
          </div>
        </div>
        <div class="server-log-preview" id="logs-${escapeHtml(s.name)}" style="margin-top:0.75rem;font-family:monospace;font-size:0.75rem;color:var(--text-muted);max-height:6rem;overflow-y:auto;display:none;"></div>
      </div>`,
      )
      .join("");

    // Attach event listeners
    container.querySelectorAll(".btn-server-start").forEach((btn) => {
      btn.addEventListener("click", () =>
        serverAction(btn.dataset.server, "start"),
      );
    });
    container.querySelectorAll(".btn-server-stop").forEach((btn) => {
      btn.addEventListener("click", () =>
        serverAction(btn.dataset.server, "stop"),
      );
    });
    container.querySelectorAll(".btn-server-restart").forEach((btn) => {
      btn.addEventListener("click", () =>
        serverAction(btn.dataset.server, "restart"),
      );
    });
    container.querySelectorAll(".btn-server-kill").forEach((btn) => {
      btn.addEventListener("click", () =>
        serverAction(btn.dataset.server, "kill"),
      );
    });
  }

  async function serverAction(name, action) {
    const endpoints = {
      start: `/api/servers/${encodeURIComponent(name)}/start`,
      stop: `/api/servers/${encodeURIComponent(name)}/stop`,
      restart: `/api/servers/${encodeURIComponent(name)}/restart`,
      kill: `/api/servers/${encodeURIComponent(name)}/kill`,
    };

    const url = endpoints[action];
    if (!url) return;

    // Disable buttons during operation
    const card = document.querySelector(`[data-server="${escapeHtml(name)}"]`);
    if (card) {
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
    }

    try {
      const fetch = window.fetch.bind(window);
      const token = API.getAccessToken();
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();

      if (data.error) {
        showToast(`${action} "${name}": ${data.message}`, "error");
      } else {
        showToast(`${name}: ${action} successful`, "success");
      }
    } catch (err) {
      showToast(`Request failed: ${err.message}`, "error");
    }

    // Refresh the server list
    const el = document.getElementById("page-servers");
    if (el) loadServers(el);
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function showToast(message, type) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    Router.register("/servers", "servers", (el) => {
      render(el);
    });
  }

  return { init };
})();
