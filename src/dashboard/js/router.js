/**
 * Hash-based SPA router.
 *
 * Routes: #/ → dashboard, #/logs → logs, #/settings → settings
 */

const Router = (() => {
  const routes = {};
  let currentPage = null;

  function register(path, pageId, renderFn) {
    routes[path] = { pageId, renderFn };
  }

  function navigate(hash) {
    const path = hash.replace(/^#/, "") || "/";
    const route = routes[path];

    if (!route) {
      navigate("#/");
      return;
    }

    // Hide all pages
    document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));

    // Show target page
    const pageEl = document.getElementById("page-" + route.pageId);
    if (pageEl) {
      pageEl.classList.remove("hidden");
    }

    // Update sidebar active state
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === route.pageId);
    });

    // Call render function
    if (route.renderFn) {
      route.renderFn(pageEl);
    }

    currentPage = route.pageId;
  }

  function init() {
    window.addEventListener("hashchange", () => navigate(window.location.hash));

    // Click handler for nav links
    document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");
        if (href) navigate(href);
      });
    });
  }

  return {
    register,
    navigate,
    init,
  };
})();
