/**
 * Files page — server file manager with browse, read, write, delete.
 */

const Files = (() => {
  let currentServer = "";
  let currentPath = "";

  // ── Render ──────────────────────────────────────────────────────

  function render(el) {
    el.innerHTML = `
      <h2 class="page-title">File Manager</h2>
      <p class="page-subtitle">Browse and edit server files</p>

      <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
        <label for="files-server-select" style="color:var(--text-secondary);font-size:0.875rem;">Server</label>
        <select id="files-server-select" style="width:auto;min-width:12rem;">
          <option value="">-- Select a server --</option>
        </select>
        <button class="btn btn-sm btn-secondary" id="files-refresh">Refresh</button>
        <button class="btn btn-sm btn-primary" id="files-upload-btn">Upload</button>
      </div>

      <div id="files-breadcrumb" style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.75rem;word-break:break-all;"></div>

      <div id="files-content">
        <div style="text-align:center;padding:3rem;color:var(--text-muted);">
          Select a server to browse its files.
        </div>
      </div>

      <!-- Upload modal -->
      <div id="upload-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div class="card" style="width:90%;max-width:32rem;">
          <div class="card-title">Upload File</div>
          <div style="margin-top:0.75rem;">
            <label style="color:var(--text-secondary);font-size:0.875rem;">File name</label>
            <input type="text" id="upload-filename" placeholder="e.g. plugins/MyPlugin.jar" style="margin-top:0.375rem;" />
          </div>
          <div style="margin-top:0.75rem;">
            <label style="color:var(--text-secondary);font-size:0.875rem;">Content (text)</label>
            <textarea id="upload-content" rows="8" style="margin-top:0.375rem;font-family:monospace;font-size:0.8125rem;"></textarea>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
            <button class="btn btn-sm btn-secondary" id="upload-cancel">Cancel</button>
            <button class="btn btn-sm btn-primary" id="upload-submit">Upload</button>
          </div>
        </div>
      </div>
    `;

    loadServerList();
    attachEvents();
  }

  // ── Events ──────────────────────────────────────────────────────

  function attachEvents() {
    const select = document.getElementById("files-server-select");
    if (select) {
      select.addEventListener("change", () => {
        currentServer = select.value;
        currentPath = "";
        if (currentServer) {
          browsePath("");
        } else {
          document.getElementById("files-content").innerHTML =
            '<div style="text-align:center;padding:3rem;color:var(--text-muted);">Select a server to browse its files.</div>';
          document.getElementById("files-breadcrumb").textContent = "";
        }
      });
    }

    document.getElementById("files-refresh")?.addEventListener("click", () => {
      if (currentServer) browsePath(currentPath);
    });

    document.getElementById("files-upload-btn")?.addEventListener("click", () => {
      document.getElementById("upload-modal").classList.remove("hidden");
      document.getElementById("upload-filename").value = currentPath
        ? currentPath + "/"
        : "";
    });

    document.getElementById("upload-cancel")?.addEventListener("click", () => {
      document.getElementById("upload-modal").classList.add("hidden");
    });

    document.getElementById("upload-submit")?.addEventListener("click", uploadFile);
  }

  // ── Load server list ────────────────────────────────────────────

  async function loadServerList() {
    const select = document.getElementById("files-server-select");
    if (!select) return;

    const result = await API.getServers();
    const servers = result.data || [];

    // Keep current selection if still valid
    const currentVal = select.value;

    select.innerHTML =
      '<option value="">-- Select a server --</option>' +
      servers
        .map(
          (s) =>
            `<option value="${escapeHtml(s.name)}" ${s.name === currentVal ? "selected" : ""}>${escapeHtml(s.name)}</option>`,
        )
        .join("");

    if (currentVal && servers.some((s) => s.name === currentVal)) {
      select.value = currentVal;
    }
  }

  // ── Browse ───────────────────────────────────────────────────────

  async function browsePath(relPath) {
    currentPath = relPath;
    const content = document.getElementById("files-content");
    const breadcrumb = document.getElementById("files-breadcrumb");
    if (!content) return;

    content.innerHTML =
      '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Loading...</div>';

    // Render breadcrumb
    if (breadcrumb) {
      const parts = relPath ? relPath.split("/").filter(Boolean) : [];
      let html = '<a href="#" data-path="" style="color:var(--accent-secondary);">root</a>';
      let accumulated = "";
      for (const part of parts) {
        accumulated = accumulated ? accumulated + "/" + part : part;
        html +=
          ' / <a href="#" data-path="' +
          escapeHtml(accumulated) +
          '" style="color:var(--accent-secondary);">' +
          escapeHtml(part) +
          "</a>";
      }
      breadcrumb.innerHTML = html;

      // Breadcrumb click handler
      breadcrumb.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          browsePath(a.dataset.path || "");
        });
      });
    }

    const result = await listFiles(currentServer, relPath);
    if (result.error) {
      content.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--danger);">' +
        escapeHtml(result.message) +
        "</div>";
      return;
    }

    if (result.file) {
      // Single file view
      renderFileView(content, result.file);
    } else if (result.files) {
      // Directory listing
      renderDirView(content, result.files, relPath);
    }
  }

  // ── Directory listing ────────────────────────────────────────────

  function renderDirView(container, files, relPath) {
    if (files.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Empty directory.</div>';
      return;
    }

    let html =
      '<div class="card" style="padding:0;overflow:hidden;"><table class="server-table"><thead><tr><th>Name</th><th>Size</th><th>Modified</th><th></th></tr></thead><tbody>';

    // Parent directory link (if not root)
    if (relPath) {
      const parent = relPath.includes("/")
        ? relPath.slice(0, relPath.lastIndexOf("/"))
        : "";
      html +=
        '<tr style="cursor:pointer;" class="dir-entry" data-path="' +
        escapeHtml(parent) +
        '"><td><strong>..</strong></td><td>—</td><td>—</td><td></td></tr>';
    }

    for (const f of files) {
      const icon = f.type === "directory" ? "📁" : "📄";
      const size =
        f.type === "directory"
          ? "—"
          : formatSize(f.size);
      const modified = f.modified
        ? f.modified.slice(0, 10) + " " + f.modified.slice(11, 19)
        : "—";

      if (f.type === "directory") {
        html +=
          '<tr style="cursor:pointer;" class="dir-entry" data-path="' +
          escapeHtml(relPath ? relPath + "/" + f.name : f.name) +
          '"><td>' +
          icon +
          " <strong>" +
          escapeHtml(f.name) +
          "</strong></td><td>" +
          size +
          "</td><td>" +
          modified +
          '</td><td></td></tr>';
      } else {
        html +=
          '<tr style="cursor:pointer;" class="file-entry" data-path="' +
          escapeHtml(relPath ? relPath + "/" + f.name : f.name) +
          '"><td>' +
          icon +
          " " +
          escapeHtml(f.name) +
          "</td><td>" +
          size +
          "</td><td>" +
          modified +
          '</td><td><button class="btn btn-sm btn-danger btn-file-delete" data-path="' +
          escapeHtml(relPath ? relPath + "/" + f.name : f.name) +
          '">Delete</button></td></tr>';
      }
    }

    html += "</tbody></table></div>";
    container.innerHTML = html;

    // Directory click handler
    container.querySelectorAll(".dir-entry").forEach((row) => {
      row.addEventListener("click", () => {
        browsePath(row.dataset.path || "");
      });
    });

    // File click handler
    container.querySelectorAll(".file-entry").forEach((row) => {
      row.addEventListener("click", () => {
        browsePath(row.dataset.path || "");
      });
    });

    // Delete button handler
    container.querySelectorAll(".btn-file-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const filePath = btn.dataset.path;
        if (confirm('Delete "' + filePath + '"?')) {
          await deleteFile(currentServer, filePath);
          browsePath(currentPath);
        }
      });
    });
  }

  // ── File view ────────────────────────────────────────────────────

  function renderFileView(container, file) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <strong>${escapeHtml(file.name)}</strong>
            <span style="color:var(--text-muted);font-size:0.8125rem;margin-left:0.75rem;">${formatSize(file.size)}</span>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" id="file-back">Back</button>
            <button class="btn btn-sm btn-primary" id="file-save">Save</button>
          </div>
        </div>
        <textarea id="file-editor" style="width:100%;min-height:50vh;font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:0.8125rem;padding:1rem;background:#0a0014;border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);resize:vertical;">${escapeHtml(file.content || "")}</textarea>
      </div>
    `;

    document.getElementById("file-back")?.addEventListener("click", () => {
      const parent = currentPath.includes("/")
        ? currentPath.slice(0, currentPath.lastIndexOf("/"))
        : "";
      browsePath(parent);
    });

    document.getElementById("file-save")?.addEventListener("click", async () => {
      const content = document.getElementById("file-editor").value;
      const btn = document.getElementById("file-save");
      btn.disabled = true;
      btn.textContent = "Saving...";

      const result = await writeFileContent(currentServer, currentPath, content);
      if (result.error) {
        alert("Error saving: " + result.message);
      } else {
        showToast('"' + file.name + '" saved.', "success");
      }

      btn.disabled = false;
      btn.textContent = "Save";
    });
  }

  // ── API calls ────────────────────────────────────────────────────

  async function listFiles(server, relPath) {
    try {
      const token = API.getAccessToken();
      const url =
        "/api/files?server=" +
        encodeURIComponent(server) +
        "&path=" +
        encodeURIComponent(relPath || "");
      const res = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });
      const json = await res.json();

      if (json.error) return { error: true, message: json.message };

      // If it's a file, return content
      if (json.data.content !== undefined) {
        return { file: json.data };
      }

      return { files: json.data.files || [] };
    } catch (err) {
      return { error: true, message: err.message };
    }
  }

  async function writeFileContent(server, relPath, content) {
    try {
      const token = API.getAccessToken();
      const url =
        "/api/files/write?server=" +
        encodeURIComponent(server) +
        "&path=" +
        encodeURIComponent(relPath);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      return await res.json();
    } catch (err) {
      return { error: true, message: err.message };
    }
  }

  async function deleteFile(server, relPath) {
    try {
      const token = API.getAccessToken();
      const url =
        "/api/files?server=" +
        encodeURIComponent(server) +
        "&path=" +
        encodeURIComponent(relPath);
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      return await res.json();
    } catch (err) {
      return { error: true, message: err.message };
    }
  }

  async function uploadFile() {
    const filename = document.getElementById("upload-filename").value.trim();
    const content = document.getElementById("upload-content").value;

    if (!filename) {
      showToast("Please enter a file name.", "error");
      return;
    }

    const fullPath = currentPath ? currentPath + "/" + filename : filename;

    const token = API.getAccessToken();
    const url =
      "/api/files/upload?server=" +
      encodeURIComponent(currentServer) +
      "&path=" +
      encodeURIComponent(fullPath);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();

      if (json.error) {
        showToast("Upload failed: " + json.message, "error");
      } else {
        showToast("File uploaded.", "success");
        document.getElementById("upload-modal").classList.add("hidden");
        document.getElementById("upload-filename").value = "";
        document.getElementById("upload-content").value = "";
        browsePath(currentPath);
      }
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  function formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
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

  // ── Init ────────────────────────────────────────────────────────

  function init() {
    Router.register("/files", "files", (el) => {
      render(el);
    });
  }

  return { init };
})();
