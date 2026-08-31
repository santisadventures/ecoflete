document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.querySelector("[data-featured-listings]");
  const tabs = document.querySelectorAll("[data-featured-tab]");
  const featuredLink = document.querySelector("[data-featured-link]");
  if (!mount) return;
  mount.innerHTML = EcoFleteUi.skeletonCards(3);

  try {
    const data = await EcoFleteApi.getListings();
    const renderAudience = (audience) => {
      const key = audience === "carriers" ? "freightRequests" : "offeredTrips";
      const listings = (data[key] || [])
        .filter((item) => item.featured || audience === "carriers")
        .slice(0, 3);
      mount.dataset.featuredAudience = audience;
      mount.innerHTML = listings.map(EcoFleteUi.listingCard).join("");
      if (featuredLink) {
        featuredLink.href = audience === "carriers" ? "cargas.html" : "viajes.html";
        featuredLink.textContent = audience === "carriers" ? "Ver pedidos de viaje" : "Ver viajes disponibles";
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        renderAudience(tab.dataset.featuredTab);
      });
    });

    renderAudience("producers");
  } catch (error) {
    mount.innerHTML = `<div class="error-state"><h2>No pudimos actualizar los fletes en este momento.</h2><p>El sitio sigue disponible. Podés volver a intentar en unos minutos.</p><button class="button button--primary" type="button" onclick="location.reload()">Volver a intentar</button></div>`;
  }
});
