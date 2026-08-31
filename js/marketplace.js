document.addEventListener("DOMContentLoaded", async () => {
  const marketplaceKey = document.body.dataset.marketplace;
  const mount = document.querySelector("[data-listings]");
  const form = document.querySelector("[data-filters]");
  const empty = document.querySelector("[data-empty]");
  const count = document.querySelector("[data-results-count]");
  if (!marketplaceKey || !mount || !form) return;

  mount.innerHTML = EcoFleteUi.skeletonCards(4);

  try {
    const [data, localities] = await Promise.all([
      EcoFleteApi.getListings(),
      EcoFleteDistance.loadLocalities()
    ]);
    const listings = data[marketplaceKey] || [];
    hydrateSelect(form.querySelector("[data-category-filter]"), ["", ...unique(listings.map((item) => item.category))], "Todas");
    hydrateSelect(form.querySelector("[data-vehicle-filter]"), ["", ...unique(listings.map((item) => item.vehicle))], "Todos");

    const render = () => {
      const filters = Object.fromEntries(new FormData(form).entries());
      const filtered = EcoFleteSearch.sortListings(EcoFleteSearch.filterListings(listings, filters, localities), filters.sort);
      mount.innerHTML = filtered.map(EcoFleteUi.listingCard).join("");
      empty.hidden = filtered.length !== 0;
      count.textContent = `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`;
      EcoFleteApi.track("search_performed", { marketplaceKey, filters });
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    form.addEventListener("reset", () => setTimeout(render, 0));
    form.addEventListener("input", render);
    form.addEventListener("change", () => {
      EcoFleteApi.track("filters_changed", { marketplaceKey });
      render();
    });
    render();
  } catch (error) {
    mount.innerHTML = `<div class="error-state"><h2>No pudimos actualizar los fletes en este momento.</h2><p>Revisá la conexión o intentá nuevamente.</p><button class="button button--primary" type="button" onclick="location.reload()">Volver a intentar</button></div>`;
  }
});

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function hydrateSelect(select, values, emptyLabel) {
  if (!select) return;
  select.innerHTML = values.map((value, index) => `<option value="${value}">${index === 0 ? emptyLabel : value}</option>`).join("");
}
