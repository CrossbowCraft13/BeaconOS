/**
 * BeaconOS Dashboard — Application Bootstrap.
 *
 * Initializes all modules in dependency order and starts the router.
 * This is loaded last so all other modules exist before we call init().
 */

(function () {
  try {
    Router.init();
    Dashboard.init();
    Servers.init();
    Files.init();
    Logs.init();
    Settings.init();
    Auth.init();

    // Navigate to current hash or default to dashboard
    const hash = window.location.hash || "#/";
    Router.navigate(hash);
  } catch (err) {
    console.error("BeaconOS initialization error:", err);
    document.body.innerHTML =
      '<div style="padding:2rem;text-align:center;color:#ef4444;">' +
      "<h2>Failed to initialize BeaconOS Dashboard</h2>" +
      "<p>" + escapeHtml(err.message) + "</p>" +
      "<p style='color:var(--text-muted);font-size:0.875rem;'>Check the console for details.</p>" +
      "</div>";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
