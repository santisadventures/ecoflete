const EcoFleteApi = (() => {
  async function getListings() {
    const config = window.ECOFLETE_CONFIG;

    if (config.DEMO_MODE || !config.API_URL) {
      const response = await fetch("data/demo-listings.json");
      if (!response.ok) throw new Error("No se pudieron cargar los datos demo.");
      return filterVisibleListings(await response.json());
    }

    const response = await fetch(config.API_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("No se pudo actualizar EcoFlete.");
    }

    const apiData = await response.json();

    if (!apiData.ok) {
      throw new Error(apiData.error || "La API de EcoFlete devolvió un error.");
    }

    return filterVisibleListings(normalizeApiData(apiData));
  }

  function googleDriveImageUrl(url) {
    if (!url) return "";

    try {
      const parsed = new URL(url);

      if (
        parsed.hostname === "drive.google.com" ||
        parsed.hostname === "www.drive.google.com"
      ) {
        let id = parsed.searchParams.get("id");

        if (!id) {
          const match = parsed.pathname.match(/\/d\/([^/]+)/);
          id = match ? match[1] : "";
        }

        if (id) {
          return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
        }
      }
    } catch (error) {
      console.warn("EcoFlete: URL de imagen inválida", url);
    }

    return url;
  }

  function normalizeApiData(data) {
    return {
      updatedAt: data.updatedAt,

      offeredTrips: (data.fletesOfrecidos || []).map(listing => ({
        id: listing.id,
        type: "offered",

        origin: {
          city: listing.origen || "",
          province: listing.provinciaOrigen || ""
        },

        destination: {
          city: listing.destino || "",
          province: listing.provinciaDestino || ""
        },

        date: listing.fechaDesde || "",
        dateEnd: listing.fechaHasta || null,
        dateFlexibility: "",

        category: listing.categoriaCarga || "",
        vehicle: listing.tipoVehiculo || "",
        capacity: listing.capacidad || "",

        title: listing.titulo || "",
        description: listing.descripcion || "",

        image: googleDriveImageUrl(listing.fotoVehiculoUrl),
        imageAlt: "Transporte publicado en EcoFlete",

        priceEstimate: listing.precioEstimado || null,
        currency: listing.moneda || "ARS",
        priceNote: "Estimado por el transportista",

        featured: false
      })),

      freightRequests: (data.fletesBuscados || []).map(listing => ({
        id: listing.id,
        type: "request",

        origin: {
          city: listing.origen || "",
          province: listing.provinciaOrigen || ""
        },

        destination: {
          city: listing.destino || "",
          province: listing.provinciaDestino || ""
        },

        date: listing.fechaDesde || "",
        dateEnd: listing.fechaHasta || null,
        dateFlexibility: "",

        category: listing.categoriaCarga || "",
        vehicle: listing.tipoVehiculo || "",
        cargo: listing.detalleCarga || listing.capacidad || "",

        title: listing.titulo || "",
        description: listing.descripcion || "",

        image: googleDriveImageUrl(listing.fotoCargaUrl),
        imageAlt: "Carga publicada en EcoFlete",

        priceEstimate: listing.precioEstimado || null,
        currency: listing.moneda || "ARS",

        featured: false
      }))
    };
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

    if (Number.isNaN(dateEnd.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dateEnd >= today;
  }

  function track(eventName, payload = {}) {
    const config = window.ECOFLETE_CONFIG;

    if (!config.ANALYTICS_ENABLED) return;

    window.dispatchEvent(
      new CustomEvent("ecoflete:analytics", {
        detail: { eventName, payload }
      })
    );
  }

  return { getListings, track };
})();
