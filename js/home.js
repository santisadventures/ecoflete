document.addEventListener("DOMContentLoaded", async () => {
  const mount = document.querySelector("[data-featured-listings]");
  if (!mount) return;
  mount.innerHTML = EcoFleteUi.skeletonCards(3);

  try {
    const data = await EcoFleteApi.getListings();
    const listings = [...(data.offeredTrips || []), ...(data.freightRequests || [])]
      .filter((item) => item.featured)
      .slice(0, 3);
    mount.innerHTML = listings.map(EcoFleteUi.listingCard).join("");
  } catch (error) {
    mount.innerHTML = `<div class="error-state"><h2>No pudimos actualizar los fletes en este momento.</h2><p>El sitio sigue disponible. Podes volver a intentar en unos minutos.</p><button class="button button--primary" type="button" onclick="location.reload()">Volver a intentar</button></div>`;
  }
});
