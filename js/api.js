const EcoFleteApi = (() => {
  async function getListings() {
    const config = window.ECOFLETE_CONFIG;
    if (config.DEMO_MODE || !config.API_URL) {
      const response = await fetch("data/demo-listings.json");
      if (!response.ok) throw new Error("No se pudieron cargar los datos demo.");
      return filterVisibleListings(await response.json());
    }

    const response = await fetch(config.API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo actualizar EcoFlete.");
    return filterVisibleListings(await response.json());
  }

  function filterVisibleListings(data) {
    return {
      ...data,
      offeredTrips: (data.offeredTrips || []).filter(isCurrentListing),
      freightRequests: (data.freightRequests || []).filter(isCurrentListing)
    };
  }

  function isCurrentListing(listing) {
    if (!listing.dateEnd) return true;
    const dateEnd = new Date(`${listing.dateEnd}T23:59:59`);
    if (Number.isNaN(dateEnd.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateEnd >= today;
  }

  function track(eventName, payload = {}) {
    const config = window.ECOFLETE_CONFIG;
    if (!config.ANALYTICS_ENABLED) return;
    window.dispatchEvent(new CustomEvent("ecoflete:analytics", { detail: { eventName, payload } }));
  }

  return { getListings, track };
})();
