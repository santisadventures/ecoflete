const EcoFleteApi = (() => {
  async function getListings() {
    const config = window.ECOFLETE_CONFIG;
    if (config.DEMO_MODE || !config.API_URL) {
      const response = await fetch("data/demo-listings.json");
      if (!response.ok) throw new Error("No se pudieron cargar los datos demo.");
      return response.json();
    }

    const response = await fetch(config.API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo actualizar EcoFlete.");
    return response.json();
  }

  function track(eventName, payload = {}) {
    const config = window.ECOFLETE_CONFIG;
    if (!config.ANALYTICS_ENABLED) return;
    window.dispatchEvent(new CustomEvent("ecoflete:analytics", { detail: { eventName, payload } }));
  }

  return { getListings, track };
})();
