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

    hydrateSelect(
      form.querySelector("[data-category-filter]"),
      ["", ...unique(listings.map((item) => item.category))],
      "Todas"
    );

    hydrateSelect(
      form.querySelector("[data-vehicle-filter]"),
      ["", ...unique(listings.map((item) => item.vehicle))],
      "Todos"
    );

    // Estado de filtros YA APLICADOS.
    // Lo que el usuario escribe en el formulario no modifica esto
    // hasta que presiona Buscar.
    let appliedFilters = getDefaultFilters(form);

    const render = () => {
      const filtered = EcoFleteSearch.sortListings(
        EcoFleteSearch.filterListings(
          listings,
          appliedFilters,
          localities
        ),
        appliedFilters.sort
      );

      mount.innerHTML = filtered
        .map(EcoFleteUi.listingCard)
        .join("");

      empty.hidden = filtered.length !== 0;

      count.textContent =
        `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`;
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      appliedFilters = Object.fromEntries(
        new FormData(form).entries()
      );

      EcoFleteApi.track("search_performed", {
        marketplaceKey,
        filters: appliedFilters
      });

      render();
    });

    form.addEventListener("reset", () => {
      setTimeout(() => {
        appliedFilters = getDefaultFilters(form);
        render();
      }, 0);
    });

    render();

  } catch (error) {
    console.error("EcoFlete marketplace error:", error);

    mount.innerHTML = `
      <div class="error-state">
        <h2>No pudimos actualizar los fletes en este momento.</h2>
        <p>Revisá la conexión o intentá nuevamente.</p>
        <button
          class="button button--primary"
          type="button"
          onclick="location.reload()"
        >
          Volver a intentar
        </button>
      </div>
    `;
  }
});

function getDefaultFilters(form) {
  const defaults = {};

  for (const element of form.elements) {
    if (!element.name) continue;

    if (element.tagName === "SELECT") {
      const selected =
        [...element.options].find((option) => option.defaultSelected);

      defaults[element.name] =
        selected ? selected.value : element.options[0]?.value || "";
    } else {
      defaults[element.name] =
        element.defaultValue || "";
    }
  }

  return defaults;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));
}

function hydrateSelect(select, values, emptyLabel) {
  if (!select) return;

  select.innerHTML = values
    .map(
      (value, index) =>
        `<option value="${value}">${
          index === 0 ? emptyLabel : value
        }</option>`
    )
    .join("");
}
