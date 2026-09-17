/* Home dashboard layering — replaces the old flat-reorder version.
   Moves each injected section into its correct layer container
   (Layer 1 = always visible, Layer 2/3 = collapsible <details>)
   instead of just reordering siblings in place. */
(function () {
  function isHome() {
    return (location.pathname.replace(/\/+$/, "") || "/") === "/";
  }

  // sectionId -> which layer body it belongs in
  const layerMap = {
    todayOperationsSection: "layer1",
    adminTodayOps: "layer1",
    adminWorkflowSummary: "layer2",
    adminSystemHealth: "layer2",
    freeSmartInsights: "layer3",
    smartOperationsFree: "layer3",
    operationalSummaries: "layer3",
    executiveDashboardSection: "layer3",
  };

  function getLayerContainer(home, key) {
    if (key === "layer1") return home.querySelector("#dashboardLayer1");
    if (key === "layer2") return home.querySelector("#dashboardLayer2 .dashboard-layer-body");
    if (key === "layer3") return home.querySelector("#dashboardLayer3 .dashboard-layer-body");
    return null;
  }

  function arrange() {
    if (!isHome()) return;
    const home = document.querySelector(".dashboard-home");
    if (!home) return;

    let moved = false;
    for (const [id, layerKey] of Object.entries(layerMap)) {
      const el = document.getElementById(id);
      const target = getLayerContainer(home, layerKey);
      if (!el || !target) continue;
      if (el.parentElement !== target) {
        target.appendChild(el);
        moved = true;
      }
    }
    if (moved) home.dataset.layeredOrdered = "1";
  }

  function init() {
    const home = document.querySelector(".dashboard-home");
    if (!home) return;
    arrange();

    let timer = null;
    let stopped = false;
    const observer = new MutationObserver(() => {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(arrange, 80);
    });
    observer.observe(home, { childList: true, subtree: true });

    setTimeout(() => {
      stopped = true;
      observer.disconnect();
      clearTimeout(timer);
      arrange();
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 120), { once: true });
  } else {
    setTimeout(init, 120);
  }
})();
