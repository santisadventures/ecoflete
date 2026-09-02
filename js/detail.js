document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.querySelector("[data-detail]");
  const id = new URLSearchParams(location.search).get("id");
  if (!mount) return;

  mount.innerHTML = EcoFleteUi.skeletonCards(1);

  try {
    const data = await EcoFleteApi.getListings();
    const listing = [...(data.offeredTrips || []), ...(data.freightRequests || [])].find((item) => item.id === id);
    if (!listing) {
      mount.innerHTML = `<div class="empty-state"><h1>Publicación no encontrada</h1><p>Puede haber finalizado o estar pausada.</p><a class="button button--primary" href="index.html">Volver al inicio</a></div>`;
      return;
    }

    const isRequest = listing.type === "request";
    const priceMarkup = listing.priceEstimate ? `
            <div class="detail-price">
              <span>Precio estimado</span>
              <strong>${EcoFleteUi.formatPrice(listing.priceEstimate, listing.currency)}</strong>
              <small>${EcoFleteUi.escapeHtml(listing.priceNote || "Estimado por el transportista")}</small>
            </div>` : "";
    document.title = `${listing.title} - EcoFlete`;
    EcoFleteApi.track("listing_opened", { id: listing.id, type: listing.type });
    mount.innerHTML = `
      <section class="detail-shell">
        <article class="detail-main">
          <img src="${EcoFleteUi.escapeHtml(listing.image || "assets/images/ecoflete-hero.png")}" alt="${EcoFleteUi.escapeHtml(listing.imageAlt || listing.title)}">
          <div class="detail-main__content">
            <span class="listing-card__badge">${isRequest ? "Pedido de viaje" : "Viaje disponible"}</span>
            <p class="detail-route">${EcoFleteUi.escapeHtml(listing.origin.city)} -> ${EcoFleteUi.escapeHtml(listing.destination.city)}</p>
            <h1>${EcoFleteUi.escapeHtml(listing.title)}</h1>
            <p>${EcoFleteUi.escapeHtml(listing.description)}</p>
            ${priceMarkup}
            <ul class="detail-list">
              <li><strong>ID:</strong> ${EcoFleteUi.escapeHtml(listing.id)}</li>
              <li><strong>Fecha:</strong> ${EcoFleteUi.formatDate(listing.date, listing.dateEnd)} (${EcoFleteUi.escapeHtml(listing.dateFlexibility || "sin flexibilidad informada")})</li>
              <li><strong>Categoría:</strong> ${EcoFleteUi.escapeHtml(listing.category)}</li>
              <li><strong>Vehículo:</strong> ${EcoFleteUi.escapeHtml(listing.vehicle || "A coordinar")}</li>
              <li><strong>${isRequest ? "Carga" : "Capacidad disponible"}:</strong> ${EcoFleteUi.escapeHtml(listing.cargo || listing.capacity || "A coordinar")}</li>
            </ul>
          </div>
        </article>
        <aside class="detail-side">
          <h2>${isRequest ? "Quiero hacer este viaje" : "Solicitar contacto"}</h2>
          <p>${isRequest ? "EcoFlete coordina el contacto con la persona que publicó la solicitud." : "Los datos personales del transportista no son públicos. EcoFlete coordina el contacto entre las partes."}</p>
          <a class="button button--primary" data-form-link="interest" data-listing-id="${EcoFleteUi.escapeHtml(listing.id)}" href="#">${isRequest ? "Quiero hacer este viaje" : "Solicitar contacto"}</a>
        </aside>
      </section>`;
    EcoFleteUi.initFormLinks?.();
  } catch (error) {
    mount.innerHTML = `<div class="error-state"><h1>No pudimos actualizar los fletes en este momento.</h1><p>El detalle no está disponible temporalmente.</p><button class="button button--primary" type="button" onclick="location.reload()">Volver a intentar</button></div>`;
  }
});
